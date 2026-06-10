'use client'

import React, {
  useState, useEffect, useRef,
  useTransition, useMemo, useCallback,
} from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { startDraft, makePick, autoPick } from './actions'
import { getPickUser } from '@/lib/draft/snake'
import type { IDraftSession, IDraftPick } from '@/types/db'

// ── Types ────────────────────────────────────────────────────
type PlayerWithTeam = {
  id: string
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  value: number
  api_football_id: number | null
  national_team_id: string
  national_teams: { name: string; flag_url: string | null } | null
}
type Member = { user_id: string; team_name: string | null }
type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'

interface Props {
  leagueId: string
  leagueName: string
  isAdmin: boolean
  initialSession: IDraftSession
  initialPicks: IDraftPick[]
  players: PlayerWithTeam[]
  leagueMembers: Member[]
  currentUserId: string
}

// ── Constants ────────────────────────────────────────────────
const ROSTER_LIMITS  = { GK: 2, DEF: 6, MID: 5, FWD: 6 } as const
const STARTING_SLOTS = { GK: 1, DEF: 4, MID: 3, FWD: 3 } as const
const POSITION_COLORS = {
  GK:  'bg-yellow-900/50 text-yellow-400',
  DEF: 'bg-blue-900/50 text-blue-400',
  MID: 'bg-green-900/50 text-green-400',
  FWD: 'bg-red-900/50 text-red-400',
}
const PAGE_SIZE = 50

