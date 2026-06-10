# World Cup Fantasy League — CLAUDE.md

## Project Overview
Fantasy football league app for the 2026 World Cup.
Users create a league, invite friends via a unique link, draft real World Cup players in a live snake draft, and compete by accumulating fantasy points based on real match statistics.
Built with Next.js 16 App Router, TypeScript, Tailwind CSS, and Supabase.

---

## Supabase Project
- **Project name:** world-cup-fantasy
- **Project ID:** jrviddestqlarykyoyfn
- **Region:** us-west-2
- **API URL:** https://jrviddestqlarykyoyfn.supabase.co
- **REST endpoint:** https://jrviddestqlarykyoyfn.supabase.co/rest/v1/
- All keys live in `.env.local` — never hardcode credentials in source files

---

## Tech Stack
- **Framework:** Next.js 16 with App Router (`/src/app`)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS — utility classes only, no custom CSS files unless necessary
- **Database:** Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Auth:** Supabase Auth (email + password)
- **Realtime:** Supabase Realtime (Postgres Changes) — used in the draft room
- **Live data:** API-Football v3 — teams, players, fixtures, events
- **Env vars:** Loaded from `.env.local` via `process.env`
- **Proxy (middleware):** `src/proxy.ts` — Next.js 16 uses `proxy` not `middleware`

---

## API-Football

- **Provider:** API-Sports — API-Football v3
- **Base URL:** `https://v3.football.api-sports.io`
- **Auth header:** `x-apisports-key: <API_FOOTBALL_KEY>` (every request)
- **Key location:** `.env.local` as `API_FOOTBALL_KEY` — server-side only, never `NEXT_PUBLIC_`
- **World Cup identifiers:** `league=1`, `season=2026`

### Endpoints in use

| Endpoint | Purpose |
|---|---|
| `GET /teams?league=1&season=2026` | Fetch all 32 national teams → `national_teams` |
| `GET /players/squads?team=<id>` | Fetch full squad per team (no pagination) → `players` |
| `GET /fixtures?league=1&season=2026` | Fetch all matches → `matches` |
| `GET /fixtures?live=all` | Poll in-progress matches for live scoring |
| `GET /fixtures/events?fixture=<id>` | Fetch goals/cards/etc. for a finished match → `match_stats` |
| `GET /standings?league=1&season=2026` | Group standings (informational display) |

### Client wrapper
All calls go through `src/lib/api-football/client.ts`, which injects the auth header and returns typed responses. Never call the API base URL directly from pages or components.

### Rate limits
- Free tier: 100 requests/day
- Sync endpoints are called manually by an authenticated user — not on every page load
- Cache responses in Supabase; re-sync only when data changes

---

## Supabase Client Setup

### `/src/lib/supabase/client.ts` — Browser client
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### `/src/lib/supabase/server.ts` — Server client
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

---

## Project Structure
```
src/
  app/
    (auth)/               → /login, /register — dark-themed auth pages
    (dashboard)/          → Protected layout (dark nav, auth guard)
      leagues/            → /leagues — list of user's leagues
      leagues/new/        → /leagues/new — create league form
      leagues/[id]/       → /leagues/[id] — detail + leaderboard
      leagues/[id]/admin/ → /leagues/[id]/admin — admin panel + draft init
      leagues/[id]/draft/ → /leagues/[id]/draft — live snake draft room
    api/
      sync/teams/         → GET /api/sync/teams — upsert national teams
      sync/players/       → GET /api/sync/players — upsert players per team
      sync/fixtures/      → GET /api/sync/fixtures — upsert matches
    auth/callback/        → GET /auth/callback — Supabase OAuth/magic-link handler
    join/[invite_code]/   → /join/[invite_code] — invite link join flow
  components/
    InviteLinkButton.tsx  → Copies /join/<code> URL to clipboard
    LogoutButton.tsx      → Signs out via Supabase Auth
  lib/
    supabase/
      client.ts           → Browser Supabase client
      server.ts           → Server Supabase client
    api-football/
      client.ts           → Typed fetch wrapper (all endpoints)
  types/
    db.ts                 → Supabase table interfaces (ILeague, IPlayer, IDraftSession, …)
    api-football.ts       → API-Football response interfaces
  proxy.ts                → Route protection + session refresh (Next.js 16 middleware)
```

