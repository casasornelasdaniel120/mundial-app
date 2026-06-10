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

type PitchSpot = {
  x: number
  y: number
}

const POSITION_COLORS: Record<Position, string> = {
  GK: 'bg-yellow-900/70 text-yellow-200',
  DEF: 'bg-blue-900/70 text-blue-200',
  MID: 'bg-green-900/70 text-green-200',
  FWD: 'bg-red-900/70 text-red-200',
}

const LINE_Y: Record<Position, number> = {
  FWD: 18,
  MID: 40,
  DEF: 62,
  GK: 84,
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function getLineSpots(players: LineupPlayer[], position: Position): Array<LineupPlayer & PitchSpot> {
  const line = players.filter(player => player.position === position)
  const gap = 100 / (line.length + 1)

  return line.map((player, index) => ({
    ...player,
    x: gap * (index + 1),
    y: LINE_Y[position],
  }))
}

function PlayerAvatar({ player, size = 'lg' }: { player: LineupPlayer; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-sm' : 'h-11 w-11 text-xs'

  if (player.photoUrl) {
    return (
      <span
        className={`${sizeClass} block rounded-full border border-white/20 bg-gray-800 bg-cover bg-center shadow-lg`}
        style={{ backgroundImage: `url(${player.photoUrl})` }}
      />
    )
  }

  return (
    <span className={`${sizeClass} flex items-center justify-center rounded-full border border-white/20 bg-gray-800 font-bold text-gray-200 shadow-lg`}>
      {getInitials(player.name) || player.position}
    </span>
  )
}

export default function LineupManager({
  leagueId,
  players: initialPlayers,
}: {
  leagueId: string
  players: LineupPlayer[]
}) {
  const [players, setPlayers] = useState(initialPlayers)
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null)
  const [pendingSwaps, setPendingSwaps] = useState<PendingSwap[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, startSaveTransition] = useTransition()

  const starters = useMemo(
    () => players.filter(player => player.isStarting),
    [players]
  )
  const bench = useMemo(
    () => players.filter(player => !player.isStarting),
    [players]
  )
  const selectedPlayer = starters.find(player => player.rosterId === selectedStarter) ?? null
  const positionedStarters = [
    ...getLineSpots(starters, 'FWD'),
    ...getLineSpots(starters, 'MID'),
    ...getLineSpots(starters, 'DEF'),
    ...getLineSpots(starters, 'GK'),
  ]

  function addPendingSwap(starterId: string, benchId: string) {
    setPendingSwaps(prev => {
      const next = new Map(prev.map(update => [update.rosterId, update.isStarting]))
      next.set(starterId, false)
      next.set(benchId, true)

      return Array.from(next, ([rosterId, isStarting]) => ({ rosterId, isStarting }))
    })
  }

  function handleStarterClick(player: LineupPlayer) {
    setToast(null)
    setError(null)
    setSelectedStarter(current => current === player.rosterId ? null : player.rosterId)
  }

  function handleBenchClick(player: LineupPlayer) {
    if (!selectedPlayer || selectedPlayer.position !== player.position) return

    setPlayers(current => current.map(item => {
      if (item.rosterId === selectedPlayer.rosterId) return { ...item, isStarting: false }
      if (item.rosterId === player.rosterId) return { ...item, isStarting: true }
      return item
    }))
    addPendingSwap(selectedPlayer.rosterId, player.rosterId)
    setSelectedStarter(null)
    setToast(null)
    setError(null)
  }

  function handleSave() {
    setToast(null)
    setError(null)

    startSaveTransition(async () => {
      const result = await saveLineup(leagueId, pendingSwaps)

      if (!result.ok) {
        setError(result.error ?? 'No se pudo guardar la alineacion.')
        return
      }

      setPendingSwaps([])
      setToast('Alineacion guardada.')
      window.setTimeout(() => setToast(null), 2500)
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Alineacion</h2>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona un titular y cambialo por un suplente de la misma posicion.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {pendingSwaps.length > 0 && (
            <span className="text-xs text-yellow-300">
              {pendingSwaps.length} cambio{pendingSwaps.length === 1 ? '' : 's'} pendiente{pendingSwaps.length === 1 ? '' : 's'}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!pendingSwaps.length || isSaving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-green-950 transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none"
          >
            {isSaving ? 'Guardando...' : 'Guardar Alineacion'}
          </button>
        </div>
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

      <div className="overflow-hidden rounded-2xl border border-green-900/50 bg-green-950/40">
        <div className="relative aspect-[4/5] min-h-[560px] w-full overflow-hidden bg-green-900 sm:aspect-[16/10] sm:min-h-[620px]">
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <rect width="100" height="100" fill="#0b5f36" />
            <path d="M0 0h100v100H0z" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.7" />
            <path d="M50 0v100" stroke="rgba(255,255,255,.18)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="0.5" />
            <circle cx="50" cy="50" r="1.2" fill="rgba(255,255,255,.35)" />
            <path d="M25 0v14h50V0" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="0.5" />
            <path d="M35 0v6h30V0" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="0.5" />
            <path d="M25 100V86h50v14" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="0.5" />
            <path d="M35 100v-6h30v6" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="0.5" />
            {Array.from({ length: 10 }).map((_, index) => (
              <rect
                key={index}
                x={index * 10}
                y="0"
                width="10"
                height="100"
                fill={index % 2 === 0 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.04)'}
              />
            ))}
          </svg>

          {positionedStarters.map(player => {
            const isSelected = selectedStarter === player.rosterId

            return (
              <button
                key={player.rosterId}
                type="button"
                onClick={() => handleStarterClick(player)}
                className="absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center transition-transform hover:scale-105"
                style={{ left: `${player.x}%`, top: `${player.y}%` }}
              >
                <span className={`rounded-full p-1 ${isSelected ? 'bg-yellow-300 shadow-lg shadow-yellow-950' : 'bg-black/25'}`}>
                  <PlayerAvatar player={player} />
                </span>
                <span className="max-w-24 truncate rounded bg-black/45 px-2 py-0.5 text-xs font-semibold text-white">
                  {player.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-800/60 bg-gray-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Banca</h3>
          {selectedPlayer && (
            <span className="text-xs text-yellow-300">
              Selecciona un {selectedPlayer.position}
            </span>
          )}
        </div>

        {bench.length ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {bench.map(player => {
              const isSelectable = Boolean(selectedPlayer && selectedPlayer.position === player.position)

              return (
                <button
                  key={player.rosterId}
                  type="button"
                  onClick={() => handleBenchClick(player)}
                  disabled={!isSelectable}
                  className={`flex min-w-36 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                    isSelectable
                      ? 'border-yellow-300 bg-yellow-300/10 text-white hover:bg-yellow-300/20'
                      : 'border-gray-800/60 bg-gray-950/40 text-gray-500'
                  }`}
                >
                  <PlayerAvatar player={player} size="sm" />
                  <div className="min-w-0">
                    <p className="max-w-28 truncate text-xs font-semibold">{player.name}</p>
                    <div className="mt-1 flex justify-center gap-1">
                      <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
                        SUP
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${POSITION_COLORS[player.position]}`}>
                        {player.position}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-800/70 p-4 text-sm text-gray-600">
            Todavia no hay suplentes en tu roster.
          </div>
        )}
      </div>
    </section>
  )
}
