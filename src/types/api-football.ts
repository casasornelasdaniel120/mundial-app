// API-Football v3 response envelope
export interface IApiResponse<T> {
  get: string
  parameters: Record<string, string>
  errors: string[] | Record<string, string>
  results: number
  paging: {
    current: number
    total: number
  }
  response: T[]
}

// GET /teams
export interface ITeamResponse {
  team: {
    id: number
    name: string
    code: string | null
    country: string
    national: boolean
    logo: string
  }
  venue: {
    id: number | null
    name: string | null
    city: string | null
    capacity: number | null
  }
}

// GET /players (paginated stats endpoint — kept for reference, not used for sync)
export interface IPlayerResponse {
  player: {
    id: number
    name: string
    firstname: string
    lastname: string
    age: number | null
    nationality: string | null
    height: string | null
    weight: string | null
    photo: string
  }
  statistics: Array<{
    team: {
      id: number
      name: string
    }
    games: {
      position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' | null
      rating: string | null
      captain: boolean
    }
  }>
}

// GET /players/squads?team={id}
export interface ISquadResponse {
  team: {
    id: number
    name: string
    logo: string
  }
  players: Array<{
    id: number
    name: string
    age: number
    number: number | null
    position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
    photo: string
  }>
}

// GET /fixtures and /fixtures?live=all
export interface IFixtureResponse {
  fixture: {
    id: number
    date: string
    status: {
      long: string
      short: string
      elapsed: number | null
    }
  }
  league: {
    id: number
    name: string
    round: string
  }
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null }
    away: { id: number; name: string; logo: string; winner: boolean | null }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
}

// GET /fixtures/events
export interface IFixtureEvent {
  time: {
    elapsed: number
    extra: number | null
  }
  team: {
    id: number
    name: string
    logo: string
  }
  player: {
    id: number | null
    name: string | null
  }
  assist: {
    id: number | null
    name: string | null
  }
  type: 'Goal' | 'Card' | 'Var' | 'subst'
  detail:
    | 'Normal Goal'
    | 'Own Goal'
    | 'Penalty'
    | 'Missed Penalty'
    | 'Yellow Card'
    | 'Red Card'
    | 'Yellow Red Card'
    | string
  comments: string | null
}

// GET /standings
export interface IStandingsResponse {
  league: {
    id: number
    name: string
    standings: IStandingEntry[][]
  }
}

export interface IStandingEntry {
  rank: number
  team: {
    id: number
    name: string
    logo: string
  }
  points: number
  goalsDiff: number
  group: string
  form: string
  all: {
    played: number
    win: number
    draw: number
    lose: number
    goals: { for: number; against: number }
  }
}