---

## Pages Built

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — dark football theme, hero + how-it-works + features |
| `/login` | `app/(auth)/login/page.tsx` | Email + password login |
| `/register` | `app/(auth)/register/page.tsx` | Register with confirm-password validation |
| `/auth/callback` | `app/auth/callback/route.ts` | Supabase OAuth / magic-link code exchange |
| `/leagues` | `app/(dashboard)/leagues/page.tsx` | Lists all leagues the current user belongs to |
| `/leagues/new` | `app/(dashboard)/leagues/new/page.tsx` | Create league form (name, max teams, budget cap) |
| `/leagues/[id]` | `app/(dashboard)/leagues/[id]/page.tsx` | League detail: leaderboard table, invite link, action buttons |
| `/leagues/[id]/admin` | `app/(dashboard)/leagues/[id]/admin/page.tsx` | Admin panel: scoring rules, member list, draft initiation |
| `/leagues/[id]/draft` | `app/(dashboard)/leagues/[id]/draft/page.tsx` | Live snake draft room (full-screen, Realtime) |
| `/join/[invite_code]` | `app/join/[invite_code]/page.tsx` | Shows league info + one-click join button |

---

## Migrations

Run all four in order in the Supabase SQL Editor.

| File | What it does |
|---|---|
| `001_initial_schema.sql` | Creates all core tables: `national_teams`, `players`, `leagues`, `scoring_rules`, `league_members`, `fantasy_teams`, `fantasy_team_players`, `matches`, `match_stats`. Enables RLS on all. |
| `002_simplify_read_policies.sql` | Replaces recursive `league_members` self-join RLS policies with simple `auth.uid() IS NOT NULL` read policies on `leagues`, `league_members`, `fantasy_teams`, `fantasy_team_players`. Required for the join flow and member-count queries. |
| `003_add_external_ids.sql` | Adds `api_football_id INTEGER UNIQUE` to `national_teams`, `players`, `matches`. Adds write policies for authenticated users on these three reference tables (for the sync routes). |
| `004_draft.sql` | Creates `draft_sessions` and `draft_picks`. Sets `REPLICA IDENTITY FULL` on both for Realtime UPDATE events. RLS: admin inserts sessions, members update sessions, any authenticated user reads/inserts picks. **After running:** enable Realtime for these tables in Supabase Dashboard → Database → Replication. |

---

## Database Schema

```sql
-- National teams
CREATE TABLE national_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  flag_url TEXT,
  group_name TEXT,
  api_football_id INTEGER UNIQUE
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT CHECK (position IN ('GK','DEF','MID','FWD')),
  national_team_id UUID REFERENCES national_teams(id),
  value NUMERIC DEFAULT 10.0,
  api_football_id INTEGER UNIQUE
);

-- Leagues
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code UUID DEFAULT gen_random_uuid() UNIQUE,
  admin_user_id UUID REFERENCES auth.users(id),
  max_teams INT DEFAULT 20,
  budget_cap NUMERIC DEFAULT 100.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scoring rules (per league)
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  event_type TEXT NOT NULL,
  points NUMERIC NOT NULL
);

-- League members
CREATE TABLE league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  user_id UUID REFERENCES auth.users(id),
  team_name TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(league_id, user_id)
);

-- Fantasy teams
CREATE TABLE fantasy_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  user_id UUID REFERENCES auth.users(id),
  total_points NUMERIC DEFAULT 0
);

-- Players selected per fantasy team
CREATE TABLE fantasy_team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES fantasy_teams(id),
  player_id UUID REFERENCES players(id),
  is_starting BOOLEAN DEFAULT true
);

-- Matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES national_teams(id),
  away_team_id UUID REFERENCES national_teams(id),
  match_date TIMESTAMPTZ,
  stage TEXT CHECK (stage IN ('group','round_of_16','quarter','semi','final')),
  api_football_id INTEGER UNIQUE
);

-- Match stats (admin-entered or synced from API-Football)
CREATE TABLE match_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  match_id UUID REFERENCES matches(id),
  goals INT DEFAULT 0,
  assists INT DEFAULT 0,
  passes INT DEFAULT 0,
  yellow_cards INT DEFAULT 0,
  red_cards INT DEFAULT 0,
  fouls INT DEFAULT 0,
  clean_sheet BOOLEAN DEFAULT false,
  UNIQUE(player_id, match_id)
);

-- Draft sessions (one per league)
CREATE TABLE draft_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  status TEXT CHECK (status IN ('waiting','active','completed')) DEFAULT 'waiting',
  current_pick_number INT DEFAULT 1,
  current_user_id UUID REFERENCES auth.users(id),
  pick_deadline TIMESTAMPTZ,
  snake_order JSONB DEFAULT '[]',   -- ordered array of user_id strings
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Individual draft picks
CREATE TABLE draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_session_id UUID REFERENCES draft_sessions(id) ON DELETE CASCADE,
  pick_number INT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  player_id UUID REFERENCES players(id),
  picked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(draft_session_id, pick_number)   -- race-condition guard
);
```

