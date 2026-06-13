import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ILeague } from '@/types/db'
import JoinForm from './JoinForm'

type Props = {
  params: Promise<{ invite_code: string }>
}

export default async function JoinPage({ params }: Props) {
  const { invite_code } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league, error } = await supabase
    .from('leagues')
    .select('id, name, max_teams, budget_cap, invite_code, admin_user_id, created_at, league_members(id)')
    .eq('invite_code', invite_code)
    .single()

  if (error || !league) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
            <svg className="h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-900">Liga no encontrada</h1>
          <p className="mt-2 text-sm text-stone-500">Este enlace de invitación no es válido o ya expiró.</p>
        </div>
      </main>
    )
  }

  const isMember = (league.league_members as Array<{ id: string }>).length > 0
    && await supabase
        .from('league_members')
        .select('id')
        .eq('league_id', league.id)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(r => !!r.data)

  if (isMember) redirect(`/leagues/${league.id}`)

  const memberCount = (league.league_members as Array<{ id: string }>).length
  const isFull = memberCount >= league.max_teams

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4 relative overflow-hidden">
      {/* Aztec pattern */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <svg className="absolute inset-0 h-full w-full" style={{ color: '#006847', opacity: 0.025 }}>
          <defs>
            <pattern id="aztec-join" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <rect x="10" y="1" width="8" height="2" fill="currentColor"/>
              <rect x="1" y="10" width="2" height="8" fill="currentColor"/>
              <rect x="25" y="10" width="2" height="8" fill="currentColor"/>
              <rect x="10" y="25" width="8" height="2" fill="currentColor"/>
              <rect x="10" y="10" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#aztec-join)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#006847]/20 bg-white shadow-sm">
            <svg className="h-8 w-8" style={{ color: '#006847' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <p className="text-sm text-stone-500">Fuiste invitado a unirte a</p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'var(--font-russo)' }}>
            {league.name}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-stone-500">
            <span>{memberCount} / {league.max_teams} miembros</span>
            <span>·</span>
            <span>Presupuesto ${league.budget_cap}M</span>
          </div>

          {/* Member fill bar */}
          <div className="mt-4">
            <div className="flex gap-[2px]">
              {Array.from({ length: Math.min(league.max_teams, 12) }).map((_, i) => {
                const threshold = Math.round((i / Math.min(league.max_teams, 12)) * league.max_teams)
                return (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{ backgroundColor: threshold < memberCount ? '#006847' : '#e7e5e0' }}
                  />
                )
              })}
            </div>
          </div>

          {isFull ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              Esta liga está llena y ya no acepta nuevos miembros.
            </div>
          ) : (
            <JoinForm inviteCode={invite_code} leagueName={league.name} />
          )}
        </div>
      </div>
    </main>
  )
}
