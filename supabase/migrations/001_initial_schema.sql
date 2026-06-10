-- ============================================================
-- World Cup Fantasy League — Initial Schema
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/jrviddestqlarykyoyfn/sql
-- ============================================================

-- National teams
CREATE TABLE IF NOT EXISTS national_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  flag_url TEXT,
  group_name TEXT
);

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT CHECK (position IN ('GK','DEF','MID','FWD')),
  national_team_id UUID REFERENCES national_teams(id),
  value NUMERIC DEFAULT 10.0
);

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code UUID DEFAULT gen_random_uuid() UNIQUE,
  admin_user_id UUID REFERENCES auth.users(id),
  max_teams INT DEFAULT 20,
  budget_cap NUMERIC DEFAULT 100.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scoring rules (per league)
CREATE TABLE IF NOT EXISTS scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points NUMERIC NOT NULL
);

-- League members
CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Fantasy teams
CREATE TABLE IF NOT EXISTS fantasy_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points NUMERIC DEFAULT 0,
  UNIQUE(league_id, user_id)
);

-- Players selected per fantasy team
CREATE TABLE IF NOT EXISTS fantasy_team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id),
  is_starting BOOLEAN DEFAULT true
);

-- Matches
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES national_teams(id),
  away_team_id UUID REFERENCES national_teams(id),
  match_date TIMESTAMPTZ,
  stage TEXT CHECK (stage IN ('group','round_of_16','quarter','semi','final'))
);

-- Match stats (entered by admin)
CREATE TABLE IF NOT EXISTS match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  passes INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  fouls INT DEFAULT 0,
  clean_sheet BOOLEAN DEFAULT false,
  UNIQUE(player_id, match_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE national_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;

-- national_teams: public read
CREATE POLICY "national_teams_read" ON national_teams
  FOR SELECT USING (true);

-- players: public read
CREATE POLICY "players_read" ON players
  FOR SELECT USING (true);

-- matches: public read
CREATE POLICY "matches_read" ON matches
  FOR SELECT USING (true);

-- leagues: members can read their leagues
CREATE POLICY "leagues_read_by_members" ON leagues
  FOR SELECT USING (
    auth.uid() = admin_user_id
    OR EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = leagues.id
        AND league_members.user_id = auth.uid()
    )
  );

-- leagues: any authenticated user can create a league
CREATE POLICY "leagues_insert_authenticated" ON leagues
  FOR INSERT WITH CHECK (auth.uid() = admin_user_id);

-- leagues: only admin can update
CREATE POLICY "leagues_update_admin" ON leagues
  FOR UPDATE USING (auth.uid() = admin_user_id);

-- leagues: only admin can delete
CREATE POLICY "leagues_delete_admin" ON leagues
  FOR DELETE USING (auth.uid() = admin_user_id);

-- scoring_rules: members can read
CREATE POLICY "scoring_rules_read_by_members" ON scoring_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = scoring_rules.league_id
        AND (
          leagues.admin_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM league_members
            WHERE league_members.league_id = leagues.id
              AND league_members.user_id = auth.uid()
          )
        )
    )
  );

-- scoring_rules: only league admin can write
CREATE POLICY "scoring_rules_write_admin" ON scoring_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = scoring_rules.league_id
        AND leagues.admin_user_id = auth.uid()
    )
  );

-- league_members: members can read their own league's members
CREATE POLICY "league_members_read" ON league_members
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_members.league_id
        AND leagues.admin_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM league_members lm2
      WHERE lm2.league_id = league_members.league_id
        AND lm2.user_id = auth.uid()
    )
  );

-- league_members: authenticated users can join (insert their own row)
CREATE POLICY "league_members_insert_self" ON league_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- league_members: users can update their own record (team_name)
CREATE POLICY "league_members_update_self" ON league_members
  FOR UPDATE USING (auth.uid() = user_id);

-- fantasy_teams: members can read all teams in shared leagues
CREATE POLICY "fantasy_teams_read" ON fantasy_teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM league_members
      WHERE league_members.league_id = fantasy_teams.league_id
        AND league_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = fantasy_teams.league_id
        AND leagues.admin_user_id = auth.uid()
    )
  );

-- fantasy_teams: owner can insert/update
CREATE POLICY "fantasy_teams_write_owner" ON fantasy_teams
  FOR ALL USING (auth.uid() = user_id);

-- fantasy_team_players: readable by league members
CREATE POLICY "fantasy_team_players_read" ON fantasy_team_players
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams ft
      JOIN league_members lm ON lm.league_id = ft.league_id
      WHERE ft.id = fantasy_team_players.team_id
        AND lm.user_id = auth.uid()
    )
  );

-- fantasy_team_players: only team owner can write
CREATE POLICY "fantasy_team_players_write_owner" ON fantasy_team_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE fantasy_teams.id = fantasy_team_players.team_id
        AND fantasy_teams.user_id = auth.uid()
    )
  );

-- match_stats: readable by all league members
CREATE POLICY "match_stats_read" ON match_stats
  FOR SELECT USING (true);

-- match_stats: only league admin can write
-- (enforced at API layer since stats aren't tied to a league directly)
CREATE POLICY "match_stats_write_authenticated" ON match_stats
  FOR ALL USING (auth.role() = 'authenticated');
