import { createClient } from '@/lib/supabase/server'
import type { IDraftSession } from '@/types/db'
import { advanceDraftTurn } from './advance'

const ROSTER_LIMITS = { GK: 2, DEF: 6, MID: 5, FWD: 6 } as const

type Position = keyof typeof ROSTER_LIMITS
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type AutoPickResult = {
  ok: boolean
  picked: boolean
  error?: string
}

/**
 * Auto-picks the best available player for the user whose turn expired,
 * then advances the turn. Safe to call from every connected client:
 * - no-ops if the deadline has not actually passed
 * - no-ops if a pick already exists for the current pick_number
 * - the UNIQUE(draft_session_id, pick_number) constraint resolves races;
 *   the losing insert is treated as a no-op, not an error
 */
export async function performAutoPick(
  supabase: SupabaseServerClient,
  sessionId: string,
  expectedUserId?: string,
  expectedPickNumber?: number
): Promise<AutoPickResult> {
  console.log(
    `[draft/autopick] start — session=${sessionId} expectedUser=${expectedUserId ?? '(none)'} expectedPick=${expectedPickNumber ?? '(none)'}`
  )

  // STEP 1: load session
  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.log(`[draft/autopick] STEP 1 FAIL — ${sessionError?.message}`)
    return { ok: false, picked: false, error: sessionError?.message ?? 'Sesion no encontrada.' }
  }

  const draftSession = session as IDraftSession
  console.log(
    `[draft/autopick] STEP 1 OK — status=${draftSession.status} pick=${draftSession.current_pick_number} user=${draftSession.current_user_id} deadline=${draftSession.pick_deadline}`
  )

  if (draftSession.status !== 'active') {
    console.log('[draft/autopick] no-op — session not active')
    return { ok: true, picked: false }
  }

  // Stale request: the turn already advanced past the user the client saw.
  if (expectedUserId && draftSession.current_user_id !== expectedUserId) {
    console.log(
      `[draft/autopick] no-op — stale request (expected user ${expectedUserId}, current is ${draftSession.current_user_id})`
    )
    return { ok: true, picked: false }
  }

  // Stale request: the pick number already moved past what the client saw.
  if (expectedPickNumber !== undefined && draftSession.current_pick_number !== expectedPickNumber) {
    console.log(
      `[draft/autopick] no-op — stale request (expected pick ${expectedPickNumber}, current is ${draftSession.current_pick_number})`
    )
    return { ok: true, picked: false }
  }

  // STEP 2: deadline must have genuinely passed
  if (draftSession.pick_deadline && new Date(draftSession.pick_deadline) > new Date()) {
    console.log('[draft/autopick] no-op — deadline has not passed yet')
    return { ok: true, picked: false }
  }

  // STEP 3: idempotency — bail if a pick already exists for this slot
  const { data: existing, error: existingError } = await supabase
    .from('draft_picks')
    .select('id')
    .eq('draft_session_id', sessionId)
    .eq('pick_number', draftSession.current_pick_number)
    .maybeSingle()

  if (existingError) {
    console.log(`[draft/autopick] STEP 3 FAIL — ${existingError.message}`)
    return { ok: false, picked: false, error: existingError.message }
  }
  if (existing) {
    console.log('[draft/autopick] no-op — pick already recorded for this slot, ensuring turn advances')
    // The pick exists but the turn may not have advanced (e.g. the picker
    // disconnected mid-flow) — run advance to be safe; it's conditional.
    await advanceDraftTurn(supabase, sessionId, draftSession.current_pick_number)
    return { ok: true, picked: false }
  }

  const pickerId = draftSession.current_user_id as string

  // STEP 4: figure out which position this user still needs (GK→DEF→MID→FWD)
  const { data: myPickRows, error: myPicksError } = await supabase
    .from('draft_picks')
    .select('player_id')
    .eq('draft_session_id', sessionId)
    .eq('user_id', pickerId)

  if (myPicksError) {
    console.log(`[draft/autopick] STEP 4 FAIL — ${myPicksError.message}`)
    return { ok: false, picked: false, error: myPicksError.message }
  }

  const myPlayerIds = (myPickRows ?? []).map(p => p.player_id as string)
  const posCounts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }

  if (myPlayerIds.length > 0) {
    const { data: myPlayers, error: myPlayersError } = await supabase
      .from('players')
      .select('position')
      .in('id', myPlayerIds)

    if (myPlayersError) {
      console.log(`[draft/autopick] STEP 4 FAIL — ${myPlayersError.message}`)
      return { ok: false, picked: false, error: myPlayersError.message }
    }
    for (const p of myPlayers ?? []) {
      const pos = p.position as Position
      posCounts[pos] = (posCounts[pos] ?? 0) + 1
    }
  }

  const needed: Position =
    posCounts.GK < ROSTER_LIMITS.GK ? 'GK' :
    posCounts.DEF < ROSTER_LIMITS.DEF ? 'DEF' :
    posCounts.MID < ROSTER_LIMITS.MID ? 'MID' : 'FWD'

  console.log(
    `[draft/autopick] STEP 4 OK — roster GK=${posCounts.GK} DEF=${posCounts.DEF} MID=${posCounts.MID} FWD=${posCounts.FWD} → needs ${needed}`
  )

  // STEP 5: best available player for that position (by value desc)
  const { data: allPicks, error: allPicksError } = await supabase
    .from('draft_picks')
    .select('player_id')
    .eq('draft_session_id', sessionId)

  if (allPicksError) {
    console.log(`[draft/autopick] STEP 5 FAIL — ${allPicksError.message}`)
    return { ok: false, picked: false, error: allPicksError.message }
  }

  const pickedIds = new Set((allPicks ?? []).map(p => p.player_id as string))

  const { data: candidates, error: candidatesError } = await supabase
    .from('players')
    .select('id, name, value')
    .eq('position', needed)
    .order('value', { ascending: false })

  if (candidatesError) {
    console.log(`[draft/autopick] STEP 5 FAIL — ${candidatesError.message}`)
    return { ok: false, picked: false, error: candidatesError.message }
  }

  const best = (candidates ?? []).find(p => !pickedIds.has(p.id as string))
  if (!best) {
    console.log('[draft/autopick] STEP 5 FAIL — no available players for needed position')
    return { ok: false, picked: false, error: 'Sin jugadores disponibles para auto-pick.' }
  }
  console.log(`[draft/autopick] STEP 5 OK — selected ${best.name} (${best.id})`)

  // STEP 6: insert the pick. UNIQUE(draft_session_id, pick_number) means
  // only one concurrent client wins; losers get 23505 and treat it as no-op.
  const { error: insertError } = await supabase.from('draft_picks').insert({
    draft_session_id: sessionId,
    pick_number: draftSession.current_pick_number,
    user_id: pickerId,
    player_id: best.id as string,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      console.log('[draft/autopick] STEP 6 — lost insert race (23505), another client auto-picked first')
      return { ok: true, picked: false }
    }
    console.log(`[draft/autopick] STEP 6 FAIL — ${insertError.message}`)
    return { ok: false, picked: false, error: insertError.message }
  }
  console.log(`[draft/autopick] STEP 6 OK — pick ${draftSession.current_pick_number} inserted`)

  // STEP 7: advance the turn
  const advanceResult = await advanceDraftTurn(supabase, sessionId, draftSession.current_pick_number)
  if (advanceResult.error) {
    console.log(`[draft/autopick] STEP 7 FAIL — ${advanceResult.error}`)
    return { ok: false, picked: true, error: advanceResult.error }
  }

  console.log('[draft/autopick] DONE — pick inserted and turn advanced')
  return { ok: true, picked: true }
}
