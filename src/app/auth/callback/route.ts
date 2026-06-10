import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Handles the OAuth and magic-link redirect from Supabase.
// Supabase redirects here with ?code=<code> after email confirmation or OAuth.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Optional ?next= param to redirect somewhere specific after auth
  const next = searchParams.get('next') ?? '/leagues'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // Something went wrong — send back to login with an error hint
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
