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

const POS_BORDER = {
  GK:  'border-l-amber-500',
  DEF: 'border-l-blue-500',
  MID: 'border-l-emerald-500',
  FWD: 'border-l-red-500',
}
const POS_BADGE = {
  GK:  'text-amber-700 border-amber-200 bg-amber-50',
  DEF: 'text-blue-700 border-blue-200 bg-blue-50',
  MID: 'text-emerald-700 border-emerald-200 bg-emerald-50',
  FWD: 'text-red-700 border-red-200 bg-red-50',
}
const POS_SLOT = {
  GK:  { on: 'border-amber-300 bg-amber-50 text-amber-900',      off: 'border-amber-200 bg-amber-50/40 text-amber-400' },
  DEF: { on: 'border-blue-300 bg-blue-50 text-blue-900',         off: 'border-blue-200 bg-blue-50/40 text-blue-400' },
  MID: { on: 'border-emerald-300 bg-emerald-50 text-emerald-900', off: 'border-emerald-200 bg-emerald-50/40 text-emerald-400' },
  FWD: { on: 'border-red-300 bg-red-50 text-red-900',            off: 'border-red-200 bg-red-50/40 text-red-400' },
}
const POS_LABEL = {
  GK: 'text-amber-600', DEF: 'text-blue-600', MID: 'text-emerald-600', FWD: 'text-red-600',
}
const PAGE_SIZE = 50

