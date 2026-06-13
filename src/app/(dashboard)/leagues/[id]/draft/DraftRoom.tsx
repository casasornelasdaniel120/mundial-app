'use client'

import React, {
  useState, useEffect, useRef,
  useTransition, useMemo, useCallback,
} from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { startDraft, makePick } from './actions'
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
const POS_BORDER = {
  GK:  'border-l-yellow-500/70',
  DEF: 'border-l-blue-500/70',
  MID: 'border-l-emerald-500/70',
  FWD: 'border-l-red-500/70',
}
const POS_BADGE = {
  GK:  'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
  DEF: 'text-blue-400 border-blue-500/40 bg-blue-500/10',
  MID: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  FWD: 'text-red-400 border-red-500/40 bg-red-500/10',
}
const POS_SLOT = {
  GK:  { on: 'border-yellow-700/50 bg-yellow-950/30 text-yellow-50',  off: 'border-yellow-900/30 bg-yellow-950/10 text-yellow-500/50' },
  DEF: { on: 'border-blue-700/50 bg-blue-950/30 text-blue-50',        off: 'border-blue-900/30 bg-blue-950/10 text-blue-500/50' },
  MID: { on: 'border-emerald-700/50 bg-emerald-950/30 text-emerald-50', off: 'border-emerald-900/30 bg-emerald-950/10 text-emerald-500/50' },
  FWD: { on: 'border-red-700/50 bg-red-950/30 text-red-50',           off: 'border-red-900/30 bg-red-950/10 text-red-500/50' },
}
const POS_LABEL = {
  GK: 'text-yellow-500', DEF: 'text-blue-500', MID: 'text-emerald-500', FWD: 'text-red-500',
}
const PAGE_SIZE = 50

// Custom CSS injected once — animations + thin scrollbar
const DRAFT_CSS = `
  @keyframes turnGlow {
    0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,.45), 0 0 18px rgba(34,197,94,.1); }
    50%      { box-shadow: 0 0 0 9px rgba(34,197,94,0),  0 0 36px rgba(34,197,94,.2); }
  }
  @keyframes urgentBlink {
    0%,100% { opacity:1; }
    50%      { opacity:.45; }
  }
  .dr-turn-glow   { animation: turnGlow 2s ease-in-out infinite; }
  .dr-urgent      { animation: urgentBlink .75s ease-in-out infinite; }
  .dr-scroll::-webkit-scrollbar        { width: 3px; }
  .dr-scroll::-webkit-scrollbar-track  { background: transparent; }
  .dr-scroll::-webkit-scrollbar-thumb  { background: #1f2937; border-radius: 3px; }
`

// ── Player card ──────────────────────────────────────────────
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
      className={[
        'group w-full flex items-center gap-3 px-3 py-[9px]',
        'border-b border-gray-800/20 border-l-[3px] text-left',
        'transition-all duration-100',
        POS_BORDER[player.position],
        isMyTurn && !isPicking
          ? 'hover:bg-green-950/30 hover:pl-[14px] cursor-pointer'
          : 'cursor-default',
      ].join(' ')}
    >
      {/* Flag */}
      <div className="shrink-0 w-8 h-[21px] rounded-[3px] overflow-hidden bg-gray-800/80 ring-1 ring-white/5">
        {player.national_teams?.flag_url
          ? <img src={player.national_teams.flag_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gray-700/50" />}
      </div>

      {/* Name + country */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-gray-100 truncate leading-tight">{player.name}</p>
        <p className="text-[10px] text-gray-600 truncate mt-[1px]">{player.national_teams?.name ?? '—'}</p>
      </div>

      {/* Position badge */}
      <span className={`shrink-0 rounded-[3px] border px-[5px] py-[2px] text-[9px] font-bold tracking-widest ${POS_BADGE[player.position]}`}>
        {player.position}
      </span>

      {/* Action / value */}
      {isMyTurn ? (
        <span className="shrink-0 w-[18px] h-[18px] rounded-full bg-green-600 flex items-center justify-center text-white text-[11px] font-black">+</span>
      ) : (
        <span className="shrink-0 text-[10px] text-gray-700 font-mono tabular-nums">{player.value}M</span>
      )}
    </button>
  )
})

