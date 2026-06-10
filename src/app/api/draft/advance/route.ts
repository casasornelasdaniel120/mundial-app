import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advanceDraftTurn } from '@/lib/draft/advance'
import { performAutoPick } from '@/lib/draft/autopick'

type AdvanceBody = {
  sessionId?: unknown
  draftSessionId?: unknown
  pickNumber?: unknown
}

export async function POST(request: Request) {
  console.log('[api/draft/advance] ── POST received')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[api/draft/advance] 401 — no authenticated user')
    return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 })
  }
  console.log(`[api/draft/advance] auth OK — user=${user.id}`)

  let body: AdvanceBody
  try {
    body = await request.json()
  } catch {
    console.log('[api/draft/advance] 400 — invalid JSON body')
    return NextResponse.json({ ok: false, error: 'JSON invalido.' }, { status: 400 })
  }

  // Accept both `sessionId` and `draftSessionId` for the session identifier.
  const sessionId =
    typeof body.sessionId === 'string' ? body.sessionId :
    typeof body.draftSessionId === 'string' ? body.draftSessionId :
    null

  if (!sessionId || typeof body.pickNumber !== 'number') {
    console.log(`[api/draft/advance] 400 — bad params: sessionId=${String(sessionId)} pickNumber=${String(body.pickNumber)}`)
    return NextResponse.json(
      { ok: false, error: 'sessionId y pickNumber son requeridos.' },
      { status: 400 }
    )
  }
  console.log(`[api/draft/advance] params OK — sessionId=${sessionId} pickNumber=${body.pickNumber}`)

  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('league_id')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    console.log(`[api/draft/advance] 404 — session not found: ${sessionError?.message}`)
    return NextResponse.json({ ok: false, error: 'Sesion no encontrada.' }, { status: 404 })
  }

  const { data: membership, error: membershipError } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', session.league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.log(`[api/draft/advance] 500 — membership check failed: ${membershipError.message}`)
    return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 })
  }
  if (!membership) {
    console.log('[api/draft/advance] 403 — user is not a league member')
    return NextResponse.json({ ok: false, error: 'No perteneces a esta liga.' }, { status: 403 })
  }
  console.log('[api/draft/advance] membership OK — delegating to advanceDraftTurn')

  const result = await advanceDraftTurn(supabase, sessionId, body.pickNumber)
  console.log(`[api/draft/advance] result: ${JSON.stringify(result)}`)

  // ── AUTO-PICK SAFETY NET ───────────────────────────────────
  // If the current turn's deadline has already expired and no pick exists for
  // current_pick_number (e.g. every client was disconnected when the timer ran
  // out), execute the autopick server-side right now. performAutoPick validates
  // deadline + idempotency internally, so on a healthy advance this is a no-op.
  const autoPickResult = await performAutoPick(supabase, sessionId)
  if (autoPickResult.picked) {
    console.log('[api/draft/advance] expired turn recovered — server-side autopick executed')
  }

  if (result.error && !autoPickResult.picked) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 })
  }

  return NextResponse.json({ ok: true, ...result, autoPicked: autoPickResult.picked })
}
