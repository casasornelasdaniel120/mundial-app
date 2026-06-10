// Server-side only — never import in Client Components.
// All requests are automatically authenticated via x-apisports-key.
import type {
  IApiResponse,
  ITeamResponse,
  ISquadResponse,
  IFixtureResponse,
  IFixtureEvent,
  IStandingsResponse,
} from '@/types/api-football'

const BASE_URL = 'https://v3.football.api-sports.io'
const LEAGUE_ID = 1
const SEASON = 2026

function getKey(): string {
  const key = process.env.API_FOOTBALL_KEY
  if (!key) throw new Error('API_FOOTBALL_KEY is not set in environment variables.')
  return key
}

async function apiFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<IApiResponse<T>> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': getKey(),
    },
    next: { revalidate: 0 }, // always fresh — callers cache in Supabase
  })

  if (!res.ok) {
    throw new Error(`API-Football ${endpoint} → HTTP ${res.status}`)
  }

  const data = (await res.json()) as IApiResponse<T>

  if (Array.isArray(data.errors) ? data.errors.length > 0 : Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football errors: ${JSON.stringify(data.errors)}`)
  }

  return data
}

// Returns all 32 national teams for the World Cup.
export async function fetchTeams(): Promise<IApiResponse<ITeamResponse>> {
  return apiFetch<ITeamResponse>('/teams', { league: LEAGUE_ID, season: SEASON })
}

// Returns the full squad for a team in a single request (no pagination).
// response[0].players contains the player array.
export async function fetchPlayersByTeam(teamId: number): Promise<IApiResponse<ISquadResponse>> {
  return apiFetch<ISquadResponse>('/players/squads', { team: teamId })
}

// All scheduled and completed fixtures for the tournament.
export async function fetchFixtures(): Promise<IApiResponse<IFixtureResponse>> {
  return apiFetch<IFixtureResponse>('/fixtures', { league: LEAGUE_ID, season: SEASON })
}

// Fixtures currently being played (for live scoring updates).
export async function fetchLiveFixtures(): Promise<IApiResponse<IFixtureResponse>> {
  return apiFetch<IFixtureResponse>('/fixtures', { live: 'all' })
}

// All events (goals, cards, substitutions) for a single finished fixture.
export async function fetchFixtureEvents(fixtureId: number): Promise<IApiResponse<IFixtureEvent>> {
  return apiFetch<IFixtureEvent>('/fixtures/events', { fixture: fixtureId })
}

// Group standings for display purposes (not used in scoring calculations).
export async function fetchStandings(): Promise<IApiResponse<IStandingsResponse>> {
  return apiFetch<IStandingsResponse>('/standings', { league: LEAGUE_ID, season: SEASON })
}
