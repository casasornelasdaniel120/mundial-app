import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { initDraft } from './actions'

type Props = { params: Promise<{ id: string }> }

export default async function AdminPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, admin_user_id, budget_cap, max_teams')
    .eq('id', id)
    .single()

  if (!league || league.admin_user_id !== user.id) notFound()

  const [{ data: draftSession }, { data: members }, { data: scoringRules }] = await Promise.all([
    supabase.from('draft_sessions').select('id, status').eq('league_id', id).maybeSingle(),
    supabase.from('league_members').select('user_id, team_name').eq('league_id', id),
    supabase.from('scoring_rules').select('event_type, points').eq('league_id', id).order('points', { ascending: false }),
  ])

  const STATUS_LABELS: Record<string, string> = {
    waiting: 'Esperando inicio',
    active: 'En progreso',
    completed: 'Finalizado',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href={`/leagues/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-700 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        {league.name}
      </Link>

      <div>
        <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.3em]" style={{ color: '#006847' }}>
          Administración
        </p>
        <h1 className="text-2xl font-bold text-stone-900">{league.name}</h1>
        <p className="mt-1 text-sm text-stone-500">Panel de Administración</p>
      </div>

      {/* Draft */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-stone-900">Draft de Jugadores</h2>

        {!draftSession ? (
          <>
            <p className="text-sm text-stone-500">
              Inicia el draft para que los {members?.length ?? 0} miembros elijan sus jugadores
              en orden de serpiente. El orden se randomiza automáticamente.
            </p>
            <form action={initDraft.bind(null, id)}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#006847] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005539] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Iniciar Draft
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wider">Estado</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  draftSession.status === 'active' ? 'animate-pulse' :
                  draftSession.status === 'completed' ? 'bg-stone-400' : 'bg-amber-500'
                }`} style={draftSession.status === 'active' ? { backgroundColor: '#006847' } : {}} />
                <span className="text-stone-800 font-medium">{STATUS_LABELS[draftSession.status]}</span>
              </div>
            </div>
            <Link
              href={`/leagues/${id}/draft`}
              className="rounded-lg bg-[#006847] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005539] transition-colors"
            >
              Ir al Draft →
            </Link>
          </div>
        )}
      </div>

      {/* Scoring rules */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-stone-900">Reglas de Puntuación</h2>
        {scoringRules?.length ? (
          <div className="space-y-1.5">
            {scoringRules.map(rule => (
              <div key={rule.event_type} className="flex items-center justify-between text-sm">
                <span className="text-stone-500 capitalize">{rule.event_type.replace(/_/g, ' ')}</span>
                <span className={`font-semibold tabular-nums ${Number(rule.points) >= 0 ? '' : 'text-red-500'}`} style={Number(rule.points) >= 0 ? { color: '#006847' } : {}}>
                  {Number(rule.points) > 0 ? '+' : ''}{rule.points} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-400">No hay reglas configuradas.</p>
        )}
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="font-semibold text-stone-900">
          Miembros ({members?.length ?? 0} / {league.max_teams})
        </h2>
        <div className="space-y-1.5">
          {members?.map(m => (
            <div key={m.user_id} className="text-sm text-stone-600">
              {m.team_name ?? 'Mi Equipo'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
