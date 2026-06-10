'use server'

import { createClient } from '@/lib/supabase/server'
import type { IDraftSession } from '@/types/db'
import { advanceDraftTurn } from '@/lib/draft/advance'
import { performAutoPick } from '@/lib/draft/autopick'

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

  // ── 403 GUARD ──────────────────────────────────────────────
  // The pick is ONLY inserted if the session's current_user_id matches the
  // authenticated user. This runs server-side against a fresh session read,
  // so it holds even if the client UI was bypassed entirely.
  if (session.current_user_id !== user.id) {
    console.log(
      `[draft/makePick] 403 FORBIDDEN — user ${user.id} tried to pick but turn belongs to ${session.current_user_id} (pick ${session.current_pick_number})`
    )
    return { error: 'No es tu turno.' }
  }
  console.log(
    `[draft/makePick] turn verified — user ${user.id} owns pick ${session.current_pick_number}`
  )

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

  // Shared implementation with /api/draft/autopick — see src/lib/draft/autopick.ts
  const result = await performAutoPick(supabase, draftSessionId)
  return result.error ? { error: result.error } : {}
}