// ── Component ────────────────────────────────────────────────
export default function DraftRoom({
  leagueId, leagueName, isAdmin,
  initialSession, initialPicks,
  players, leagueMembers, currentUserId,
}: Props) {
  const [session,         setSession]         = useState<IDraftSession>(initialSession)
  const [picks,           setPicks]           = useState<IDraftPick[]>(initialPicks)
  const [pickedPlayerIds, setPickedPlayerIds] = useState<Set<string>>(
    () => new Set(initialPicks.map(p => p.player_id)),
  )
  const [posFilter,    setPosFilter]    = useState<PositionFilter>('ALL')
  const [search,       setSearch]       = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [countdown,    setCountdown]    = useState(60)
  const [mobileTab,    setMobileTab]    = useState<'players' | 'queue'>('players')

  const [isPicking,  startPickTransition]  = useTransition()
  const [isStarting, startDraftTransition] = useTransition()
  const autoPickFiredFor = useRef(-1)

  const [authUserId, setAuthUserId] = useState<string | null>(currentUserId)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      console.log(
        `[DraftRoom] client auth check — supabase.auth user=${data.user?.id} | server prop=${currentUserId} | match=${data.user?.id === currentUserId}`
      )
      if (data.user) setAuthUserId(data.user.id)
    })
  }, [currentUserId])

  const [isConnected, setIsConnected] = useState(true)
  const hadDisconnectRef = useRef(false)

  const resyncFromServer = useCallback(async () => {
    const supabase = createClient()
    console.log('[DraftRoom] resync — fetching fresh session and picks from server')

    const [sessionRes, picksRes] = await Promise.all([
      supabase.from('draft_sessions').select('*').eq('id', initialSession.id).single(),
      supabase
        .from('draft_picks')
        .select('*')
        .eq('draft_session_id', initialSession.id)
        .order('pick_number', { ascending: true }),
    ])

    if (sessionRes.data) {
      const fresh = sessionRes.data as IDraftSession
      setSession(fresh)
      const secs = fresh.pick_deadline
        ? Math.max(0, Math.floor((new Date(fresh.pick_deadline).getTime() - Date.now()) / 1000))
        : 0
      setCountdown(secs)
      console.log(
        `[DraftRoom] resync — session at pick ${fresh.current_pick_number} (user ${fresh.current_user_id}), ${secs}s remaining`
      )
    } else {
      console.log(`[DraftRoom] resync — session fetch failed: ${sessionRes.error?.message}`)
    }

    if (picksRes.data) {
      const freshPicks = picksRes.data as IDraftPick[]
      setPicks(prev => {
        if (prev.length !== freshPicks.length) {
          console.log(
            `[DraftRoom] resync — picks out of sync (local=${prev.length}, server=${freshPicks.length}); recovered ${freshPicks.length - prev.length} missed pick(s)`
          )
        }
        return freshPicks
      })
      setPickedPlayerIds(new Set(freshPicks.map(p => p.player_id)))
    } else {
      console.log(`[DraftRoom] resync — picks fetch failed: ${picksRes.error?.message}`)
    }

    fetch('/api/draft/autopick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: initialSession.id }),
    })
      .then(r => r.json())
      .then(json => console.log('[DraftRoom] resync autopick check:', json))
      .catch(err => console.log('[DraftRoom] resync autopick check failed:', err))
  }, [initialSession.id])

  const totalPicks = leagueMembers.length * 19
  const memberMap  = useMemo(
    () => new Map(leagueMembers.map(m => [m.user_id, m.team_name ?? 'Mi Equipo'])),
    [leagueMembers],
  )

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let cancelled = false

    const setup = async () => {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (authSession) {
        supabase.realtime.setAuth(authSession.access_token)
        console.log('[DraftRoom] realtime auth token set from user session')
      } else {
        console.log('[DraftRoom] WARNING — no auth session; RLS will filter out all Realtime events')
      }
      if (cancelled) return

      channel = supabase
        .channel(`draft-${session.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'draft_sessions', filter: `id=eq.${session.id}` },
          (payload) => {
            const next = payload.new as IDraftSession
            console.log(
              `[DraftRoom] realtime draft_sessions UPDATE — pick ${next.current_pick_number}, user ${next.current_user_id}, status ${next.status}`
            )
            setSession(next)
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `draft_session_id=eq.${session.id}` },
          (payload) => {
            const incoming = payload.new as IDraftPick
            console.log(
              `[DraftRoom] realtime draft_picks INSERT — pick ${incoming.pick_number} by ${incoming.user_id}`
            )
            setPickedPlayerIds(prev => {
              if (prev.has(incoming.player_id)) return prev
              return new Set([...prev, incoming.player_id])
            })
            setPicks(prev => {
              const without = prev.filter(
                x => !(x.draft_session_id === incoming.draft_session_id && x.pick_number === incoming.pick_number),
              )
              return [...without, incoming].sort((a, b) => a.pick_number - b.pick_number)
            })
            console.log(`[DraftRoom] calling /api/draft/advance (fallback) for pick ${incoming.pick_number}`)
            fetch('/api/draft/advance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: incoming.draft_session_id,
                pickNumber: incoming.pick_number,
              }),
            })
              .then(r => r.json())
              .then(json => console.log('[DraftRoom] fallback advance response:', json))
              .catch(err => console.log('[DraftRoom] fallback advance failed:', err))
          },
        )
        .subscribe((status, err) => {
          console.log('[DraftRoom] channel status:', status, err ?? '')
          if (cancelled) return

          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            hadDisconnectRef.current = true
            setIsConnected(false)
          } else if (status === 'SUBSCRIBED') {
            if (hadDisconnectRef.current) {
              hadDisconnectRef.current = false
              console.log('[DraftRoom] reconnected after drop — resyncing missed state')
              resyncFromServer()
            }
            setIsConnected(true)
          }
        })
    }

    setup()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [session.id, resyncFromServer])

  // ── Countdown ────────────────────────────────────────────
  useEffect(() => {
    if (session.status !== 'active' || !session.pick_deadline) return
    const tick = () => {
      const secs = Math.max(0, Math.ceil(
        (new Date(session.pick_deadline!).getTime() - Date.now()) / 1000,
      ))
      setCountdown(secs)
      return secs
    }
    const firstTick = setTimeout(tick, 0)
    const id = setInterval(tick, 500)
    return () => { clearTimeout(firstTick); clearInterval(id) }
  }, [session.pick_deadline, session.status])

  useEffect(() => {
    const secs = session.pick_deadline
      ? Math.max(0, Math.floor((new Date(session.pick_deadline).getTime() - Date.now()) / 1000))
      : 60
    console.log(`[DraftRoom] turn/deadline changed → pick ${session.current_pick_number}, countdown synced to ${secs}s`)
    setCountdown(secs)
  }, [session.current_pick_number, session.pick_deadline])

  // ── Auto-pick on timeout ─────────────────────────────────
  useEffect(() => {
    if (countdown !== 0 || session.status !== 'active') return
    if (autoPickFiredFor.current === session.current_pick_number) return

    const isMyTurnNow = session.current_user_id === authUserId

    if (isMyTurnNow) {
      autoPickFiredFor.current = session.current_pick_number
      console.log(
        `[DraftRoom] countdown hit 0 on MY turn — calling /api/draft/autopick for pick ${session.current_pick_number}`
      )
      fetch('/api/draft/autopick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          userId: session.current_user_id,
          pickNumber: session.current_pick_number,
        }),
      })
        .then(r => r.json())
        .then(json => console.log('[DraftRoom] autopick response:', json))
        .catch(err => console.log('[DraftRoom] autopick failed:', err))
      return
    }

    console.log(
      `[DraftRoom] countdown hit 0 (not my turn) — scheduling safety fallback in 3s for pick ${session.current_pick_number}`
    )
    const fallback = setTimeout(() => {
      autoPickFiredFor.current = session.current_pick_number
      console.log(
        `[DraftRoom] safety fallback firing — POST /api/draft/advance for pick ${session.current_pick_number}`
      )
      fetch('/api/draft/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, pickNumber: session.current_pick_number }),
      })
        .then(r => r.json())
        .then(json => console.log('[DraftRoom] safety fallback response:', json))
        .catch(err => console.log('[DraftRoom] safety fallback failed:', err))
    }, 3000)

    return () => clearTimeout(fallback)
  }, [countdown, session.status, session.current_pick_number, session.current_user_id, session.id, authUserId])

  // ── Derived state ─────────────────────────────────────────
  const myPicks  = useMemo(() => picks.filter(p => p.user_id === authUserId), [picks, authUserId])
  const isMyTurn = session.status === 'active' && session.current_user_id === authUserId

  useEffect(() => {
    if (isMyTurn) setMobileTab('players')
  }, [isMyTurn])

  console.log(
    `[DraftRoom] render — session.current_user_id=${session.current_user_id} | authUserId=${authUserId} | isMyTurn=${isMyTurn}`
  )

  const availablePlayers = useMemo(() => {
    const q = search.toLowerCase()
    return players.filter(p => {
      if (pickedPlayerIds.has(p.id)) return false
      if (posFilter !== 'ALL' && p.position !== posFilter) return false
      if (q && !p.name.toLowerCase().includes(q) && !p.national_teams?.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [players, pickedPlayerIds, posFilter, search])

  const visiblePlayers = useMemo(
    () => availablePlayers.slice(0, visibleCount),
    [availablePlayers, visibleCount],
  )
  const hasMore = visibleCount < availablePlayers.length

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
    console.log(
      `[DraftRoom] queue recalculated — window ${result[0]?.pickNumber ?? '-'}…${result[result.length - 1]?.pickNumber ?? '-'} (anchored at current_pick_number=${session.current_pick_number})`
    )
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

  const handlePick = useCallback((playerId: string) => {
    if (!isMyTurn || isPicking || !authUserId || !isConnected) {
      console.log(
        `[DraftRoom] handlePick BLOCKED — isMyTurn=${isMyTurn} isPicking=${isPicking} authUserId=${authUserId} isConnected=${isConnected}`
      )
      return
    }

    setPickedPlayerIds(prev => new Set([...prev, playerId]))

    const pickNumber = session.current_pick_number
    const sessionId  = session.id

    startPickTransition(async () => {
      console.log(`[DraftRoom] makePick — pick ${pickNumber}, player ${playerId}`)
      const result = await makePick(sessionId, playerId)

      if (result?.error) {
        console.log(`[DraftRoom] makePick FAILED: ${result.error}`)
        setPickedPlayerIds(prev => {
          const next = new Set(prev)
          next.delete(playerId)
          return next
        })
      } else {
        console.log(`[DraftRoom] makePick OK — pick ${pickNumber} saved`)
        setPicks(prev => {
          if (prev.some(x => x.draft_session_id === sessionId && x.pick_number === pickNumber)) {
            return prev
          }
          return [
            ...prev,
            {
              id:               `optimistic-${sessionId}-${pickNumber}`,
              draft_session_id: sessionId,
              pick_number:      pickNumber,
              user_id:          authUserId,
              player_id:        playerId,
              picked_at:        new Date().toISOString(),
            } satisfies IDraftPick,
          ].sort((a, b) => a.pick_number - b.pick_number)
        })

        console.log(`[DraftRoom] calling /api/draft/advance (immediate) for pick ${pickNumber}`)
        fetch('/api/draft/advance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, pickNumber }),
        })
          .then(r => r.json())
          .then(json => console.log('[DraftRoom] immediate advance response:', json))
          .catch(err => console.log('[DraftRoom] immediate advance failed:', err))
      }
    })
  }, [isMyTurn, isPicking, session.current_pick_number, session.id, authUserId, isConnected])

  const handleStartDraft = () => {
    startDraftTransition(async () => {
      const result = await startDraft(session.id)
      if (!result?.error) {
        // Realtime handles other clients; update local state immediately
        // so the admin doesn't have to wait for the Realtime round-trip.
        const supabase = createClient()
        const { data } = await supabase
          .from('draft_sessions')
          .select('*')
          .eq('id', session.id)
          .single()
        if (data) setSession(data as IDraftSession)
      }
    })
  }

  // ── Waiting room ──────────────────────────────────────────
  if (session.status === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
        <style>{DRAFT_CSS}</style>

        {/* Header */}
        <div className="text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-green-500 mb-2">{leagueName}</p>
          <h1 className="text-5xl font-black tracking-tight text-white uppercase leading-none">Draft</h1>
          <p className="text-sm text-gray-600 mt-3">El administrador iniciará el draft en breve</p>
        </div>

        {/* Snake order */}
        <div className="w-full max-w-[280px] rounded-xl border border-gray-800/60 bg-gray-900/40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-800/60 flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-gray-600">Orden del Draft</span>
            <span className="text-[9px] text-gray-700 font-mono">Ronda 1 →</span>
          </div>
          <div className="divide-y divide-gray-800/30">
            {session.snake_order.map((uid, i) => {
              const isMe = uid === authUserId
              return (
                <div key={uid} className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-green-950/20' : ''}`}>
                  <span className={`font-mono text-sm font-bold w-5 text-right tabular-nums ${isMe ? 'text-green-400' : 'text-gray-700'}`}>
                    {i + 1}
                  </span>
                  <div className={`w-[3px] h-4 rounded-full ${isMe ? 'bg-green-500' : 'bg-gray-800'}`} />
                  <span className={`text-sm flex-1 ${isMe ? 'text-white font-semibold' : 'text-gray-400'}`}>
                    {memberMap.get(uid) ?? 'Mi Equipo'}
                  </span>
                  {isMe && <span className="text-[9px] font-bold tracking-wider uppercase text-green-600">tú</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        {isAdmin ? (
          <button
            onClick={handleStartDraft}
            disabled={isStarting}
            className="px-10 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide uppercase transition-all shadow-lg shadow-green-950/60 active:scale-95"
          >
            {isStarting ? 'Iniciando…' : 'Comenzar Draft'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
            Esperando al administrador
          </div>
        )}
      </div>
    )
  }

  // ── Completed ─────────────────────────────────────────────
  if (session.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-green-950/60 border border-green-800/40 flex items-center justify-center text-3xl mx-auto">
            🏆
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-green-500 mb-1">Mundial 2026</p>
            <h1 className="text-4xl font-black tracking-tight text-white uppercase leading-tight">
              Draft<br/>Completado
            </h1>
          </div>
          <p className="text-sm text-gray-500">Todos los equipos han sido armados</p>
        </div>
        <Link
          href={`/leagues/${leagueId}`}
          className="px-7 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm tracking-wide uppercase transition-all shadow-lg shadow-green-950/60"
        >
          Ver Clasificación →
        </Link>
      </div>
    )
  }

  // ── Active draft room ─────────────────────────────────────
  const circumference = 2 * Math.PI * 40
  const timerStroke   = countdown <= 10 ? '#ef4444' : countdown <= 20 ? '#f59e0b' : '#16a34a'

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 flex h-[calc(100dvh-3.5rem)] flex-col">
      <style>{DRAFT_CSS}</style>

      {/* Connection-loss banner */}
      {!isConnected && (
        <div className="shrink-0 bg-red-700/90 border-b border-red-600/40 px-4 py-1.5 text-center text-[11px] font-bold text-white tracking-widest uppercase">
          ⚡ Conexión perdida — reconectando…
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-800/60 bg-gray-900/90 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/leagues/${leagueId}`}
            className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-300 transition-colors shrink-0"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {leagueName}
          </Link>
          <span className="w-px h-3 bg-gray-800 shrink-0" />
          <span className="text-[11px] text-gray-600 font-mono tabular-nums shrink-0">
            PICK <span className="text-white font-bold">{session.current_pick_number}</span>
            <span className="text-gray-700">/{totalPicks}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[11px] text-gray-700 font-mono tabular-nums">{picks.length} picks</span>
        </div>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="sticky top-0 z-10 flex shrink-0 border-b border-gray-800/60 bg-gray-950/95 backdrop-blur-sm md:hidden">
        {(['players', 'queue'] as const).map(key => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={`flex-1 py-3 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors border-b-2 ${
              mobileTab === key
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {key === 'players' ? 'Jugadores' : 'Turno'}
          </button>
        ))}
      </div>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 flex-col overflow-hidden md:grid md:[grid-template-columns:1fr_220px_200px]">

        {/* ── LEFT: Available players ── */}
        <div className={`${mobileTab === 'players' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-hidden border-gray-800/60 md:flex md:border-r`}>
          {/* Filters */}
          <div className="shrink-0 p-2.5 space-y-2 border-b border-gray-800/60">
            <div className="flex gap-1">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as PositionFilter[]).map(pos => (
                <button
                  key={pos}
                  onClick={() => handlePositionFilter(pos)}
                  className={`flex-1 rounded-md py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all md:py-1.5 ${
                    posFilter === pos
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:text-gray-300 hover:bg-gray-800/50'
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
              className="w-full rounded-lg border border-gray-800/60 bg-gray-900/40 px-3 py-2 text-base text-white placeholder-gray-700 focus:border-green-600/50 focus:outline-none focus:bg-gray-900/70 transition-colors md:py-1.5 md:text-xs"
            />
            <p className="text-[10px] text-gray-700 font-mono">
              {availablePlayers.length} disponibles
              {availablePlayers.length > visibleCount && (
                <span className="text-gray-800"> · {visibleCount} visibles</span>
              )}
            </p>
          </div>

          {/* Player list */}
          <div className={`dr-scroll flex-1 overflow-y-auto ${isMyTurn && isConnected ? '' : 'pointer-events-none opacity-30'}`}>
            {availablePlayers.length === 0 ? (
              <div className="py-16 text-center text-[11px] text-gray-700 uppercase tracking-widest">
                Sin jugadores disponibles
              </div>
            ) : (
              <>
                {visiblePlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isMyTurn={isMyTurn && isConnected}
                    isPicking={isPicking}
                    onPick={handlePick}
                  />
                ))}
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                    className="w-full py-3 text-[11px] text-gray-700 hover:text-gray-400 hover:bg-gray-900/30 transition-colors border-t border-gray-800/30 font-mono"
                  >
                    + {availablePlayers.length - visibleCount} jugadores más
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Turn indicator + countdown ── */}
        <div className={`${mobileTab === 'queue' ? 'flex' : 'hidden'} shrink-0 flex-col items-center justify-center gap-5 border-b border-gray-800/60 px-4 py-6 md:flex md:border-b-0 md:border-r`}>

          {/* Current player */}
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-gray-700">Turno actual</span>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black transition-all duration-500 ${
                isMyTurn
                  ? 'bg-green-600 text-white dr-turn-glow'
                  : 'bg-gray-800/80 text-gray-300'
              }`}
            >
              {(memberMap.get(session.current_user_id ?? '') ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-h-[32px] flex flex-col items-center justify-center">
              {isMyTurn ? (
                <>
                  <p className="text-sm font-black text-green-400 uppercase tracking-wide">¡Tu turno!</p>
                  <p className="text-[10px] text-green-600/70 mt-0.5">Selecciona un jugador</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-gray-300 truncate max-w-[160px]">
                  {memberMap.get(session.current_user_id ?? '') ?? '—'}
                </p>
              )}
            </div>
          </div>

          {/* Countdown ring */}
          <div className="relative shrink-0" style={{ width: 104, height: 104 }}>
            <svg width={104} height={104} className="-rotate-90">
              <circle cx={52} cy={52} r={40} fill="none" stroke="#111827" strokeWidth={7} />
              <circle
                cx={52} cy={52} r={40}
                fill="none"
                stroke={timerStroke}
                strokeWidth={7}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - countdown / 60)}
                style={{ transition: 'stroke-dashoffset .5s linear, stroke .5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[26px] font-black tabular-nums font-mono leading-none ${
                countdown <= 10 ? 'text-red-400 dr-urgent' : countdown <= 20 ? 'text-yellow-400' : 'text-white'
              }`}>
                {countdown}
              </span>
              <span className="text-[9px] text-gray-700 tracking-widest uppercase mt-0.5">seg</span>
            </div>
          </div>

          {/* Pick number */}
          <div className="text-center">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-gray-700 block mb-1">Selección</span>
            <span className="text-4xl font-black text-white font-mono tabular-nums">
              #{session.current_pick_number}
            </span>
            <span className="text-gray-700 text-sm font-mono">/{totalPicks}</span>
          </div>

          {/* Progress */}
          <div className="w-full space-y-1">
            <div className="h-[3px] rounded-full bg-gray-800/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-500"
                style={{ width: `${Math.max(0, ((session.current_pick_number - 1) / totalPicks) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-700 font-mono text-center">
              {Math.round(((session.current_pick_number - 1) / totalPicks) * 100)}% completado
            </p>
          </div>
        </div>

        {/* ── RIGHT: Queue ── */}
        <div className={`${mobileTab === 'queue' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-hidden md:flex`}>
          <div className="shrink-0 px-3 py-2 border-b border-gray-800/60">
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-gray-600">Próximas selecciones</p>
          </div>
          <div className="dr-scroll flex-1 overflow-y-auto divide-y divide-gray-800/20">
            {upcomingPicks.map(({ pickNumber, userId }, idx) => {
              const isCurrent = pickNumber === session.current_pick_number
              const isMe      = userId === authUserId
              return (
                <div
                  key={pickNumber}
                  className={`flex items-center gap-2.5 px-3 py-[9px] border-l-2 transition-colors ${
                    isCurrent ? 'bg-green-950/25 border-l-green-600' : 'border-l-transparent'
                  }`}
                >
                  <span className={`text-[11px] font-mono tabular-nums w-7 text-right shrink-0 ${
                    isCurrent ? 'text-green-400 font-bold' : 'text-gray-700'
                  }`}>
                    {pickNumber}
                  </span>
                  <span className={`text-[12px] truncate flex-1 ${
                    isCurrent
                      ? isMe ? 'text-green-400 font-semibold' : 'text-white font-semibold'
                      : isMe ? 'text-green-600/70' : 'text-gray-500'
                  }`}>
                    {memberMap.get(userId) ?? '—'}
                    {isMe && <span className="ml-1 text-[10px] opacity-50">(tú)</span>}
                  </span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />}
                  {!isCurrent && idx > 0 && (
                    <span className="text-[10px] text-gray-800 font-mono shrink-0">
                      +{pickNumber - session.current_pick_number}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── BOTTOM: My Roster bar ── */}
      <div className="shrink-0 border-t border-gray-800/60 bg-gray-900/90 px-3 py-2.5">
        <div className="flex items-center gap-3 overflow-x-auto">

          {/* Squad counter */}
          <div className="shrink-0 flex flex-col items-center gap-0.5 pr-3 border-r border-gray-800/50">
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-gray-600">Squad</span>
            <span className="text-base font-black text-white font-mono tabular-nums leading-none">
              {myPicks.length}<span className="text-gray-700 text-xs font-normal">/19</span>
            </span>
          </div>

          {/* Slots by position */}
          {(['GK', 'DEF', 'MID', 'FWD'] as const).map(pos => {
            const slots    = ROSTER_LIMITS[pos]
            const starting = STARTING_SLOTS[pos]
            const filled   = myRoster[pos] ?? []

            return (
              <div key={pos} className="shrink-0 flex items-end gap-1">
                <span className={`text-[9px] font-black tracking-wider mr-0.5 self-center ${POS_LABEL[pos]}`}>
                  {pos}
                </span>
                {Array.from({ length: slots }).map((_, i) => {
                  const player  = filled[i]
                  const isBench = i >= starting
                  const slotCls = player
                    ? isBench ? POS_SLOT[pos].off : POS_SLOT[pos].on
                    : 'border-gray-800/50 border-dashed bg-transparent text-gray-800'

                  return (
                    <React.Fragment key={i}>
                      {/* Separator between starters and bench */}
                      {i === starting && (
                        <div className="w-px h-10 bg-gray-800/60 mx-0.5 self-center" />
                      )}
                      <div
                        title={player?.name}
                        className={`w-12 h-11 rounded-md border text-[9px] flex flex-col items-center justify-center text-center px-0.5 transition-all ${slotCls}`}
                      >
                        {player ? (
                          <>
                            <span className="leading-tight line-clamp-2 w-full text-center font-semibold">
                              {player.name.split(' ').slice(-1)[0]}
                            </span>
                            <span className={`text-[8px] mt-0.5 font-bold tracking-wider ${isBench ? 'opacity-40' : 'opacity-50'}`}>
                              {isBench ? 'BNC' : 'TIT'}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-800 text-lg leading-none">·</span>
                        )}
                      </div>
                    </React.Fragment>
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
