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
  1: 'text-yellow-400 font-bold',
  2: 'text-gray-300 font-bold',
  3: 'text-amber-600 font-bold',
}

export default async function LeagueDetailPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch league
  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, invite_code, admin_user_id, max_teams, budget_cap, created_at')
    .eq('id', id)
    .single()

  if (!league) notFound()

  // Verify current user is a member (or the admin)
  const { data: membership } = await supabase
    .from('league_members')
    .select('id, team_name')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/leagues')

  // Build leaderboard: members + their fantasy team points
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
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-300"
      >
        ← Mis Ligas
      </Link>

      {/* League header card */}
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Name + meta */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{league.name}</h1>
              {isAdmin && (
                <span className="rounded-full bg-green-900/50 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  Admin
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
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
                  className="rounded-lg border border-gray-700/60 bg-gray-800/40 px-4 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:border-gray-500/60 hover:bg-gray-700/60 sm:py-2"
                >
                  ⚙️ Administrar Liga
                </Link>
                <DeleteLeagueButton leagueId={league.id} />
              </>
            )}
            <Link
              href={`/leagues/${league.id}/my-team`}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500 sm:py-2"
            >
              ⚽ Mi Equipo
            </Link>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 overflow-hidden">
        <div className="border-b border-gray-800/60 px-6 py-4">
          <h2 className="font-semibold text-white">Tabla de Posiciones</h2>
          {allZero && (
            <p className="mt-1 text-xs text-gray-500">
              Los puntos se actualizarán cuando comience el torneo.
            </p>
          )}
        </div>

        {/* overflow-x-auto: the parent card is overflow-hidden, so a too-wide
            table would be clipped (not scrollable) without this wrapper. */}
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/60">
              <th className="w-12 py-3 pl-4 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:w-14 sm:pl-6">
                #
              </th>
              <th className="py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Equipo
              </th>
              <th className="py-3 pr-4 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:pr-6">
                Pts
              </th>
              {isAdmin && <th className="w-12 py-3 pr-4" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {leaderboard.map((entry, index) => {
              const rank = index + 1
              const isMe = entry.user_id === user.id
              return (
                <tr
                  key={entry.id}
                  className={
                    isMe
                      ? 'border-l-2 border-green-600 bg-green-950/20'
                      : 'transition-colors hover:bg-gray-800/30'
                  }
                >
                  <td className="py-3.5 pl-4 sm:pl-6">
                    <span className={`text-sm ${RANK_COLORS[rank] ?? 'text-gray-500'}`}>
                      {rank}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${isMe ? 'text-white' : 'text-gray-300'}`}>
                        {entry.team_name ?? 'Mi Equipo'}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-green-900/50 px-1.5 py-0.5 text-xs text-green-400">
                          tú
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-right sm:pr-6">
                    <span className={`text-sm font-semibold tabular-nums ${isMe ? 'text-green-400' : 'text-gray-300'}`}>
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
