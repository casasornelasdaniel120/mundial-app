import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import LineupManager from './LineupManager'
import RenameTeamForm from './RenameTeamForm'

type Props = {
  params: Promise<{ id: string }>
}

type Position = 'GK' | 'DEF' | 'MID' | 'FWD'
type StatKey = 'goals' | 'assists' | 'passes' | 'yellow_cards' | 'red_cards' | 'fouls' | 'clean_sheet'
type EventType = 'goal' | 'assist' | 'pass' | 'yellow_card' | 'red_card' | 'foul' | 'clean_sheet'

type TeamRelation = {
  name: string
  flag_url: string | null
}

type PlayerRelation = {
  id: string
  name: string
  position: Position
  api_football_id: number | null
  national_teams: TeamRelation | TeamRelation[] | null
}

type RosterRow = {
  id: string
  is_starting: boolean
  players: PlayerRelation | PlayerRelation[] | null
}

type RosterPlayer = {
  rosterId: string
  id: string
  name: string
  position: Position
  isStarting: boolean
  photoUrl: string | null
  team: TeamRelation | null
  totalPoints: number
}

type MatchStatRow = {
  id: string
  player_id: string
  match_id: string
  goals: number
  assists: number
  passes: number
  yellow_cards: number
  red_cards: number
  fouls: number
  clean_sheet: boolean
}

type MatchRow = {
  id: string
  home_team_id: string | null
  away_team_id: string | null
  match_date: string | null
  stage: string | null
}

type EventBreakdown = {
  label: string
  value: number
  rule: number
  points: number
}

type PlayerMatchBreakdown = {
  playerId: string
  playerName: string
  position: Position
  points: number
  events: EventBreakdown[]
}

type MatchdayBreakdown = {
  id: string
  label: string
  dateLabel: string
  opponentLabel: string
  points: number
  players: PlayerMatchBreakdown[]
}

const POSITION_COLORS: Record<Position, string> = {
  GK:  'bg-amber-50 text-amber-700 border border-amber-200',
  DEF: 'bg-blue-50 text-blue-700 border border-blue-200',
  MID: 'bg-green-50 text-[#006847] border border-green-200',
  FWD: 'bg-red-50 text-red-700 border border-red-200',
}

const STAT_CONFIG: Array<{ key: StatKey; eventType: EventType; label: string }> = [
  { key: 'goals', eventType: 'goal', label: 'Gol' },
  { key: 'assists', eventType: 'assist', label: 'Asistencia' },
  { key: 'passes', eventType: 'pass', label: 'Pase' },
  { key: 'yellow_cards', eventType: 'yellow_card', label: 'Tarjeta amarilla' },
  { key: 'red_cards', eventType: 'red_card', label: 'Tarjeta roja' },
  { key: 'fouls', eventType: 'foul', label: 'Falta' },
  { key: 'clean_sheet', eventType: 'clean_sheet', label: 'Porteria imbatida' },
]

function normaliseSingle<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function formatPoints(points: number): string {
  return Number.isInteger(points) ? String(points) : points.toFixed(1)
}

