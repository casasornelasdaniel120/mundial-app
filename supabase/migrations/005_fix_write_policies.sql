-- 005_fix_write_policies.sql
--
-- Fixes two classes of silently-failing writes:
--
-- 1. DRAFT FINALIZATION (bug: rosters not saved when the draft completes).
--    finalizeDraft() runs as whichever user happened to trigger the final
--    advance, and inserts fantasy_team_players rows for EVERY team in the
--    league in a single INSERT. The owner-only FOR ALL policy rejected the
--    rows belonging to other users' teams, so the entire insert failed.
--    INSERT is now allowed for any member of the league the team belongs to.
--
-- 2. ADMIN ACTIONS (kick member / delete league). DELETE on league_members,
--    fantasy_teams, fantasy_team_players, draft_sessions and draft_picks had
--    no admin-facing policy, so those deletes matched 0 rows without error.

-- ── fantasy_team_players ─────────────────────────────────────
DROP POLICY IF EXISTS "fantasy_team_players_write_owner" ON fantasy_team_players;

-- INSERT: any member of the league the team belongs to (draft finalization)
DROP POLICY IF EXISTS "fantasy_team_players_insert_league_member" ON fantasy_team_players;
CREATE POLICY "fantasy_team_players_insert_league_member" ON fantasy_team_players
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM fantasy_teams ft
      JOIN league_members lm ON lm.league_id = ft.league_id
      WHERE ft.id = fantasy_team_players.team_id
        AND lm.user_id = auth.uid()
    )
  );

-- UPDATE: owner only (lineup editor)
DROP POLICY IF EXISTS "fantasy_team_players_update_owner" ON fantasy_team_players;
CREATE POLICY "fantasy_team_players_update_owner" ON fantasy_team_players
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams
      WHERE fantasy_teams.id = fantasy_team_players.team_id
        AND fantasy_teams.user_id = auth.uid()
    )
  );

-- DELETE: owner or league admin (kick member / delete league)
DROP POLICY IF EXISTS "fantasy_team_players_delete_owner_or_admin" ON fantasy_team_players;
CREATE POLICY "fantasy_team_players_delete_owner_or_admin" ON fantasy_team_players
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM fantasy_teams ft
      LEFT JOIN leagues l ON l.id = ft.league_id
      WHERE ft.id = fantasy_team_players.team_id
        AND (ft.user_id = auth.uid() OR l.admin_user_id = auth.uid())
    )
  );

-- ── fantasy_teams ────────────────────────────────────────────
-- Owner keeps FOR ALL (fantasy_teams_write_owner from 001); add admin delete
DROP POLICY IF EXISTS "fantasy_teams_delete_admin" ON fantasy_teams;
CREATE POLICY "fantasy_teams_delete_admin" ON fantasy_teams
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = fantasy_teams.league_id
        AND leagues.admin_user_id = auth.uid()
    )
  );

-- ── league_members ───────────────────────────────────────────
-- Self-leave or admin kick
DROP POLICY IF EXISTS "league_members_delete_self_or_admin" ON league_members;
CREATE POLICY "league_members_delete_self_or_admin" ON league_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_members.league_id
        AND leagues.admin_user_id = auth.uid()
    )
  );

-- ── draft_sessions / draft_picks (league deletion) ───────────
DROP POLICY IF EXISTS "draft_sessions_delete_admin" ON draft_sessions;
CREATE POLICY "draft_sessions_delete_admin" ON draft_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = draft_sessions.league_id
        AND leagues.admin_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "draft_picks_delete_admin" ON draft_picks;
CREATE POLICY "draft_picks_delete_admin" ON draft_picks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM draft_sessions ds
      JOIN leagues l ON l.id = ds.league_id
      WHERE ds.id = draft_picks.draft_session_id
        AND l.admin_user_id = auth.uid()
    )
  );
