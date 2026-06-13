import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import type { ILeaderboardEntry } from '@/types/db'
import InviteLinkButton from '@/components/InviteLinkButton'
import DeleteLeagueButton from './DeleteLeagueButton'
import KickMemberButton from './KickMemberButton'

type Props = {
  params: Promise<{ id: string }>
}

const RANK_COLORS: Record<number, string> = {
  1: 'text-amber-500 font-bold',
  2: 'text-stone-400 font-bold',
  3: 'text-orange-500 font-bold',
}

export default async function LeagueDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, invite_code, admin_user_id, max_teams, budget_cap, created_at')
    .eq('id', id)
    .single()

  if (!league) notFound()

  const { data: membership } = await supabase
    .from('league_members')
    .select('id, team_name')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/leagues')

  const [{ data: members }, { data: fantasyTeams }] = await Promise.all([
    supabase
      .from('league_members')
      .select('id, user_id, team_name, joined_at')
      .eq('league_id', id),
    supabase
      .from('fantasy_teams')
      .select('user_id, total_points')
      .eq('league_id', id),
  ])

  const pointsMap = new Map(
    fantasyTeams?.map(ft => [ft.user_id, ft.total_points as number]) ?? []
  )

  const leaderboard: ILeaderboardEntry[] = (members ?? [])
    .map(m => ({
      id: m.id as string,
      user_id: m.user_id as string,
      team_name: m.team_name as string | null,
      joined_at: m.joined_at as string,
      total_points: pointsMap.get(m.user_id as string) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.total_points - a.total_points ||
        new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    )

  const isAdmin = league.admin_user_id === user.id
  const allZero = leaderboard.every(e => e.total_points === 0)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/leagues"
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-700"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Mis Ligas
      </Link>

      {/* League header card */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Name + meta */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900">{league.name}</h1>
              {isAdmin && (
                <span className="rounded-full border border-[#006847]/20 bg-green-50 px-2.5 py-0.5 text-xs font-medium" style={{ color: '#006847' }}>
                  Admin
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
              <span>{leaderboard.length} / {league.max_teams} miembros</span>
              <span>Presupuesto ${league.budget_cap}M</span>
            </div>
            <div className="mt-3">
              <InviteLinkButton inviteCode={league.invite_code} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex shrink-0 flex-wrap gap-3">
            {isAdmin && (
              <>
                <Link
                  href={`/leagues/${league.id}/admin`}
                  className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:border-stone-400 hover:bg-stone-50 sm:py-2"
                >
                  <svg className="h-4 w-4 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Administrar Liga
                </Link>
                <DeleteLeagueButton leagueId={league.id} />
              </>
            )}
            <Link
              href={`/leagues/${league.id}/my-team`}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#005539] sm:py-2"
              style={{ backgroundColor: '#006847' }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
              Mi Equipo
            </Link>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 px-6 py-4">
          <h2 className="font-semibold text-stone-900">Tabla de Posiciones</h2>
          {allZero && (
            <p className="mt-1 text-xs text-stone-400">
              Los puntos se actualizarán cuando comience el torneo.
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="w-12 py-3 pl-4 text-left text-xs font-medium uppercase tracking-wider text-stone-400 sm:w-14 sm:pl-6">
                  #
                </th>
                <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                  Equipo
                </th>
                <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-wider text-stone-400 sm:pr-6">
                  Pts
                </th>
                {isAdmin && <th className="w-12 py-3 pr-4" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {leaderboard.map((entry, index) => {
                const rank = index + 1
                const isMe = entry.user_id === user.id
                return (
                  <tr
                    key={entry.id}
                    className={
                      isMe
                        ? 'border-l-2 bg-green-50/60'
                        : 'transition-colors hover:bg-stone-50'
                    }
                    style={isMe ? { borderLeftColor: '#006847' } : {}}
                  >
                    <td className="py-3.5 pl-4 sm:pl-6">
                      <span className={`text-sm ${RANK_COLORS[rank] ?? 'text-stone-400'}`}>
                        {rank}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isMe ? 'text-stone-900' : 'text-stone-700'}`}>
                          {entry.team_name ?? 'Mi Equipo'}
                        </span>
                        {isMe && (
                          <span className="rounded-full border border-[#006847]/20 bg-green-50 px-1.5 py-0.5 text-xs font-medium" style={{ color: '#006847' }}>
                            tú
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4 text-right sm:pr-6">
                      <span className={`text-sm font-semibold tabular-nums ${isMe ? '' : 'text-stone-700'}`} style={isMe ? { color: '#006847' } : {}}>
                        {entry.total_points}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 pr-4 text-right">
                        {entry.user_id !== league.admin_user_id && (
                          <KickMemberButton
                            leagueId={league.id}
                            memberUserId={entry.user_id}
                            teamName={entry.team_name ?? 'Mi Equipo'}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