// ── Memoised player card ─────────────────────────────────────
// Extracted so React.memo prevents re-renders from countdown ticks,
// picks from other users, or any state change not related to this card.
const PlayerCard = React.memo(function PlayerCard({
  player, isMyTurn, isPicking, onPick,
}: {
  player: PlayerWithTeam
  isMyTurn: boolean
  isPicking: boolean
  onPick: (id: string) => void
}) {
  return (
    <button
      onClick={() => onPick(player.id)}
      disabled={!isMyTurn || isPicking}
      className={`w-full flex items-center gap-3 px-3 py-2.5 border-b border-gray-800/30 text-left transition-colors
        ${isMyTurn && !isPicking
          ? 'hover:bg-green-950/30 cursor-pointer'
          : 'cursor-default opacity-80'
        }`}
    >
      {/* Flag */}
      <span className="shrink-0 w-7 h-5 flex items-center justify-center">
        {player.national_teams?.flag_url ? (
          <span
            className="w-7 h-5 rounded-sm bg-cover bg-center"
            style={{ backgroundImage: `url(${player.national_teams.flag_url})` }}
          />
        ) : (
          <span className="w-7 h-5 rounded-sm bg-gray-700" />
        )}
      </span>

      {/* Name + team */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate leading-tight">{player.name}</p>
        <p className="text-[11px] text-gray-500 truncate">{player.national_teams?.name ?? '—'}</p>
      </div>

      {/* Position badge */}
      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${POSITION_COLORS[player.position]}`}>
        {player.position}
      </span>

      {/* Value */}
      <span className="shrink-0 text-xs text-gray-500 tabular-nums">${player.value}M</span>

      {isMyTurn && <span className="shrink-0 text-green-500 text-xs">+</span>}
    </button>
  )
})

// ── Component ────────────────────────────────────────────────
export default function DraftRoom({
  leagueId, leagueName, isAdmin,
  initialSession, initialPicks,
  players, leagueMembers, currentUserId,
}: Props) {
  const [session,          setSession]          = useState<IDraftSession>(initialSession)
  const [picks,            setPicks]            = useState<IDraftPick[]>(initialPicks)
  // Separate Set for O(1) lookup and immediate optimistic removal from the available list.
  // Kept in sync independently of `picks` so the list updates the moment a pick is made —
  // not after the server round-trip or the Realtime event settles.
  const [pickedPlayerIds,  setPickedPlayerIds]  = useState<Set<string>>(
    () => new Set(initialPicks.map(p => p.player_id)),
  )
  const [posFilter,        setPosFilter]        = useState<PositionFilter>('ALL')
  const [search,           setSearch]           = useState('')
  const [visibleCount,     setVisibleCount]     = useState(PAGE_SIZE)
  const [countdown,        setCountdown]        = useState(60)

  const [isPicking,  startPickTransition] = useTransition()
  const [isStarting, startDraftTransition] = useTransition()
  const autoPickFiredFor = useRef(-1)

  const totalPicks = leagueMembers.length * 19
  const memberMap  = useMemo(
    () => new Map(leagueMembers.map(m => [m.user_id, m.team_name ?? 'Mi Equipo'])),
    [leagueMembers],
  )

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`draft-${session.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'draft_sessions', filter: `id=eq.${session.id}` },
        (payload) => setSession(payload.new as IDraftSession),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `draft_session_id=eq.${session.id}` },
        (payload) => {
          const incoming = payload.new as IDraftPick

          // Remove the player from the available list the moment the Realtime event
          // arrives — covers picks made by other users and confirms our own picks.
          setPickedPlayerIds(prev => {
            if (prev.has(incoming.player_id)) return prev          // already removed optimistically
            return new Set([...prev, incoming.player_id])
          })

          // Update picks for roster tracking; replace optimistic entry if present.
          setPicks(prev => {
            const without = prev.filter(
              x => !(x.draft_session_id === incoming.draft_session_id && x.pick_number === incoming.pick_number),
            )
            return [...without, incoming].sort((a, b) => a.pick_number - b.pick_number)
          })

          fetch('/api/draft/advance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draftSessionId: incoming.draft_session_id,
              pickNumber: incoming.pick_number,
            }),
          }).catch(() => {})
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [session.id])

  // ── Countdown ────────────────────────────────────────────
  useEffect(() => {
    if (session.status !== 'active' || !session.pick_deadline) {
      return
    }
    const tick = () => {
      const secs = Math.max(0, Math.ceil(
        (new Date(session.pick_deadline!).getTime() - Date.now()) / 1000,
      ))
      setCountdown(secs)
      return secs
    }
    const firstTick = setTimeout(tick, 0)
    const id = setInterval(tick, 500)
    return () => {
      clearTimeout(firstTick)
      clearInterval(id)
    }
  }, [session.pick_deadline, session.status])

  // ── Auto-pick on timeout ─────────────────────────────────
  useEffect(() => {
    if (countdown === 0 && session.status === 'active') {
      if (autoPickFiredFor.current !== session.current_pick_number) {
        autoPickFiredFor.current = session.current_pick_number
        startPickTransition(async () => { await autoPick(session.id) })
      }
    }
  }, [countdown, session.status, session.current_pick_number, session.id])

  // ── Derived state ─────────────────────────────────────────
  const myPicks  = useMemo(() => picks.filter(p => p.user_id === currentUserId), [picks, currentUserId])
  const isMyTurn = session.status === 'active' && session.current_user_id === currentUserId

  const availablePlayers = useMemo(() => {
    const q = search.toLowerCase()
    return players.filter(p => {
      // Use the dedicated pickedPlayerIds set — updated immediately on pick click
      // and on every Realtime INSERT, so this list is never stale.
      if (pickedPlayerIds.has(p.id)) return false
      if (posFilter !== 'ALL' && p.position !== posFilter) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.national_teams?.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [players, pickedPlayerIds, posFilter, search])

  // Only the visible slice — the rest are not mounted
  const visiblePlayers = useMemo(
    () => availablePlayers.slice(0, visibleCount),
    [availablePlayers, visibleCount],
  )
  const hasMore = visibleCount < availablePlayers.length

  // Roster grouped by position, sorted by pick_number so slot order is stable
  const myRoster = useMemo(() => {
    const playerMap = new Map(players.map(p => [p.id, p]))
    const by: Record<string, PlayerWithTeam[]> = { GK: [], DEF: [], MID: [], FWD: [] }
    const sorted = [...myPicks].sort((a, b) => a.pick_number - b.pick_number)
    for (const pick of sorted) {
      const player = playerMap.get(pick.player_id)
      if (player) by[player.position].push(player)
    }
    return by as Record<'GK' | 'DEF' | 'MID' | 'FWD', PlayerWithTeam[]>
  }, [myPicks, players])

  const upcomingPicks = useMemo(() => {
    const result = []
    for (
      let p = session.current_pick_number;
      p < Math.min(session.current_pick_number + 12, totalPicks + 1);
      p++
    ) {
      result.push({ pickNumber: p, userId: getPickUser(session.snake_order, p) })
    }
    return result
  }, [session.current_pick_number, session.snake_order, totalPicks])

  // ── Handlers ─────────────────────────────────────────────
  const handlePositionFilter = (position: PositionFilter) => {
    setPosFilter(position)
    setVisibleCount(PAGE_SIZE)
  }

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
    setVisibleCount(PAGE_SIZE)
  }

  // Stable reference so PlayerCard.memo comparison stays valid across countdown ticks.
  const handlePick = useCallback((playerId: string) => {
    if (!isMyTurn || isPicking) return

    // ── Optimistic player-list update ──────────────────────
    // Remove the player from the available list RIGHT NOW — before the
    // server action even starts. This is the earliest possible moment.
    setPickedPlayerIds(prev => new Set([...prev, playerId]))

    // Snapshot values used inside the async transition.
    const pickNumber = session.current_pick_number
    const sessionId  = session.id

    startPickTransition(async () => {
      const result = await makePick(sessionId, playerId)

      if (result?.error) {
        // Server rejected the pick — put the player back in the list.
        setPickedPlayerIds(prev => {
          const next = new Set(prev)
          next.delete(playerId)
          return next
        })
      } else {
        // Push an optimistic picks entry so the roster panel updates without
        // waiting for the Realtime round-trip. The Realtime INSERT handler
        // will replace it (same draft_session_id + pick_number) with the real row.
        setPicks(prev => {
          if (prev.some(x => x.draft_session_id === sessionId && x.pick_number === pickNumber)) {
            return prev // Realtime already arrived — nothing to do
          }
          return [
            ...prev,
            {
              id:               `optimistic-${sessionId}-${pickNumber}`,
              draft_session_id: sessionId,
              pick_number:      pickNumber,
              user_id:          currentUserId,
              player_id:        playerId,
              picked_at:        new Date().toISOString(),
            } satisfies IDraftPick,
          ].sort((a, b) => a.pick_number - b.pick_number)
        })
      }
    })
  }, [isMyTurn, isPicking, session.current_pick_number, session.id, currentUserId])

  const handleStartDraft = () => {
    startDraftTransition(async () => { await startDraft(session.id) })
  }

  // ── Waiting room ──────────────────────────────────────────
  if (session.status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-1">{leagueName}</p>
          <h1 className="text-3xl font-bold text-white mb-2">Sala de Espera</h1>
          <p className="text-gray-400">El draft comenzará cuando el administrador lo inicie.</p>
        </div>

        <div className="w-full max-w-xs rounded-2xl border border-gray-800/60 bg-gray-900/60 p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Orden del Draft</h2>
          <div className="space-y-2">
            {session.snake_order.map((uid, i) => (
              <div key={uid} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-green-400">{i + 1}</span>
                <span className={`text-sm ${uid === currentUserId ? 'text-white font-semibold' : 'text-gray-400'}`}>
                  {memberMap.get(uid) ?? 'Mi Equipo'}
                  {uid === currentUserId && <span className="ml-1.5 text-xs text-green-500">(tú)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={handleStartDraft}
            disabled={isStarting}
            className="rounded-xl bg-green-600 px-8 py-3 text-base font-semibold text-white hover:bg-green-500 disabled:opacity-60 transition-colors shadow-lg shadow-green-950"
          >
            {isStarting ? 'Iniciando…' : '🚀 Comenzar Draft'}
          </button>
        ) : (
          <p className="text-sm text-gray-500 animate-pulse">Esperando al administrador…</p>
        )}
      </div>
    )
  }

  // ── Completed ─────────────────────────────────────────────
  if (session.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-white mb-2">¡Draft Completado!</h1>
          <p className="text-gray-400">Todos los equipos han sido armados.</p>
        </div>
        <Link
          href={`/leagues/${leagueId}`}
          className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-500 transition-colors"
        >
          Ver Clasificación →
        </Link>
      </div>
    )
  }

  // ── Active draft room ─────────────────────────────────────
  return (
    <div className="-mx-4 -my-8 sm:-mx-6 flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/80">
        <div className="flex items-center gap-3">
          <Link href={`/leagues/${leagueId}`} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← {leagueName}
          </Link>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-500">
            Pick <span className="text-white font-semibold">{session.current_pick_number}</span> / {totalPicks}
          </span>
        </div>
        <span className="text-xs text-gray-500">{picks.length} picks completados</span>
      </div>

      {/* 3-column area */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: '1fr 230px 210px' }}>

        {/* ── LEFT: Available Players ───────────────── */}
        <div className="flex flex-col border-r border-gray-800/60 overflow-hidden">
          {/* Filters */}
          <div className="shrink-0 p-3 space-y-2 border-b border-gray-800/60">
            <div className="flex gap-1">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as PositionFilter[]).map(pos => (
                <button
                  key={pos}
                  onClick={() => handlePositionFilter(pos)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                    posFilter === pos
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar jugador o selección…"
              value={search}
              onChange={handleSearchChange}
              className="w-full rounded-lg border border-gray-700/60 bg-gray-950/80 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-green-500 focus:outline-none"
            />
            <p className="text-[10px] text-gray-600">
              {availablePlayers.length} disponibles
              {availablePlayers.length > visibleCount && ` · mostrando ${visibleCount}`}
            </p>
          </div>

          {/* Player list — only visiblePlayers are mounted */}
          <div className="flex-1 overflow-y-auto">
            {availablePlayers.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-600">Sin jugadores disponibles</div>
            ) : (
              <>
                {visiblePlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isMyTurn={isMyTurn}
                    isPicking={isPicking}
                    onPick={handlePick}
                  />
                ))}

                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="w-full py-3 text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-800/30 transition-colors border-t border-gray-800/40"
                  >
                    Cargar más ({availablePlayers.length - visibleCount} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Pick Indicator ────────────────── */}
        <div className="flex flex-col items-center justify-center gap-5 p-4 border-r border-gray-800/60">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Turno actual</p>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-2 ${
              isMyTurn ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'
            }`}>
              {(memberMap.get(session.current_user_id ?? '') ?? '?').charAt(0).toUpperCase()}
            </div>
            <p className={`text-sm font-semibold ${isMyTurn ? 'text-green-400' : 'text-white'}`}>
              {isMyTurn ? '¡Tu turno!' : memberMap.get(session.current_user_id ?? '') ?? '—'}
            </p>
            {isMyTurn && <p className="text-xs text-green-500 mt-0.5">Selecciona un jugador</p>}
          </div>

          {/* Countdown ring */}
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
              <circle cx="48" cy="48" r="40" fill="none" stroke="#1f2937" strokeWidth="8" />
              <circle
                cx="48" cy="48" r="40"
                fill="none"
                stroke={countdown <= 10 ? '#ef4444' : countdown <= 20 ? '#f59e0b' : '#16a34a'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - countdown / 60)}`}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold tabular-nums ${
                countdown <= 10 ? 'text-red-400' : countdown <= 20 ? 'text-yellow-400' : 'text-white'
              }`}>{countdown}</span>
              <span className="text-[10px] text-gray-500">seg</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-white tabular-nums">#{session.current_pick_number}</p>
            <p className="text-xs text-gray-500">de {totalPicks} picks</p>
          </div>

          <div className="w-full">
            <div className="h-1.5 rounded-full bg-gray-800">
              <div
                className="h-1.5 rounded-full bg-green-600 transition-all duration-300"
                style={{ width: `${((session.current_pick_number - 1) / totalPicks) * 100}%` }}
              />
            </div>
            <p className="text-center text-[10px] text-gray-600 mt-1">
              {Math.round(((session.current_pick_number - 1) / totalPicks) * 100)}% completado
            </p>
          </div>
        </div>

        {/* ── RIGHT: Snake Order Queue ──────────────── */}
        <div className="flex flex-col overflow-hidden">
          <div className="shrink-0 px-3 py-2.5 border-b border-gray-800/60">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximas selecciones</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {upcomingPicks.map(({ pickNumber, userId }, idx) => {
              const isCurrentPick = pickNumber === session.current_pick_number
              const isMe = userId === currentUserId
              return (
                <div
                  key={pickNumber}
                  className={`flex items-center gap-2.5 px-3 py-2 border-b border-gray-800/20 ${isCurrentPick ? 'bg-green-950/30' : ''}`}
                >
                  <span className={`text-xs tabular-nums w-6 text-right ${isCurrentPick ? 'text-green-400 font-bold' : 'text-gray-600'}`}>
                    {pickNumber}
                  </span>
                  <span className={`text-xs truncate flex-1 ${
                    isCurrentPick
                      ? (isMe ? 'text-green-400 font-semibold' : 'text-white font-semibold')
                      : isMe ? 'text-green-500/70' : 'text-gray-500'
                  }`}>
                    {memberMap.get(userId) ?? '—'}
                    {isMe && <span className="ml-1 text-[10px] opacity-60">(tú)</span>}
                  </span>
                  {isCurrentPick && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                  {idx > 0 && !isCurrentPick && (
                    <span className="text-[10px] text-gray-700 shrink-0">+{pickNumber - session.current_pick_number}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── BOTTOM: My Roster ──────────────────────── */}
      <div className="shrink-0 border-t border-gray-800/60 bg-gray-900/80 px-4 py-3">
        <div className="flex items-center gap-4 overflow-x-auto">
          <p className="shrink-0 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Mi Equipo <span className="text-white">{myPicks.length}</span>/19
          </p>

          {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => {
            const slots   = ROSTER_LIMITS[pos]
            const starting = STARTING_SLOTS[pos]
            const filled   = myRoster[pos] ?? []

            return (
              <div key={pos} className="shrink-0 flex items-end gap-1.5">
                <span className={`text-[10px] font-bold mr-0.5 self-center ${POSITION_COLORS[pos].split(' ')[1]}`}>
                  {pos}
                </span>
                {Array.from({ length: slots }).map((_, i) => {
                  const player  = filled[i]
                  const isBench = i >= starting
                  return (
                    <div
                      key={i}
                      title={player?.name}
                      className={`w-14 h-12 rounded-md border text-[10px] flex flex-col items-center justify-center text-center px-0.5 transition-colors ${
                        player
                          ? isBench
                            ? 'border-gray-700/60 bg-gray-800/60 text-gray-400'
                            : 'border-green-700/50 bg-green-950/40 text-white'
                          : 'border-gray-700/30 border-dashed bg-transparent text-gray-700'
                      }`}
                    >
                      {player ? (
                        <>
                          <span className="leading-tight line-clamp-2 w-full text-center">
                            {player.name.split(' ').slice(-1)[0]}
                          </span>
                          <span className="text-[9px] opacity-50 mt-0.5">{isBench ? 'SUP' : 'TIT'}</span>
                        </>
                      ) : (
                        <span className="text-lg opacity-30">—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