---

## Draft System

### Flow
1. League admin clicks **"Iniciar Draft"** on the admin page → `initDraft()` server action
2. Members are Fisher-Yates shuffled into a random `snake_order`
3. Session created with `status = 'waiting'`; all members land on `/leagues/[id]/draft`
4. Admin clicks **"Comenzar Draft"** → `startDraft()` sets `status = 'active'`, `pick_deadline = now+60s`
5. Members pick players until all 19 roster slots per team are filled
6. `finalizeDraft()` populates `fantasy_team_players` from `draft_picks` and sets `status = 'completed'`

### Snake order formula
```ts
function getPickUser(snakeOrder: string[], pickNumber: number): string {
  const n = snakeOrder.length
  const idx = pickNumber - 1
  const round = Math.floor(idx / n)
  const pos   = idx % n
  return round % 2 === 0 ? snakeOrder[pos] : snakeOrder[n - 1 - pos]
}
// Round 0: 1,2,3…N  |  Round 1: N,N-1…1  |  Round 2: 1,2,3…N  |  …
```

### Roster structure (19 players per team)
| Position | Starting | Bench | Total |
|---|---|---|---|
| GK | 1 | 1 | 2 |
| DEF | 4 | 2 | 6 |
| MID | 3 | 2 | 5 |
| FWD | 3 | 3 | 6 |
| **Total** | **11** | **8** | **19** |

Starting vs bench is determined at `finalizeDraft` by pick order within each position: the first N picks of a given position for a given user are starters, the rest are bench.

### Auto-pick (timer expiry)
- Each client runs a 60-second countdown tied to `pick_deadline`
- When it hits 0, **every connected client** calls `autoPick()` server action
- The server checks: deadline passed? pick not already recorded for this `pick_number`?
- The `UNIQUE(draft_session_id, pick_number)` constraint lets only one insert land; all others fail gracefully
- Best available player is chosen by position needed (GK→DEF→MID→FWD priority) sorted by `value` desc

### Realtime subscription (`DraftRoom.tsx`)
```ts
supabase.channel(`draft-${sessionId}`)
  .on('postgres_changes', { table: 'draft_sessions', filter: `id=eq.${sessionId}` },
      payload => setSession(payload.new))
  .on('postgres_changes', { event: 'INSERT', table: 'draft_picks', filter: `draft_session_id=eq.${sessionId}` },
      payload => { setPickedPlayerIds(…); setPicks(…) })
  .subscribe()
```

### Optimistic UI updates
Two separate state values ensure instant feedback:

| State | Updated when | Used for |
|---|---|---|
| `pickedPlayerIds: Set<string>` | Immediately on click (before server action) AND on every Realtime INSERT | Filtering the available player list — never stale |
| `picks: IDraftPick[]` | After `makePick` resolves (optimistic) OR on Realtime INSERT | Roster panel at the bottom of the draft room |

If `makePick` returns an error, `pickedPlayerIds` is reverted and the player reappears in the list.

### Player list performance
- `availablePlayers` is computed with `useMemo` — recalculates only when `pickedPlayerIds`, `posFilter`, or `search` changes (not on every countdown tick)
- Only **50 players** are mounted at a time; a "Cargar más" button increments the window
- Filter/search changes reset `visibleCount` to 50 so results always start from the top
- Individual player rows are wrapped in `React.memo` with a `useCallback`-stable `onPick` handler, so countdown ticks (every 500 ms) do not cause the list to re-render

---

## Core Features Status

