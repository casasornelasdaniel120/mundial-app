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
      {/* ── Page header ── */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.3em] text-green-500">
            Mundial 2026
          </p>
          <h1
            className="text-3xl text-white uppercase tracking-tight"
            style={{ fontFamily: 'var(--font-russo)' }}
          >
            Mis Ligas
          </h1>
          <p className="mt-1 text-xs text-gray-600">
            {leagues.length === 0
              ? 'Aún no perteneces a ninguna liga'
              : `${leagues.length} liga${leagues.length !== 1 ? 's' : ''} activa${leagues.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <Link
          href="/leagues/new"
          className="shrink-0 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg shadow-green-900/40 transition-all duration-200 hover:bg-green-500 hover:shadow-green-900/60 cursor-pointer"
          style={{ fontFamily: 'var(--font-russo)' }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Liga
        </Link>
      </div>

      {leagues.length === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-800/60 bg-gray-900/20 px-6 py-20 text-center">
          {/* Abstract trophy/pitch icon */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-gray-800/60 bg-gray-900/60">
            <svg className="h-10 w-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>

          <h2
            className="text-xl text-white uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-russo)' }}
          >
            Sin ligas aún
          </h2>
          <p className="mt-2 max-w-xs text-sm text-gray-600">
            Crea tu propia liga o únete a una con un enlace de invitación.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/leagues/new"
              className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white shadow-lg shadow-green-900/40 transition-all duration-200 hover:bg-green-500 cursor-pointer"
              style={{ fontFamily: 'var(--font-russo)' }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Crear liga
            </Link>
            <span className="text-xs text-gray-700">o</span>
            <p className="text-xs text-gray-500">pide el enlace de invitación a tu grupo</p>
          </div>
        </div>
      ) : (
        /* ── League cards grid ── */
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map(league => {
            const memberCount = league.league_members.length
            const isAdmin     = league.admin_user_id === user.id
            const fillPct     = Math.round((memberCount / league.max_teams) * 100)

            return (
              <div
                key={league.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/40 transition-all duration-200 hover:border-gray-700/60 hover:bg-gray-900/60 hover:-translate-y-0.5"
              >
                {/* Green accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-green-600/60 group-hover:bg-green-500 transition-colors" />

                <div className="flex flex-1 flex-col gap-4 p-5 pl-6">
                  {/* Name row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2
                          className="truncate text-base text-white"
                          style={{ fontFamily: 'var(--font-russo)' }}
                        >
                          {league.name}
                        </h2>
                        {isAdmin && (
                          <span className="shrink-0 rounded-full border border-green-700/40 bg-green-900/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-green-400">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/leagues/${league.id}`}
                      className="shrink-0 flex items-center gap-1 rounded-lg border border-gray-700/50 px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wider transition-all duration-200 hover:border-green-600/40 hover:bg-green-950/30 hover:text-green-400 cursor-pointer"
                    >
                      Ver
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5">
                    {/* Members */}
                    <div className="flex-1">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider text-gray-600">Equipos</span>
                        <span className="text-[11px] font-semibold text-white tabular-nums">
                          {memberCount}<span className="text-gray-700">/{league.max_teams}</span>
                        </span>
                      </div>
                      {/* Segmented fill bar */}
                      <div className="flex gap-[2px]">
                        {Array.from({ length: Math.min(league.max_teams, 12) }).map((_, i) => {
                          const threshold = Math.round((i / Math.min(league.max_teams, 12)) * league.max_teams)
                          return (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                threshold < memberCount ? 'bg-green-500' : 'bg-gray-800'
                              }`}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* Budget */}
                    <div className="shrink-0 text-right">
                      <span className="text-[10px] uppercase tracking-wider text-gray-600 block">Presupuesto</span>
                      <span className="text-[11px] font-semibold text-white tabular-nums">${league.budget_cap}M</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-800/40 px-6 py-3 pl-6">
                  <InviteLinkButton inviteCode={league.invite_code} />

                  <span className="text-[10px] text-gray-700 tabular-nums">
                    {fillPct}% lleno
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
