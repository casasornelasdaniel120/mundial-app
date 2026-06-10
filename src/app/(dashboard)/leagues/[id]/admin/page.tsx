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
      <Link href={`/leagues/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
        ← {league.name}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">{league.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Panel de Administración</p>
      </div>

      {/* Draft */}
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 p-6 space-y-4">
        <h2 className="font-semibold text-white">Draft de Jugadores</h2>

        {!draftSession ? (
          <>
            <p className="text-sm text-gray-400">
              Inicia el draft para que los {members?.length ?? 0} miembros elijan sus jugadores
              en orden de serpiente. El orden se randomiza automáticamente.
            </p>
            <form action={initDraft.bind(null, id)}>
              <button
                type="submit"
                className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors shadow-lg shadow-green-950"
              >
                🎯 Iniciar Draft
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Estado</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  draftSession.status === 'active' ? 'bg-green-500 animate-pulse' :
                  draftSession.status === 'completed' ? 'bg-gray-500' : 'bg-yellow-500'
                }`} />
                <span className="text-white font-medium">{STATUS_LABELS[draftSession.status]}</span>
              </div>
            </div>
            <Link
              href={`/leagues/${id}/draft`}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
            >
              Ir al Draft →
            </Link>
          </div>
        )}
      </div>

      {/* Scoring rules */}
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 p-6 space-y-3">
        <h2 className="font-semibold text-white">Reglas de Puntuación</h2>
        {scoringRules?.length ? (
          <div className="space-y-1.5">
            {scoringRules.map(rule => (
              <div key={rule.event_type} className="flex items-center justify-between text-sm">
                <span className="text-gray-400 capitalize">{rule.event_type.replace(/_/g, ' ')}</span>
                <span className={`font-semibold tabular-nums ${Number(rule.points) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(rule.points) > 0 ? '+' : ''}{rule.points} pts
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay reglas configuradas.</p>
        )}
      </div>

      {/* Members */}
      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 p-6 space-y-3">
        <h2 className="font-semibold text-white">Miembros ({members?.length ?? 0} / {league.max_teams})</h2>
        <div className="space-y-1.5">
          {members?.map(m => (
            <div key={m.user_id} className="text-sm text-gray-400">
              {m.team_name ?? 'Mi Equipo'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