| Feature | Status |
|---|---|
| Landing page | ✅ Done |
| Auth (register, login, logout, callback) | ✅ Done |
| League create / invite / join | ✅ Done |
| League detail + leaderboard | ✅ Done |
| Admin panel | ✅ Done (scoring rules display; draft initiation) |
| API-Football sync routes | ✅ Done |
| Snake draft room (Realtime) | ✅ Done |
| Live scoring (match stats → fantasy points) | ⬜ Pending |
| Team builder post-draft (edit starting XI) | ⬜ Pending |
| Admin scoring rules editor (CRUD) | ⬜ Pending |
| Admin match stats entry | ⬜ Pending |
| Per-matchday points breakdown | ⬜ Pending |
| Player pricing model (dynamic values) | ⬜ Pending |

---

## Code Conventions
- Components: PascalCase, one per file
- Functions/hooks: camelCase
- Types: PascalCase, interfaces prefixed with `I` (e.g. `ILeague`, `IPlayer`)
- No `any` types — always define proper interfaces in `/src/types/`
- API routes in `/src/app/api/` following REST conventions
- Always wrap Supabase calls in try/catch with typed error returns
- Comments in English
- Dark theme throughout: `bg-gray-950` base, `bg-gray-900/60` cards, `border-gray-800/60`, green accents

---

## What NOT to do
- Do NOT use Pages Router — App Router only
- Do NOT store Supabase keys in code — always use `process.env`
- Do NOT use `useEffect` for data fetching — use Server Components
- Do NOT build custom auth — use Supabase Auth
- Do NOT hardcode scoring values — always read from `scoring_rules` table
- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the client (never `NEXT_PUBLIC_`)
- Do NOT expose `API_FOOTBALL_KEY` to the client (no `NEXT_PUBLIC_` prefix)
- Do NOT call the API-Football base URL directly — use `src/lib/api-football/client.ts`
- Do NOT seed `national_teams`, `players`, or `matches` manually — sync from API-Football
- Do NOT name the middleware file `middleware.ts` — Next.js 16 uses `proxy.ts` with `export async function proxy()`

---

## RLS Policy Reminders
- All tables have RLS enabled
- Reference tables (`national_teams`, `players`, `matches`): any authenticated user can read and upsert (for sync routes)
- `leagues`, `league_members`, `fantasy_teams`, `fantasy_team_players`: any authenticated user can read; writes are scoped to owner/admin
- `draft_sessions`: any authenticated league member can read and update; only league admin can insert
- `draft_picks`: any authenticated user can read and insert (server actions validate turn order)

---

## NPM Commands
```bash
npm run dev        # Local dev server → localhost:3000
npm run build      # Production build (run after each feature)
npm run lint       # ESLint check
```

---

## Claude Code Workflow
- Build one feature at a time
- Run `npm run build` after each feature to catch TypeScript errors early
- Prefer Server Components by default; use `"use client"` only for interactive components
- Ask before creating new DB tables — check schema above first
- Player/team data comes from API-Football sync routes, not a seed script
- Draft room (`DraftRoom.tsx`) is intentionally `"use client"` — Realtime requires browser APIs

---

## Known Issues / Next Steps

### Pending features
- **Live scoring engine** — calculate `fantasy_teams.total_points` from `match_stats × scoring_rules` after each match; update leaderboard in real-time
- **Team builder post-draft** — let users swap starters/bench, view full squad by position
- **Admin scoring rules editor** — CRUD UI on the admin page (currently read-only)
- **Admin match stats entry** — form to enter goals/assists/cards per player per match
- **Per-matchday breakdown** — show points earned per match per user on the league detail page
- **Player pricing model** — all players currently default to `value = 10.0`; needs a pricing system before the budget cap is meaningful
- **Mobile layout for draft room** — the draft room is optimised for desktop; mobile needs a tab-based layout

### Known technical debt
- Sync routes (`/api/sync/*`) currently have **no auth guard** — they were temporarily opened for the initial data sync. Re-add authentication before deploying.
- `draft_sessions` and `draft_picks` need Realtime enabled manually in the Supabase dashboard (Database → Replication) — this step is outside migrations.
- `SUPABASE_SERVICE_ROLE_KEY` is not configured — admin operations use anon key + permissive RLS. Tighten once the service role key is added.
