export interface ILeague {
  id: string
  name: string
  invite_code: string
  admin_user_id: string
  max_teams: number
  budget_cap: number
  created_at: string
}

export interface ILeagueWithMemberCount extends ILeague {
  league_members: Array<{ id: string }>
}

export interface ILeagueMember {
  id: string
  league_id: string
  user_id: string
  team_name: string | null
  joined_at: string
}

export interface IPlayer {
  id: string
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  national_team_id: string
  value: number
  api_football_id: number | null
}

export interface INationalTeam {
  id: string
  name: string
  flag_url: string | null
  group_name: string | null
  api_football_id: number | null
}

export interface IScoringRule {
  id: string
  league_id: string
  event_type: string
  points: number
}

export interface IFantasyTeam {
  id: string
  league_id: string
  user_id: string
  total_points: number
}

export interface IMatch {
  id: string
  home_team_id: string
  away_team_id: string
  match_date: string | null
  stage: 'group' | 'round_of_16' | 'quarter' | 'semi' | 'final' | null
  api_football_id: number | null
}

export interface ILeaderboardEntry {
  id: string
  user_id: string
  team_name: string | null
  joined_at: string
  total_points: number
}

export interface IDraftSession {
  id: string
  league_id: string
  status: 'waiting' | 'active' | 'completed'
  current_pick_number: number
  current_user_id: string | null
  pick_deadline: string | null
  snake_order: string[]
  created_at: string
}

export interface IDraftPick {
  id: string
  draft_session_id: string
  pick_number: number
  user_id: string
  player_id: string
  picked_at: string
}

export interface IMatchStats {
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
