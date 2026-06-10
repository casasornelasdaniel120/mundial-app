import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { advanceDraftTurn } from '@/lib/draft/advance'

type AdvanceBody = {
  draftSessionId?: unknown
  pickNumber?: unknown
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'No autenticado.' }, { status: 401 })
  }

  let body: AdvanceBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalido.' }, { status: 400 })
  }

  if (typeof body.draftSessionId !== 'string' || typeof body.pickNumber !== 'number') {
    return NextResponse.json({ ok: false, error: 'draftSessionId y pickNumber son requeridos.' }, { status: 400 })
  }

  const { data: session, error: sessionError } = await supabase
    .from('draft_sessions')
    .select('league_id')
    .eq('id', body.draftSessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ ok: false, error: 'Sesion no encontrada.' }, { status: 404 })
  }

  const { data: membership, error: membershipError } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', session.league_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError) {
    return NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 })
  }
  if (!membership) {
    return NextResponse.json({ ok: false, error: 'No perteneces a esta liga.' }, { status: 403 })
  }

  const result = await advanceDraftTurn(supabase, body.draftSessionId, body.pickNumber)
  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 })
  }

  return NextResponse.json({ ok: true, ...result })
}