function formatDate(value: string | null): string {
  if (!value) return 'Fecha por confirmar'
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function stageLabel(stage: string | null): string {
  const labels: Record<string, string> = {
    group: 'Fase de grupos',
    round_of_16: 'Octavos',
    quarter: 'Cuartos',
    semi: 'Semifinal',
    final: 'Final',
  }
  return stage ? (labels[stage] ?? stage.replace(/_/g, ' ')) : 'Partido'
}

function calculateStatPoints(
  stat: MatchStatRow,
  scoringRules: Map<string, number>
): EventBreakdown[] {
  return STAT_CONFIG.flatMap(({ key, eventType, label }) => {
    const rawValue = stat[key]
    const value = typeof rawValue === 'boolean' ? (rawValue ? 1 : 0) : rawValue
    const rule = scoringRules.get(eventType) ?? 0
    const points = value * rule
    if (!value || !points) return []
    return [{ label, value, rule, points }]
  })
}

export default async function MyTeamPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', id)
    .single()

  if (!league) notFound()

  const { data: membership } = await supabase
    .from('league_members')
    .select('id, team_name')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) redirect('/leagues')

  const [{ data: fantasyTeam }, { data: members }, { data: fantasyTeams }, { data: scoringRules }] = await Promise.all([
    supabase
      .from('fantasy_teams')
      .select('id, total_points')
      .eq('league_id', id)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('league_members')
      .select('id, user_id, team_name, joined_at')
      .eq('league_id', id),
    supabase
      .from('fantasy_teams')
      .select('user_id, total_points')
      .eq('league_id', id),
    supabase
      .from('scoring_rules')
      .select('event_type, points')
      .eq('league_id', id),
  ])

  if (!fantasyTeam) {
    redirect(`/leagues/${id}`)
  }

  const pointsMap = new Map(
    fantasyTeams?.map(team => [team.user_id as string, Number(team.total_points) || 0]) ?? []
  )

  const leaderboard = (members ?? [])
    .map(member => ({
      userId: member.user_id as string,
      joinedAt: member.joined_at as string,
      totalPoints: pointsMap.get(member.user_id as string) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    )

  const rank = leaderboard.findIndex(entry => entry.userId === user.id) + 1

  const { data: rosterRows } = await supabase
    .from('fantasy_team_players')
    .select('id, is_starting, players(id, name, position, api_football_id, national_teams(name, flag_url))')
    .eq('team_id', fantasyTeam.id)

  const rosterBase: RosterPlayer[] = ((rosterRows ?? []) as RosterRow[])
    .map(row => {
      const player = normaliseSingle(row.players)
      if (!player) return null
      return {
        rosterId: row.id,
        id: player.id,
        name: player.name,
        position: player.position,
        isStarting: row.is_starting,
        photoUrl: player.api_football_id
          ? `https://media.api-sports.io/football/players/${player.api_football_id}.png`
          : null,
        team: normaliseSingle(player.national_teams),
        totalPoints: 0,
      }
    })
    .filter((player): player is RosterPlayer => Boolean(player))

  const playerIds = rosterBase.map(player => player.id)

  const [{ data: matchStats }, { data: teams }] = playerIds.length
    ? await Promise.all([
        supabase
          .from('match_stats')
          .select('id, player_id, match_id, goals, assists, passes, yellow_cards, red_cards, fouls, clean_sheet')
          .in('player_id', playerIds),
        supabase
          .from('national_teams')
          .select('id, name'),
      ])
    : [{ data: [] }, { data: [] }]

  const matchIds = Array.from(new Set((matchStats ?? []).map(stat => stat.match_id as string)))
  const { data: matches } = matchIds.length
    ? await supabase
        .from('matches')
        .select('id, home_team_id, away_team_id, match_date, stage')
        .in('id', matchIds)
    : { data: [] }

  const scoringRuleMap = new Map(
    scoringRules?.map(rule => [rule.event_type as string, Number(rule.points) || 0]) ?? []
  )
  const playerMap = new Map(rosterBase.map(player => [player.id, player]))
  const teamMap = new Map((teams ?? []).map(team => [team.id as string, team.name as string]))
  const matchMap = new Map((matches ?? []).map(match => [match.id as string, match as MatchRow]))
  const playerTotals = new Map<string, number>()
  const matchdayMap = new Map<string, MatchdayBreakdown>()

  for (const stat of (matchStats ?? []) as MatchStatRow[]) {
    const player = playerMap.get(stat.player_id)
    if (!player) continue

    const events = calculateStatPoints(stat, scoringRuleMap)
    const points = events.reduce((sum, event) => sum + event.points, 0)
    if (!events.length) continue

    playerTotals.set(player.id, (playerTotals.get(player.id) ?? 0) + points)

    const match = matchMap.get(stat.match_id)
    const home = match?.home_team_id ? teamMap.get(match.home_team_id) : null
    const away = match?.away_team_id ? teamMap.get(match.away_team_id) : null
    const opponentLabel = home && away ? `${home} vs ${away}` : stageLabel(match?.stage ?? null)

    const existing = matchdayMap.get(stat.match_id) ?? {
      id: stat.match_id,
      label: stageLabel(match?.stage ?? null),
      dateLabel: formatDate(match?.match_date ?? null),
      opponentLabel,
      points: 0,
      players: [],
    }

    existing.points += points
    existing.players.push({
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      points,
      events,
    })
    matchdayMap.set(stat.match_id, existing)
  }

  const roster = rosterBase.map(player => ({
    ...player,
    totalPoints: playerTotals.get(player.id) ?? 0,
  }))

  const matchdays = Array.from(matchdayMap.values()).sort((a, b) => a.dateLabel.localeCompare(b.dateLabel))

  return (
    <div className="space-y-6">
      <Link
        href={`/leagues/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-700"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        {league.name}
      </Link>

      {/* Team header */}
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-stone-400">{league.name}</p>
            <RenameTeamForm leagueId={id} initialName={membership.team_name ?? 'Mi Equipo'} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-64">
            <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-wider text-stone-400">Puntos</p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: '#006847' }}>
                {formatPoints(Number(fantasyTeam.total_points) || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
              <p className="text-xs uppercase tracking-wider text-stone-400">Ranking</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
                {rank ? `#${rank}` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <LineupManager leagueId={id} players={roster} />

      {/* Points breakdown */}
      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-4">
          <h2 className="font-semibold text-stone-900">Desglose de Puntos</h2>
          <p className="mt-1 text-sm text-stone-400">
            Puntos calculados desde estadísticas de partido y reglas de la liga.
          </p>
        </div>

        {matchdays.length ? (
          <div className="divide-y divide-stone-100">
            {matchdays.map((matchday, index) => (
              <details key={matchday.id} className="group">
                <summary className="grid cursor-pointer grid-cols-[1fr_auto] gap-4 px-6 py-4 transition-colors hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800">Jornada {index + 1}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-400">
                      {matchday.dateLabel} · {matchday.opponentLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums" style={{ color: '#006847' }}>
                      {formatPoints(matchday.points)} pts
                    </p>
                    <p className="text-xs text-stone-300 group-open:hidden">Ver detalle</p>
                  </div>
                </summary>

                <div className="border-t border-stone-100 bg-stone-50/50 px-6 py-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-stone-100 text-xs uppercase tracking-wider text-stone-400">
                          <th className="py-2 text-left font-medium">Jugador</th>
                          <th className="py-2 text-left font-medium">Eventos</th>
                          <th className="py-2 text-right font-medium">Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {matchday.players.map(player => (
                          <tr key={`${matchday.id}-${player.playerId}`}>
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${POSITION_COLORS[player.position]}`}>
                                  {player.position}
                                </span>
                                <span className="font-medium text-stone-700">{player.playerName}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-stone-500">
                              {player.events.map(event => (
                                <span key={event.label} className="mr-3 whitespace-nowrap">
                                  {event.label} x{event.value} ({event.rule > 0 ? '+' : ''}{formatPoints(event.rule)})
                                </span>
                              ))}
                            </td>
                            <td className="py-3 text-right font-semibold tabular-nums" style={{ color: '#006847' }}>
                              {formatPoints(player.points)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-sm text-stone-400">
            No hay puntos registrados todavía.
          </div>
        )}
      </section>
    </div>
  )
}
