'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveLineup } from './actions'

type Position = 'GK' | 'DEF' | 'MID' | 'FWD'

type Team = {
  name: string
  flag_url: string | null
}

export type LineupPlayer = {
  rosterId: string
  id: string
  name: string
  position: Position
  isStarting: boolean
  photoUrl: string | null
  team: Team | null
  totalPoints: number
}

type PendingSwap = {
  rosterId: string
  isStarting: boolean
}

const SECTIONS: Array<{ position: Position; label: string }> = [
  { position: 'GK', label: 'Porteros' },
  { position: 'DEF', label: 'Defensas' },
  { position: 'MID', label: 'Mediocampistas' },
  { position: 'FWD', label: 'Delanteros' },
]

const POSITION_COLORS: Record<Position, string> = {
  GK:  'bg-amber-50 text-amber-700',
  DEF: 'bg-blue-50 text-blue-700',
  MID: 'bg-green-50 text-green-700',
  FWD: 'bg-red-50 text-red-700',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}

function PlayerAvatar({ player }: { player: LineupPlayer }) {
  if (player.photoUrl) {
    return (
      <span
        className="block h-10 w-10 shrink-0 rounded-full border border-stone-200 bg-stone-100 bg-cover bg-center"
        style={{ backgroundImage: `url(${player.photoUrl})` }}
      />
    )
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-xs font-bold text-stone-500">
      {getInitials(player.name) || player.position}
    </span>
  )
}

function TeamFlag({ team }: { team: Team | null }) {
  if (team?.flag_url) {
    return (
      <span
        title={team.name}
        className="h-4 w-6 shrink-0 rounded-sm bg-cover bg-center"
        style={{ backgroundImage: `url(${team.flag_url})` }}
      />
    )
  }
  return <span className="h-4 w-6 shrink-0 rounded-sm bg-stone-200" />
}

export default function LineupManager({
  leagueId,
  players: initialPlayers,
}: {
  leagueId: string
  players: LineupPlayer[]
}) {
  const [players, setPlayers] = useState(initialPlayers)
  const [openSwapFor, setOpenSwapFor] = useState<string | null>(null)
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()

  const pendingIds = useMemo(
    () => new Set(pendingSwaps.map(swap => swap.rosterId)),
    [pendingSwaps]
  )

  function swapCandidates(player: LineupPlayer): LineupPlayer[] {
    return players.filter(
      item =>
        item.position === player.position &&
        item.isStarting !== player.isStarting
    )
  }

  function handleSwap(a: LineupPlayer, b: LineupPlayer) {
    setPlayers(current =>
      current.map(item => {
        if (item.rosterId === a.rosterId) return { ...item, isStarting: b.isStarting }
        if (item.rosterId === b.rosterId) return { ...item, isStarting: a.isStarting }
        return item
      })
    )
    setPendingSwaps(prev => {
      const next = new Map(prev.map(swap => [swap.rosterId, swap.isStarting]))
      next.set(a.rosterId, b.isStarting)
      next.set(b.rosterId, a.isStarting)
      return Array.from(next, ([rosterId, isStarting]) => ({ rosterId, isStarting }))
    })
    setOpenSwapFor(null)
    setToast(null)
    setError(null)
  }

  function handleSave() {
    setToast(null)
    setError(null)

    startSaveTransition(async () => {
      const result = await saveLineup(leagueId, pendingSwaps)

      if (!result.ok) {
        setError(result.error ?? 'No se pudo guardar la alineación.')
        return
      }

      setPendingSwaps([])
      setToast('Alineación guardada.')
      window.setTimeout(() => setToast(null), 2500)
    })
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Alineación</h2>
        <p className="mt-1 text-sm text-stone-400">
          Usa «Cambiar» para intercambiar un titular por un suplente de la misma posición.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {SECTIONS.map(({ position, label }) => {
          const sectionPlayers = [
            ...players.filter(p => p.position === position && p.isStarting),
            ...players.filter(p => p.position === position && !p.isStarting),
          ]

          if (!sectionPlayers.length) return null

          return (
            <div key={position}>
              <div className="border-b border-stone-100 bg-stone-50 px-4 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {label}
                </h3>
              </div>

              <div className="divide-y divide-stone-50">
                {sectionPlayers.map(player => {
                  const candidates = swapCandidates(player)
                  const isOpen = openSwapFor === player.rosterId
                  const hasPendingChange = pendingIds.has(player.rosterId)

                  return (
                    <div key={player.rosterId}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 ${
                          hasPendingChange ? 'bg-amber-50/60' : ''
                        }`}
                      >
                        <PlayerAvatar player={player} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-stone-800">{player.name}</p>
                            {hasPendingChange && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Cambio pendiente" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-stone-400">
                            {player.team?.name ?? '—'}
                          </p>
                        </div>

                        <span className="hidden sm:block">
                          <TeamFlag team={player.team} />
                        </span>

                        <span className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold sm:inline-block ${POSITION_COLORS[player.position]}`}>
                          {player.position}
                        </span>

                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            player.isStarting
                              ? 'bg-green-50 text-[#006847]'
                              : 'bg-stone-100 text-stone-400'
                          }`}
                        >
                          {player.isStarting ? 'TIT' : 'SUP'}
                        </span>

                        <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums" style={{ color: '#006847' }}>
                          {formatPoints(player.totalPoints)}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setToast(null)
                            setError(null)
                            setOpenSwapFor(current => (current === player.rosterId ? null : player.rosterId))
                          }}
                          disabled={!candidates.length}
                          className={`shrink-0 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors sm:py-1.5 ${
                            isOpen
                              ? 'border-amber-300 bg-amber-50 text-amber-700'
                              : 'border-stone-300 text-stone-600 hover:border-stone-400 hover:bg-stone-50'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          {isOpen ? 'Cancelar' : 'Cambiar'}
                        </button>
                      </div>

                      {isOpen && (
                        <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-3">
                          <p className="mb-2 text-xs text-stone-400">
                            Cambiar a <span className="font-medium text-stone-700">{player.name}</span> por:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {candidates.map(candidate => (
                              <button
                                key={candidate.rosterId}
                                type="button"
                                onClick={() => handleSwap(player, candidate)}
                                className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-left transition-colors hover:border-[#006847]/30 hover:bg-green-50"
                              >
                                <PlayerAvatar player={candidate} />
                                <span className="min-w-0">
                                  <span className="block max-w-36 truncate text-xs font-medium text-stone-800">
                                    {candidate.name}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-stone-400">
                                    {candidate.isStarting ? 'TIT' : 'SUP'} · {formatPoints(candidate.totalPoints)} pts
                                  </span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {(toast || error) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-green-200 bg-green-50 text-[#006847]'
          }`}
        >
          {error ?? toast}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {pendingSwaps.length > 0 && (
          <span className="text-xs text-amber-600">
            {pendingSwaps.length} cambio{pendingSwaps.length === 1 ? '' : 's'} pendiente{pendingSwaps.length === 1 ? '' : 's'}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!pendingSwaps.length || isSaving}
          className="rounded-lg bg-[#006847] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#005539] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 sm:py-2"
        >
          {isSaving ? 'Guardando...' : 'Guardar Alineación'}
        </button>
      </div>
    </section>
  )
}
