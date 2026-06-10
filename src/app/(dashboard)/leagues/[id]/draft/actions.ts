'use server'

import { createClient } from '@/lib/supabase/server'
import type { IDraftSession } from '@/types/db'
import { advanceDraftTurn } from '@/lib/draft/advance'

// ── Constants ───────────────────────────────────────────────
const ROSTER_LIMITS = { GK: 2, DEF: 6, MID: 5, FWD: 6 } as const

type Position = keyof typeof ROSTER_LIMITS

// ── Core pick processor ─────────────────────────────────────
async function applyPick(
  supabase: Awaited<ReturnType<typeof createClient>>,
  session: IDraftSession,
  userId: string,
  playerId: string
): Promise<{ error?: string }> {
  // Insert the pick (UNIQUE constraint on (session_id, pick_number) handles races)
  const { error: pickError } = await supabase.from('draft_picks').insert({
    draft_session_id: session.id,
    pick_number: session.current_pick_number,
    user_id: userId,
    player_id: playerId,
  })
  if (pickError) return { error: pickError.message }

  const advanceResult = await advanceDraftTurn(supabase, session.id, session.current_pick_number)
  return advanceResult.error ? { error: advanceResult.error } : {}
}

// ── Public actions ──────────────────────────────────────────

export async function startDraft(draftSessionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const deadline = new Date(Date.now() + 60_000).toISOString()
  const { error } = await supabase
    .from('draft_sessions')
    .update({ status: 'active', pick_deadline: deadline })
    .eq('id', draftSessionId)

  return error ? { error: error.message } : {}
}

export async function makePick(
  draftSessionId: string,
  playerId: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: session } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('id', draftSessionId)
    .single()

  if (!session) return { error: 'Sesión no encontrada.' }
  if (session.status !== 'active') return { error: 'El draft no está activo.' }
  if (session.current_user_id !== user.id) return { error: 'No es tu turno.' }

  // Verify player is not already picked
  const { data: taken } = await supabase
    .from('draft_picks')
    .select('id')
    .eq('draft_session_id', draftSessionId)
    .eq('player_id', playerId)
    .maybeSingle()
  if (taken) return { error: 'Jugador ya seleccionado.' }

  return applyPick(supabase, session as IDraftSession, user.id, playerId)
}

export async function autoPick(draftSessionId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: session } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('id', draftSessionId)
    .single()

  if (!session || session.status !== 'active') return {}

  // Only run if deadline has genuinely passed
  if (session.pick_deadline && new Date(session.pick_deadline) > new Date()) return {}

  // Idempotency: bail if a pick was already recorded for this slot
  const { data: existing } = await supabase
    .from('draft_picks')
    .select('id')
    .eq('draft_session_id', draftSessionId)
    .eq('pick_number', session.current_pick_number)
    .maybeSingle()
  if (existing) return {}

  const pickerId = session.current_user_id as string

  // Count positions already picked by this user
  const { data: myPickIds } = await supabase
    .from('draft_picks')
    .select('player_id')
    .eq('draft_session_id', draftSessionId)
    .eq('user_id', pickerId)

  const myPlayerIds = myPickIds?.map(p => p.player_id as string) ?? []
  const posCounts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 }

  if (myPlayerIds.length > 0) {
    const { data: myPlayers } = await supabase
      .from('players')
      .select('position')
      .in('id', myPlayerIds)
    for (const p of myPlayers ?? []) {
      posCounts[p.position as string] = (posCounts[p.position as string] ?? 0) + 1
    }
  }

  // Determine what position is needed next
  const needed: Position =
    posCounts.GK < ROSTER_LIMITS.GK ? 'GK' :
    posCounts.DEF < ROSTER_LIMITS.DEF ? 'DEF' :
    posCounts.MID < ROSTER_LIMITS.MID ? 'MID' : 'FWD'

  // All already-picked player IDs (across all teams)
  const { data: allPicks } = await supabase
    .from('draft_picks')
    .select('player_id')
    .eq('draft_session_id', draftSessionId)

  const pickedIds = new Set(allPicks?.map(p => p.player_id as string) ?? [])

  // Best available player by value for the needed position
  const { data: candidates } = await supabase
    .from('players')
    .select('id, value')
    .eq('position', needed)
    .order('value', { ascending: false })

  const best = (candidates ?? []).find(p => !pickedIds.has(p.id as string))
  if (!best) return { error: 'Sin jugadores disponibles para auto-pick.' }

  return applyPick(supabase, session as IDraftSession, pickerId, best.id as string)
}