const DRAFT_CSS = `
  @keyframes turnGlow {
    0%,100% { box-shadow: 0 0 0 0 rgba(0,104,71,.4), 0 0 16px rgba(0,104,71,.1); }
    50%      { box-shadow: 0 0 0 8px rgba(0,104,71,0), 0 0 32px rgba(0,104,71,.2); }
  }
  @keyframes urgentBlink {
    0%,100% { opacity:1; }
    50%      { opacity:.45; }
  }
  .dr-turn-glow   { animation: turnGlow 2s ease-in-out infinite; }
  .dr-urgent      { animation: urgentBlink .75s ease-in-out infinite; }
  .dr-scroll::-webkit-scrollbar        { width: 3px; }
  .dr-scroll::-webkit-scrollbar-track  { background: transparent; }
  .dr-scroll::-webkit-scrollbar-thumb  { background: #d6d3d1; border-radius: 3px; }
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
        'border-b border-stone-100 border-l-[3px] text-left',
        'transition-all duration-100',
        POS_BORDER[player.position],
        isMyTurn && !isPicking
          ? 'hover:bg-green-50 hover:pl-[14px] cursor-pointer'
          : 'cursor-default',
      ].join(' ')}
    >
      {/* Flag */}
      <div className="shrink-0 w-8 h-[21px] rounded-[3px] overflow-hidden bg-stone-100 ring-1 ring-stone-200">
        {player.national_teams?.flag_url
          ? <img src={player.national_teams.flag_url} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-stone-200" />}
      </div>

      {/* Name + country */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-stone-800 truncate leading-tight">{player.name}</p>
        <p className="text-[10px] text-stone-400 truncate mt-[1px]">{player.national_teams?.name ?? '—'}</p>
      </div>

      {/* Position badge */}
      <span className={`shrink-0 rounded-[3px] border px-[5px] py-[2px] text-[9px] font-bold tracking-widest ${POS_BADGE[player.position]}`}>
        {player.position}
      </span>

      {/* Action / value */}
      {isMyTurn ? (
        <span className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[11px] font-black" style={{ backgroundColor: '#006847' }}>+</span>
      ) : (
        <span className="shrink-0 text-[10px] text-stone-300 font-mono tabular-nums">{player.value}M</span>
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

        <div className="text-center">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-2" style={{ color: '#006847' }}>{leagueName}</p>
          <h1 className="text-5xl tracking-tight text-stone-900 uppercase leading-none" style={{ fontFamily: 'var(--font-russo)' }}>Draft</h1>
          <p className="text-sm text-stone-400 mt-3">El administrador iniciará el draft en breve</p>
        </div>

        {/* Snake order */}
        <div className="w-full max-w-[280px] rounded-xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-stone-100 flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-stone-400">Orden del Draft</span>
            <span className="text-[9px] text-stone-300 font-mono">Ronda 1 →</span>
          </div>
          <div className="divide-y divide-stone-50">
            {session.snake_order.map((uid, i) => {
              const isMe = uid === authUserId
              return (
                <div key={uid} className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-green-50' : ''}`}>
                  <span className={`font-mono text-sm font-bold w-5 text-right tabular-nums ${isMe ? '' : 'text-stone-300'}`} style={isMe ? { color: '#006847' } : {}}>
                    {i + 1}
                  </span>
                  <div className={`w-[3px] h-4 rounded-full ${isMe ? '' : 'bg-stone-200'}`} style={isMe ? { backgroundColor: '#006847' } : {}} />
                  <span className={`text-sm flex-1 ${isMe ? 'text-stone-900 font-semibold' : 'text-stone-500'}`}>
                    {memberMap.get(uid) ?? 'Mi Equipo'}
                  </span>
                  {isMe && <span className="text-[9px] font-bold tracking-wider uppercase" style={{ color: '#006847' }}>tú</span>}
                </div>
              )
            })}
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={handleStartDraft}
            disabled={isStarting}
            className="px-10 py-3 rounded-xl text-white font-bold text-sm tracking-wide uppercase transition-all active:scale-95 disabled:opacity-50"
            style={{ backgroundColor: '#006847', fontFamily: 'var(--font-russo)' }}
          >
            {isStarting ? 'Iniciando…' : 'Comenzar Draft'}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
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
          <div className="w-16 h-16 rounded-2xl border border-green-200 bg-green-50 flex items-center justify-center mx-auto" style={{ color: '#006847' }}>
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: '#006847' }}>Mundial 2026</p>
            <h1 className="text-4xl tracking-tight text-stone-900 uppercase leading-tight" style={{ fontFamily: 'var(--font-russo)' }}>
              Draft<br/>Completado
            </h1>
          </div>
          <p className="text-sm text-stone-500">Todos los equipos han sido armados</p>
        </div>
        <Link
          href={`/leagues/${leagueId}`}
          className="px-7 py-2.5 rounded-xl text-white font-bold text-sm tracking-wide uppercase transition-all"
          style={{ backgroundColor: '#006847', fontFamily: 'var(--font-russo)' }}
        >
          Ver Clasificación →
        </Link>
      </div>
    )
  }

  // ── Active draft room ─────────────────────────────────────
  const circumference = 2 * Math.PI * 40
  const timerStroke   = countdown <= 10 ? '#ef4444' : countdown <= 20 ? '#f59e0b' : '#006847'

  return (
    <div className="-mx-4 -my-8 sm:-mx-6 flex h-[calc(100dvh-3.5rem)] flex-col">
      <style>{DRAFT_CSS}</style>

      {/* Connection-loss banner */}
      {!isConnected && (
        <div className="shrink-0 bg-red-600 border-b border-red-500 px-4 py-1.5 text-center text-[11px] font-bold text-white tracking-widest uppercase">
          Sin conexión — reconectando…
        </div>
      )}

      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-stone-200 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/leagues/${leagueId}`}
            className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-700 transition-colors shrink-0"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {leagueName}
          </Link>
          <span className="w-px h-3 bg-stone-200 shrink-0" />
          <span className="text-[11px] text-stone-400 font-mono tabular-nums shrink-0">
            PICK <span className="text-stone-900 font-bold">{session.current_pick_number}</span>
            <span className="text-stone-300">/{totalPicks}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#006847' }} />
          <span className="text-[11px] text-stone-300 font-mono tabular-nums">{picks.length} picks</span>
        </div>
      </div>

      {/* ── Mobile tab bar ── */}
      <div className="sticky top-0 z-10 flex shrink-0 border-b border-stone-200 bg-white md:hidden">
        {(['players', 'queue'] as const).map(key => (
          <button
            key={key}
            onClick={() => setMobileTab(key)}
            className={`flex-1 py-3 text-[11px] font-bold tracking-[0.15em] uppercase transition-colors border-b-2 ${
              mobileTab === key
                ? 'border-[#006847] text-[#006847]'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {key === 'players' ? 'Jugadores' : 'Turno'}
          </button>
        ))}
      </div>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 flex-col overflow-hidden md:grid md:[grid-template-columns:1fr_220px_200px]">

        {/* ── LEFT: Available players ── */}
        <div className={`${mobileTab === 'players' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-hidden border-stone-200 md:flex md:border-r`}>
          {/* Filters */}
          <div className="shrink-0 p-2.5 space-y-2 border-b border-stone-200 bg-stone-50">
            <div className="flex gap-1">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as PositionFilter[]).map(pos => (
                <button
                  key={pos}
                  onClick={() => handlePositionFilter(pos)}
                  className={`flex-1 rounded-md py-2.5 text-[11px] font-bold tracking-wider uppercase transition-all md:py-1.5 ${
                    posFilter === pos
                      ? 'text-white'
                      : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
                  }`}
                  style={posFilter === pos ? { backgroundColor: '#006847' } : {}}
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
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-base text-stone-800 placeholder-stone-400 focus:border-[#006847]/50 focus:outline-none focus:ring-2 focus:ring-[#006847]/10 transition-colors md:py-1.5 md:text-xs"
            />
            <p className="text-[10px] text-stone-400 font-mono">
              {availablePlayers.length} disponibles
              {availablePlayers.length > visibleCount && (
                <span className="text-stone-300"> · {visibleCount} visibles</span>
              )}
            </p>
          </div>

          {/* Player list */}
          <div className={`dr-scroll flex-1 overflow-y-auto bg-white ${isMyTurn && isConnected ? '' : 'pointer-events-none opacity-40'}`}>
            {availablePlayers.length === 0 ? (
              <div className="py-16 text-center text-[11px] text-stone-300 uppercase tracking-widest">
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
                    className="w-full py-3 text-[11px] text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors border-t border-stone-100 font-mono"
                  >
                    + {availablePlayers.length - visibleCount} jugadores más
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── CENTER: Turn indicator + countdown ── */}
        <div className={`${mobileTab === 'queue' ? 'flex' : 'hidden'} shrink-0 flex-col items-center justify-center gap-5 border-b border-stone-200 bg-white px-4 py-6 md:flex md:border-b-0 md:border-r`}>

          {/* Current player */}
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-stone-400">Turno actual</span>
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black transition-all duration-500 ${
                isMyTurn
                  ? 'text-white dr-turn-glow'
                  : 'bg-stone-100 text-stone-500'
              }`}
              style={isMyTurn ? { backgroundColor: '#006847' } : {}}
            >
              {(memberMap.get(session.current_user_id ?? '') ?? '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-h-[32px] flex flex-col items-center justify-center">
              {isMyTurn ? (
                <>
                  <p className="text-sm font-black uppercase tracking-wide" style={{ color: '#006847' }}>¡Tu turno!</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Selecciona un jugador</p>
                </>
              ) : (
                <p className="text-sm font-semibold text-stone-700 truncate max-w-[160px]">
                  {memberMap.get(session.current_user_id ?? '') ?? '—'}
                </p>
              )}
            </div>
          </div>

          {/* Countdown ring */}
          <div className="relative shrink-0" style={{ width: 104, height: 104 }}>
            <svg width={104} height={104} className="-rotate-90">
              <circle cx={52} cy={52} r={40} fill="none" stroke="#e7e5e4" strokeWidth={7} />
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
                countdown <= 10 ? 'text-red-500 dr-urgent' : countdown <= 20 ? 'text-amber-500' : 'text-stone-900'
              }`}>
                {countdown}
              </span>
              <span className="text-[9px] text-stone-300 tracking-widest uppercase mt-0.5">seg</span>
            </div>
          </div>

          {/* Pick number */}
          <div className="text-center">
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-stone-400 block mb-1">Selección</span>
            <span className="text-4xl font-black text-stone-900 font-mono tabular-nums">
              #{session.current_pick_number}
            </span>
            <span className="text-stone-300 text-sm font-mono">/{totalPicks}</span>
          </div>

          {/* Progress */}
          <div className="w-full space-y-1">
            <div className="h-[3px] rounded-full bg-stone-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, ((session.current_pick_number - 1) / totalPicks) * 100)}%`, backgroundColor: '#006847' }}
              />
            </div>
            <p className="text-[10px] text-stone-300 font-mono text-center">
              {Math.round(((session.current_pick_number - 1) / totalPicks) * 100)}% completado
            </p>
          </div>
        </div>

        {/* ── RIGHT: Queue ── */}
        <div className={`${mobileTab === 'queue' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col overflow-hidden bg-white md:flex`}>
          <div className="shrink-0 px-3 py-2 border-b border-stone-100 bg-stone-50">
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-stone-400">Próximas selecciones</p>
          </div>
          <div className="dr-scroll flex-1 overflow-y-auto divide-y divide-stone-50">
            {upcomingPicks.map(({ pickNumber, userId }, idx) => {
              const isCurrent = pickNumber === session.current_pick_number
              const isMe      = userId === authUserId
              return (
                <div
                  key={pickNumber}
                  className={`flex items-center gap-2.5 px-3 py-[9px] border-l-2 transition-colors ${
                    isCurrent ? 'bg-green-50' : ''
                  }`}
                  style={{ borderLeftColor: isCurrent ? '#006847' : 'transparent' }}
                >
                  <span className={`text-[11px] font-mono tabular-nums w-7 text-right shrink-0 ${
                    isCurrent ? 'font-bold' : 'text-stone-300'
                  }`} style={isCurrent ? { color: '#006847' } : {}}>
                    {pickNumber}
                  </span>
                  <span className={`text-[12px] truncate flex-1 ${
                    isCurrent
                      ? isMe ? 'font-semibold' : 'text-stone-800 font-semibold'
                      : isMe ? '' : 'text-stone-400'
                  }`} style={isCurrent && isMe ? { color: '#006847' } : (!isCurrent && isMe ? { color: '#006847', opacity: 0.6 } : {})}>
                    {memberMap.get(userId) ?? '—'}
                    {isMe && <span className="ml-1 text-[10px] opacity-50">(tú)</span>}
                  </span>
                  {isCurrent && <span className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0" style={{ backgroundColor: '#006847' }} />}
                  {!isCurrent && idx > 0 && (
                    <span className="text-[10px] text-stone-200 font-mono shrink-0">
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
      <div className="shrink-0 border-t border-stone-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-3 overflow-x-auto">

          {/* Squad counter */}
          <div className="shrink-0 flex flex-col items-center gap-0.5 pr-3 border-r border-stone-200">
            <span className="text-[8px] font-bold tracking-[0.2em] uppercase text-stone-400">Squad</span>
            <span className="text-base font-black text-stone-900 font-mono tabular-nums leading-none">
              {myPicks.length}<span className="text-stone-300 text-xs font-normal">/19</span>
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
                    : 'border-stone-200 border-dashed bg-transparent text-stone-200'

                  return (
                    <React.Fragment key={i}>
                      {i === starting && (
                        <div className="w-px h-10 bg-stone-200 mx-0.5 self-center" />
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
                          <span className="text-stone-200 text-lg leading-none">·</span>
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
