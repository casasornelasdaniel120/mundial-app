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
  GK: 'bg-yellow-900/50 text-yellow-300',
  DEF: 'bg-blue-900/50 text-blue-300',
  MID: 'bg-green-900/50 text-green-300',
  FWD: 'bg-red-900/50 text-red-300',
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
        className="block h-10 w-10 shrink-0 rounded-full border border-gray-700/60 bg-gray-800 bg-cover bg-center"
        style={{ backgroundImage: `url(${player.photoUrl})` }}
      />
    )
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-700/60 bg-gray-800 text-xs font-bold text-gray-200">
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
  return <span className="h-4 w-6 shrink-0 rounded-sm bg-gray-700" />
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

  // Players of the same position on the opposite side (TIT ↔ SUP) — the only
  // valid swap targets for a given row.
  function swapCandidates(player: LineupPlayer): LineupPlayer[] {
    return players.filter(
      item =>
        item.position === player.position &&
        item.isStarting !== player.isStarting
    )
  }

  function handleSwap(a: LineupPlayer, b: LineupPlayer) {
    // Exchange is_starting values locally (optimistic)
    setPlayers(current =>
      current.map(item => {
        if (item.rosterId === a.rosterId) return { ...item, isStarting: b.isStarting }
        if (item.rosterId === b.rosterId) return { ...item, isStarting: a.isStarting }
        return item
      })
    )
    // Record both sides in the pending batch (latest value per rosterId wins)
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
        <h2 className="text-lg font-semibold text-white">Alineación</h2>
        <p className="mt-1 text-sm text-gray-500">
          Usa «Cambiar» para intercambiar un titular por un suplente de la misma posición.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-800/60 bg-gray-900/60">
        {SECTIONS.map(({ position, label }) => {
          const sectionPlayers = [
            ...players.filter(p => p.position === position && p.isStarting),
            ...players.filter(p => p.position === position && !p.isStarting),
          ]

          if (!sectionPlayers.length) return null

          return (
            <div key={position}>
              <div className="border-b border-gray-800/60 bg-gray-950/40 px-4 py-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {label}
                </h3>
              </div>

              <div className="divide-y divide-gray-800/40">
                {sectionPlayers.map(player => {
                  const candidates = swapCandidates(player)
                  const isOpen = openSwapFor === player.rosterId
                  const hasPendingChange = pendingIds.has(player.rosterId)

                  return (
                    <div key={player.rosterId}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 ${
                          hasPendingChange ? 'bg-yellow-950/20' : ''
                        }`}
                      >
                        <PlayerAvatar player={player} />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-white">{player.name}</p>
                            {hasPendingChange && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" title="Cambio pendiente" />
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-gray-500">
                            {player.team?.name ?? '—'}
                          </p>
                        </div>

                        {/* Flag + position badge are redundant at 390px: the team
                            name is printed under the player and rows are already
                            grouped by position. Hide both to give the name room. */}
                        <span className="hidden sm:block">
                          <TeamFlag team={player.team} />
                        </span>

                        <span className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold sm:inline-block ${POSITION_COLORS[player.position]}`}>
                          {player.position}
                        </span>

                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            player.isStarting
                              ? 'bg-green-900/60 text-green-300'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {player.isStarting ? 'TIT' : 'SUP'}
                        </span>

                        <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-green-400">
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
                              ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-300'
                              : 'border-gray-700/60 text-gray-300 hover:border-gray-500/60 hover:bg-gray-800/60'
                          } disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          {isOpen ? 'Cancelar' : 'Cambiar'}
                        </button>
                      </div>

                      {/* Inline swap panel: opposite-side players of the same position */}
                      {isOpen && (
                        <div className="border-t border-gray-800/50 bg-gray-950/50 px-4 py-3">
                          <p className="mb-2 text-xs text-gray-500">
                            Cambiar a <span className="font-medium text-gray-300">{player.name}</span> por:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {candidates.map(candidate => (
                              <button
                                key={candidate.rosterId}
                                type="button"
                                onClick={() => handleSwap(player, candidate)}
                                className="flex items-center gap-2 rounded-lg border border-gray-700/60 bg-gray-900/80 px-3 py-2 text-left transition-colors hover:border-green-600/60 hover:bg-green-950/30"
                              >
                                <PlayerAvatar player={candidate} />
                                <span className="min-w-0">
                                  <span className="block max-w-36 truncate text-xs font-medium text-white">
                                    {candidate.name}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-gray-500">
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
              ? 'border-red-900/60 bg-red-950/40 text-red-300'
              : 'border-green-900/60 bg-green-950/40 text-green-300'
          }`}
        >
          {error ?? toast}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {pendingSwaps.length > 0 && (
          <span className="text-xs text-yellow-300">
            {pendingSwaps.length} cambio{pendingSwaps.length === 1 ? '' : 's'} pendiente{pendingSwaps.length === 1 ? '' : 's'}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!pendingSwaps.length || isSaving}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none sm:py-2"
        >
          {isSaving ? 'Guardando...' : 'Guardar Alineación'}
        </button>
      </div>
    </section>
  )
}
