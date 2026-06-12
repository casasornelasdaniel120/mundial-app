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
      <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="text-center">
          <span className="text-5xl">🔍</span>
          <h1 className="mt-4 text-xl font-bold text-white">League not found</h1>
          <p className="mt-2 text-sm text-gray-500">This invite link is invalid or has expired.</p>
        </div>
      </main>
    )
  }

  // Already a member → send straight to the league
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-5xl">⚽</span>
          <p className="mt-2 text-sm text-green-300">You&apos;ve been invited to join</p>
        </div>

        <div className="rounded-2xl border border-gray-800/60 bg-gray-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <h1 className="text-xl font-bold text-white">{league.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {memberCount} / {league.max_teams} members · Budget ${league.budget_cap}M
          </p>

          {isFull ? (
            <div className="mt-6 rounded-lg border border-red-800/40 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              This league is full and no longer accepting new members.
            </div>
          ) : (
            <JoinForm inviteCode={invite_code} leagueName={league.name} />
          )}
        </div>
      </div>
    </main>
  )
}
