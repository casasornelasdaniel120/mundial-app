import { createClient } from '@/lib/supabase/server'
import type { IDraftSession } from '@/types/db'
import { getPickUser } from './snake'

const TOTAL_PICKS_PER_TEAM = 19
const STARTING_SLOTS = { GK: 1, DEF: 4, MID: 3, FWD: 3 } as const

type Position = keyof typeof STARTING_SLOTS
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type AdvanceDraftResult = {
  advanced: boolean
  completed?: boolean
  currentPickNumber?: number
  currentUserId?: string | null
  error?: string
}

export async function finalizeDraft(
  supabase: SupabaseServerClient,
  sessionId: string,
  leagueId: string
): Promise<{ error?: string }> {
  console.log(`[draft/finalize] start — session=${sessionId} league=${leagueId}`)

  const { data: fantasyTeams, error: teamsError } = await supabase
    .from('fantasy_teams')
    .select('id, user_id')
    .eq('league_id', leagueId)

  if (teamsError) {
    console.log(`[draft/finalize] FAIL — fantasy_teams fetch: ${teamsError.message}`)
    return { error: teamsError.message }
  }
  if (!fantasyTeams?.length) {
    console.log('[draft/finalize] no-op — no fantasy_teams for this league')
    return {}
  }

  const { data: existingRoster, error: existingRosterError } = await supabase
    .from('fantasy_team_players')
    .select('id')
    .in('team_id', fantasyTeams.map(team => team.id as string))
    .limit(1)

  if (existingRosterError) {
    console.log(`[draft/finalize] FAIL — roster check: ${existingRosterError.message}`)
    return { error: existingRosterError.message }
  }
  if (existingRoster?.length) {
    console.log('[draft/finalize] no-op — roster already populated')
    return {}
  }

  const { data: allPicks, error: picksError } = await supabase
    .from('draft_picks')
    .select('user_id, player_id, pick_number')
    .eq('draft_session_id', sessionId)
    .order('pick_number', { ascending: true })

  if (picksError) {
    console.log(`[draft/finalize] FAIL — picks fetch: ${picksError.message}`)
    return { error: picksError.message }
  }
  if (!allPicks?.length) {
    console.log('[draft/finalize] no-op — no picks recorded')
    return {}
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, position')
    .in('id', allPicks.map(pick => pick.player_id as string))

  if (playersError) return { error: playersError.message }

  const positionOf = new Map(players?.map(player => [player.id as string, player.position as Position]) ?? [])
  const teamOf = new Map(fantasyTeams?.map(team => [team.user_id as string, team.id as string]) ?? [])
  const posCount: Record<string, Partial<Record<Position, number>>> = {}
  const rows: Array<{ team_id: string; player_id: string; is_starting: boolean }> = []

  for (const pick of allPicks) {
    const teamId = teamOf.get(pick.user_id as string)
    const position = positionOf.get(pick.player_id as string)
    if (!teamId || !position) continue

    posCount[pick.user_id as string] ??= {}
    const count = (posCount[pick.user_id as string][position] ?? 0) + 1
    posCount[pick.user_id as string][position] = count

    rows.push({
      team_id: teamId,
      player_id: pick.player_id as string,
      is_starting: count <= STARTING_SLOTS[position],
    })
  }

  if (!rows.length) {
    console.log('[draft/finalize] no-op — no valid rows built from picks')
    return {}
  }

  const { error } = await supabase.from('fantasy_team_players').insert(rows)
  if (error) {
    console.log(`[draft/finalize] FAIL — insert of ${rows.length} roster rows rejected: ${error.message}`)
    return { error: error.message }
  }

  console.log(`[draft/finalize] DONE — inserted ${rows.length} roster rows for ${fantasyTeams.length} teams`)
  return {}
}

export async function advanceDraftTurn(
  supabase: SupabaseServerClient,
  draftSessionId: string,
  pickNumber: number
): Promise<AdvanceDraftResult> {
  console.log(`[draft/advance] start — session=${draftSessionId} pick=${pickNumber}`)

  // STEP 1: load the session
  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('id', draftSessionId)
    .single()

  if (sessionError || !session) {
    console.log(`[draft/advance] STEP 1 FAIL — session not found: ${sessionError?.message}`)
    return { advanced: false, error: sessionError?.message ?? 'Sesion no encontrada.' }
  }

  const draftSession = session as IDraftSession
  console.log(
    `[draft/advance] STEP 1 OK — status=${draftSession.status} current_pick_number=${draftSession.current_pick_number} current_user_id=${draftSession.current_user_id}`
  )

  if (draftSession.status !== 'active') {
    console.log('[draft/advance] abort — session is not active')
    return { advanced: false }
  }
  if (draftSession.current_pick_number !== pickNumber) {
    console.log(
      `[draft/advance] abort — stale pickNumber (submitted=${pickNumber}, session=${draftSession.current_pick_number}); another call already advanced`
    )
    return { advanced: false }
  }

  // STEP 2: verify the pick actually exists for this slot
  const { data: pick, error: pickError } = await supabase
    .from('draft_picks')
    .select('id')
    .eq('draft_session_id', draftSessionId)
    .eq('pick_number', pickNumber)
    .maybeSingle()

  if (pickError) {
    console.log(`[draft/advance] STEP 2 FAIL — ${pickError.message}`)
    return { advanced: false, error: pickError.message }
  }
  if (!pick) {
    console.log(`[draft/advance] STEP 2 FAIL — no pick recorded for pick_number=${pickNumber}`)
    return { advanced: false, error: 'No hay pick registrado para avanzar este turno.' }
  }
  console.log(`[draft/advance] STEP 2 OK — pick exists (id=${pick.id})`)

  const snakeOrder = draftSession.snake_order
  const totalPicks = snakeOrder.length * TOTAL_PICKS_PER_TEAM
  const nextPick = pickNumber + 1

  // STEP 3a: draft complete
  if (nextPick > totalPicks) {
    console.log(`[draft/advance] STEP 3 — last pick (${pickNumber}/${totalPicks}), completing draft`)
    const { data: completedSession, error: completeError } = await supabase
      .from('draft_sessions')
      .update({ status: 'completed', pick_deadline: null })
      .eq('id', draftSessionId)
      .eq('status', 'active')
      .eq('current_pick_number', pickNumber)
      .select('id')
      .maybeSingle()

    if (completeError) {
      console.log(`[draft/advance] STEP 3 FAIL — ${completeError.message}`)
      return { advanced: false, error: completeError.message }
    }
    if (!completedSession) {
      console.log('[draft/advance] STEP 3 — conditional update matched 0 rows (already completed by another call)')
      return { advanced: false }
    }

    const finalizeResult = await finalizeDraft(supabase, draftSessionId, draftSession.league_id)
    if (finalizeResult.error) {
      console.log(`[draft/advance] finalize FAIL — ${finalizeResult.error}`)
      return { advanced: false, error: finalizeResult.error }
    }

    console.log('[draft/advance] DONE — draft completed and finalized')
    return { advanced: true, completed: true }
  }

  // STEP 3b: compute next user via snake order and advance
  const nextUser = getPickUser(snakeOrder, nextPick)
  const deadline = new Date(Date.now() + 60_000).toISOString()
  console.log(
    `[draft/advance] STEP 3 — nextPick=${nextPick} nextUser=${nextUser} deadline=${deadline}`
  )

  // Conditional UPDATE: WHERE current_pick_number = submitted pickNumber.
  // If another call advanced first, this matches 0 rows and we no-op.
  const { data: updatedSession, error: updateError } = await supabase
    .from('draft_sessions')
    .update({
      current_pick_number: nextPick,
      current_user_id: nextUser,
      pick_deadline: deadline,
    })
    .eq('id', draftSessionId)
    .eq('status', 'active')
    .eq('current_pick_number', pickNumber)
    .select('current_pick_number, current_user_id')
    .maybeSingle()

  if (updateError) {
    console.log(`[draft/advance] STEP 4 FAIL — UPDATE error: ${updateError.message}`)
    return { advanced: false, error: updateError.message }
  }
  if (!updatedSession) {
    console.log('[draft/advance] STEP 4 — conditional UPDATE matched 0 rows (race lost, already advanced)')
    return { advanced: false }
  }

  console.log(
    `[draft/advance] STEP 4 OK — advanced to pick=${updatedSession.current_pick_number} user=${updatedSession.current_user_id}`
  )
  return {
    advanced: true,
    currentPickNumber: updatedSession.current_pick_number as number,
    currentUserId: updatedSession.current_user_id as string | null,
  }
}
