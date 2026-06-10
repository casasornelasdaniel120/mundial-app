import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { performAutoPick } from '@/lib/draft/autopick'

type AutoPickBody = {
  sessionId?: unknown
  userId?: unknown
  pickNumber?: unknown
}

export async function POST(request: Request) {
  console.log('[api/draft/autopick] ── POST received')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.log('[api/draft/autopick] 401 — no authenticated user')
    return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 })
  }
  console.log(`[api/draft/autopick] auth OK — caller=${user.id}`)

  let body: AutoPickBody
  try {
    body = await request.json()
  } catch {
    console.log('[api/draft/autopick] 400 — invalid JSON body')
    return NextResponse.json({ ok: false, error: 'JSON invalido.' }, { status: 400 })
  }

  if (typeof body.sessionId !== 'string') {
    console.log('[api/draft/autopick] 400 — sessionId missing')
    return NextResponse.json({ ok: false, error: 'sessionId es requerido.' }, { status: 400 })
  }
  const expectedUserId = typeof body.userId === 'string' ? body.userId : undefined
  const expectedPickNumber = typeof body.pickNumber === 'number' ? body.pickNumber : undefined
  console.log(
    `[api/draft/autopick] params OK — sessionId=${body.sessionId} userId=${expectedUserId ?? '(none)'} pickNumber=${expectedPickNumber ?? '(none)'}`
  )

  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('league_id')
    .eq('id', body.sessionId)
    .single()

  if (sessionError || !session) {
    console.log(`[api/draft/autopick] 404 — session not found: ${sessionError?.message}`)
    return NextResponse.json({ ok: false, error: 'Sesion no encontrada.' }, { status: 404 })
  }

  const { data: membership, error: membershipError } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', session.league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    console.log(`[api/draft/autopick] 500 — membership check failed: ${membershipError.message}`)
    return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 })
  }
  if (!membership) {
    console.log('[api/draft/autopick] 403 — caller is not a league member')
    return NextResponse.json({ ok: false, error: 'No perteneces a esta liga.' }, { status: 403 })
  }
  console.log('[api/draft/autopick] membership OK — delegating to performAutoPick')

  const result = await performAutoPick(supabase, body.sessionId, expectedUserId, expectedPickNumber)
  console.log(`[api/draft/autopick] result: ${JSON.stringify(result)}`)

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 })
  }

  return NextResponse.json({ ok: true, picked: result.picked })
}
