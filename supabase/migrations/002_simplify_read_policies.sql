-- ============================================================
-- Simplify read-side RLS policies for authenticated users.
-- The join flow and member-count queries need non-members to
-- read leagues and league_members, so we allow all authenticated
-- reads (data is not sensitive in a fantasy-league context).
-- Write-side policies remain restrictive.
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql.
-- ============================================================

-- leagues: any authenticated user can read any league
DROP POLICY IF EXISTS "leagues_read_by_members" ON leagues;
CREATE POLICY "leagues_read" ON leagues
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- league_members: any authenticated user can read members
-- (avoids recursive self-referential RLS checks)
DROP POLICY IF EXISTS "league_members_read" ON league_members;
CREATE POLICY "league_members_read" ON league_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- fantasy_teams: any authenticated user can read all teams
DROP POLICY IF EXISTS "fantasy_teams_read" ON fantasy_teams;
CREATE POLICY "fantasy_teams_read" ON fantasy_teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- fantasy_team_players: any authenticated user can read
DROP POLICY IF EXISTS "fantasy_team_players_read" ON fantasy_team_players;
CREATE POLICY "fantasy_team_players_read" ON fantasy_team_players
  FOR SELECT USING (auth.uid() IS NOT NULL);
