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

async function finalizeDraft(
  supabase: SupabaseServerClient,
  sessionId: string,
  leagueId: string
): Promise<{ error?: string }> {
  const { data: fantasyTeams, error: teamsError } = await supabase
    .from('fantasy_teams')
    .select('id, user_id')
    .eq('league_id', leagueId)

  if (teamsError) return { error: teamsError.message }
  if (!fantasyTeams?.length) return {}

  const { data: existingRoster, error: existingRosterError } = await supabase
    .from('fantasy_team_players')
    .select('id')
    .in('team_id', fantasyTeams.map(team => team.id as string))
    .limit(1)

  if (existingRosterError) return { error: existingRosterError.message }
  if (existingRoster?.length) return {}

  const { data: allPicks, error: picksError } = await supabase
    .from('draft_picks')
    .select('user_id, player_id, pick_number')
    .eq('draft_session_id', sessionId)
    .order('pick_number', { ascending: true })

  if (picksError) return { error: picksError.message }
  if (!allPicks?.length) return {}

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

  if (!rows.length) return {}

  const { error } = await supabase.from('fantasy_team_players').insert(rows)
  return error ? { error: error.message } : {}
}

export async function advanceDraftTurn(
  supabase: SupabaseServerClient,
  draftSessionId: string,
  pickNumber: number
): Promise<AdvanceDraftResult> {
  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('id', draftSessionId)
    .single()

  if (sessionError || !session) {
    return { advanced: false, error: sessionError?.message ?? 'Sesion no encontrada.' }
  }

  const draftSession = session as IDraftSession
  if (draftSession.status !== 'active') return { advanced: false }
  if (draftSession.current_pick_number !== pickNumber) return { advanced: false }

  const { data: pick, error: pickError } = await supabase
    .from('draft_picks')
    .select('id')
    .eq('draft_session_id', draftSessionId)
    .eq('pick_number', pickNumber)
    .maybeSingle()

  if (pickError) return { advanced: false, error: pickError.message }
  if (!pick) return { advanced: false, error: 'No hay pick registrado para avanzar este turno.' }

  const snakeOrder = draftSession.snake_order
  const totalPicks = snakeOrder.length * TOTAL_PICKS_PER_TEAM
  const nextPick = pickNumber + 1

  if (nextPick > totalPicks) {
    const { data: completedSession, error: completeError } = await supabase
      .from('draft_sessions')
      .update({ status: 'completed', pick_deadline: null })
      .eq('id', draftSessionId)
      .eq('status', 'active')
      .eq('current_pick_number', pickNumber)
      .select('id')
      .maybeSingle()

    if (completeError) return { advanced: false, error: completeError.message }
    if (!completedSession) return { advanced: false }

    const finalizeResult = await finalizeDraft(supabase, draftSessionId, draftSession.league_id)
    if (finalizeResult.error) return { advanced: false, error: finalizeResult.error }

    return { advanced: true, completed: true }
  }

  const nextUser = getPickUser(snakeOrder, nextPick)
  const deadline = new Date(Date.now() + 60_000).toISOString()

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

  if (updateError) return { advanced: false, error: updateError.message }
  if (!updatedSession) return { advanced: false }

  return {
    advanced: true,
    currentPickNumber: updatedSession.current_pick_number as number,
    currentUserId: updatedSession.current_user_id as string | null,
  }
}
