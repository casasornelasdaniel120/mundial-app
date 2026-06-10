-- ============================================================
-- Add API-Football external IDs + write policies for sync routes.
-- Run this in Supabase SQL Editor AFTER 002_simplify_read_policies.sql.
-- ============================================================

-- External IDs used as stable upsert keys when syncing from API-Football.
ALTER TABLE national_teams ADD COLUMN IF NOT EXISTS api_football_id INTEGER UNIQUE;
ALTER TABLE players        ADD COLUMN IF NOT EXISTS api_football_id INTEGER UNIQUE;
ALTER TABLE matches        ADD COLUMN IF NOT EXISTS api_football_id INTEGER UNIQUE;

-- Write policies for sync routes.
-- Any authenticated user may upsert reference data (national_teams, players, matches).
-- These are lookup tables, not user-owned data. Restrict further once a global-admin
-- role is introduced.

CREATE POLICY "national_teams_write" ON national_teams
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "players_write" ON players
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "matches_write" ON matches
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
