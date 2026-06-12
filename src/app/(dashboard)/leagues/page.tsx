import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ILeagueWithMemberCount } from '@/types/db'
import InviteLinkButton from '@/components/InviteLinkButton'

export default async function LeaguesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('league_members')
    .select('league_id')
    .eq('user_id', user.id)

  const leagueIds = memberships?.map(m => m.league_id) ?? []
  let leagues: ILeagueWithMemberCount[] = []

  if (leagueIds.length > 0) {
    const { data } = await supabase
      .from('leagues')
      .select('id, name, invite_code, admin_user_id, max_teams, budget_cap, created_at, league_members(id)')
      .in('id', leagueIds)
      .order('created_at', { ascending: false })

    leagues = (data as ILeagueWithMemberCount[]) ?? []
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis Ligas</h1>
          <p className="mt-1 text-sm text-gray-500">
            {leagues.length === 0 ? 'Aún no perteneces a ninguna liga.' : `${leagues.length} liga${leagues.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/leagues/new"
          className="shrink-0 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500 sm:py-2"
        >
          + Crear Liga
        </Link>
      </div>

      {leagues.length === 0 ? (
        /* Empty state */
        <div className="rounded-2xl border border-dashed border-gray-700/60 bg-gray-900/30 py-20 text-center">
          <span className="text-5xl">🏆</span>
          <p className="mt-4 text-lg font-semibold text-white">Sin ligas aún</p>
          <p className="mt-1 text-sm text-gray-500">Crea una liga o únete con un enlace de invitación.</p>
          <Link
            href="/leagues/new"
            className="mt-6 inline-block rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500"
          >
            Crear primera liga
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map(league => (
            <div
              key={league.id}
              className="flex flex-col gap-4 rounded-2xl border border-gray-800/60 bg-gray-900/60 p-5 transition-colors hover:border-gray-700/60"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-semibold text-white">{league.name}</h2>
                    {league.admin_user_id === user.id && (
                      <span className="shrink-0 rounded-full bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-400">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {league.league_members.length} / {league.max_teams} miembros
                    {' · '}
                    ${league.budget_cap}M
                  </p>
                </div>
                <Link
                  href={`/leagues/${league.id}`}
                  className="shrink-0 rounded-lg border border-gray-700/60 px-3.5 py-2.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-500/60 hover:bg-gray-800/60 sm:px-3 sm:py-1.5"
                >
                  Ver →
                </Link>
              </div>

              <div className="flex items-center justify-between border-t border-gray-800/60 pt-3">
                <span className="text-xs text-gray-600">Invitación</span>
                <InviteLinkButton inviteCode={league.invite_code} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
