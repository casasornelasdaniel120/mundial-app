-- ============================================================
-- Snake Draft System
-- Run in Supabase SQL Editor AFTER 003_add_external_ids.sql.
--
-- After running, enable Realtime for these tables in the
-- Supabase Dashboard → Database → Replication section.
-- ============================================================

CREATE TABLE IF NOT EXISTS draft_sessions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id           UUID        NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'waiting'
                                  CHECK (status IN ('waiting','active','completed')),
  current_pick_number INT         NOT NULL DEFAULT 1,
  current_user_id     UUID        REFERENCES auth.users(id),
  pick_deadline       TIMESTAMPTZ,
  snake_order         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS draft_picks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_session_id  UUID        NOT NULL REFERENCES draft_sessions(id) ON DELETE CASCADE,
  pick_number       INT         NOT NULL,
  user_id           UUID        NOT NULL REFERENCES auth.users(id),
  player_id         UUID        NOT NULL REFERENCES players(id),
  picked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevents two picks landing on the same slot (race-condition guard)
  UNIQUE(draft_session_id, pick_number)
);

-- Full replica identity so Realtime UPDATE events include old row values
ALTER TABLE draft_sessions REPLICA IDENTITY FULL;
ALTER TABLE draft_picks    REPLICA IDENTITY FULL;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE draft_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks    ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read draft sessions
CREATE POLICY "draft_sessions_read" ON draft_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only the league admin can create a draft session
CREATE POLICY "draft_sessions_insert" ON draft_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = draft_sessions.league_id
        AND l.admin_user_id = auth.uid()
    )
  );

-- Any league member can advance the session state
-- (server actions validate whose turn it actually is)
CREATE POLICY "draft_sessions_update" ON draft_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM league_members lm
      WHERE lm.league_id = draft_sessions.league_id
        AND lm.user_id = auth.uid()
    )
  );

-- Any authenticated user can read picks
CREATE POLICY "draft_picks_read" ON draft_picks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Any authenticated user can insert picks
-- (server actions validate it is the correct user's turn)
CREATE POLICY "draft_picks_insert" ON draft_picks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
