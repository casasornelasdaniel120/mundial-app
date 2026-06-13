# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview
Fantasy football league app for the 2026 World Cup. Users create a league, invite friends via a unique link, draft real World Cup players in a live snake draft, and compete by accumulating fantasy points based on real match statistics.

**Stack:** Next.js 16 App Router · TypeScript (strict) · Tailwind CSS · Supabase (PostgreSQL + Auth + Realtime) · API-Football v3

---

## NPM Commands
```bash
npm run dev        # Local dev server → localhost:3000
npm run build      # Production build — run after each feature to catch TypeScript errors
npm run lint       # ESLint check
```
No test suite exists yet.

---

## Deployment
- **Hosted on Vercel** — production URL: https://mundial-app-umber.vercel.app (project `mundial-app`)
- **Required environment variables** (Vercel → Project Settings → Environment Variables, mirroring `.env.local`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `API_FOOTBALL_KEY` — server-side only, never `NEXT_PUBLIC_`
  - `NEXT_PUBLIC_APP_URL` — public origin used for auth redirects (`emailRedirectTo`, callback). `http://localhost:3000` in `.env.local`, the Vercel production URL in production
- **Supabase Dashboard → Authentication → URL Configuration:** Site URL and Redirect URLs must match the production URL exactly (include `https://mundial-app-umber.vercel.app/auth/callback` in Redirect URLs) — otherwise confirmation emails and OAuth land on localhost
- Per-environment manual steps: run migrations in the SQL Editor and enable Realtime for `draft_sessions`/`draft_picks` (see Migrations below)
- ⚠️ Before going public: sync routes have no auth guard and the draft flow still has debug `console.log` tracing (see Known Technical Debt)

---

## Supabase Project
- **Project ID:** `jrviddestqlarykyoyfn`
- **API URL:** `https://jrviddestqlarykyoyfn.supabase.co`
- All keys in `.env.local` — never hardcode

---

## API-Football
- **Base URL:** `https://v3.football.api-sports.io`
- **Auth header:** `x-apisports-key` — server-side only (`API_FOOTBALL_KEY` in `.env.local`, never `NEXT_PUBLIC_`)
- **World Cup IDs:** `league=1`, `season=2026`
- **Free tier:** 100 requests/day — sync routes are called manually, never on page load; results are cached in Supabase
- All calls go through `src/lib/api-football/client.ts` — never call the base URL directly from pages or components

### Endpoints in use
| Endpoint | Purpose |
|---|---|
| `GET /teams?league=1&season=2026` | Upsert 32 national teams |
| `GET /players/squads?team=<id>` | Upsert squad per team |
| `GET /fixtures?league=1&season=2026` | Upsert matches |
| `GET /fixtures?live=all` | Poll in-progress matches |
| `GET /fixtures/events?fixture=<id>` | Goals/cards for a finished match |

---

## Architecture

### Route layout — all pages built
```
src/app/
  page.tsx             → / — landing page
  (auth)/              → /login, /register — dark auth pages; actions.ts has signIn/signUp
                          fonts.ts exports Russo One + Chakra Petch (next/font/google) used by the auth layout
  (dashboard)/         → Protected layout with dark nav + auth guard
    leagues/           → /leagues list; /leagues/new create form; actions.ts has createLeague/joinLeague
    leagues/[id]/      → League detail + leaderboard + admin actions (DeleteLeagueButton,
                          KickMemberButton; actions.ts has deleteLeague/kickMember)
    leagues/[id]/admin/   → Admin panel; actions.ts has initDraft
    leagues/[id]/draft/   → Live snake draft room (Realtime); actions.ts has startDraft/makePick/autoPick;
                            page self-heals finalizeDraft on load if completed
    leagues/[id]/my-team/ → Roster list + lineup editor (LineupManager), team rename (RenameTeamForm),
                            per-matchday points breakdown; actions.ts has saveLineup/updateTeamName
  api/
    sync/teams|players|fixtures/  → Manual data sync from API-Football (GET)
    draft/advance/                → POST — advances draft turn after a pick; runs autopick safety net
    draft/autopick/               → POST — auto-picks for an expired turn (league member auth required)
  join/[invite_code]/  → League info + join form (asks for team name)
  auth/callback/       → Supabase OAuth/magic-link code exchange
```

### Server Actions pattern
Each feature group co-locates its mutations in `actions.ts` with `'use server'`. These are called directly from Client Components via `useTransition`. The pattern:
1. Validate auth with `supabase.auth.getUser()`
2. Validate ownership/membership in DB before mutating
3. Call `revalidatePath()` on success

### Middleware (proxy)
`src/proxy.ts` exports `async function proxy()` — **not** `middleware.ts` / `middleware()`. Next.js 16 uses the `proxy` export name. It refreshes the Supabase session on every request (always call `getUser()` inside) and redirects unauthenticated users away from protected routes (`/leagues`, `/dashboard`, `/team`, `/join`).

### Supabase clients
- **Server:** `src/lib/supabase/server.ts` — `createClient()` reads/writes cookies via `next/headers`; use in Server Components, Server Actions, and Route Handlers
- **Browser:** `src/lib/supabase/client.ts` — `createClient()` for Client Components (Realtime, interactive state)

### Data flow
- Pages are Server Components by default; they fetch data directly via the server Supabase client
- Use `"use client"` only for interactive/Realtime components (`DraftRoom.tsx`, `LineupManager.tsx`, `InviteLinkButton.tsx`, `LogoutButton.tsx`, join form)
- Do not use `useEffect` for data fetching — use Server Components
- Player photo URLs: `https://media.api-sports.io/football/players/${api_football_id}.png`

---

## Draft System

### Flow
1. Admin clicks **"Iniciar Draft"** → `initDraft()` Fisher-Yates shuffles members into `snake_order`, creates session with `status='waiting'`
2. Admin clicks **"Comenzar Draft"** → `startDraft()` sets `status='active'`, `pick_deadline=now+60s`; after the action resolves, `DraftRoom` immediately refetches the session via the browser Supabase client to transition the UI without waiting for the Realtime event
3. Members pick players; each pick calls `makePick()` → `applyPick()` → `advanceDraftTurn()`
4. When all 19 × N picks are done, `advanceDraftTurn()` sets `status='completed'` and calls `finalizeDraft()` to populate `fantasy_team_players`

### `src/lib/draft/` — shared draft logic
- `snake.ts` — `getPickUser(snakeOrder, pickNumber)`: odd rounds go forward, even rounds go backward
- `advance.ts` — `advanceDraftTurn()`: updates `current_pick_number`, `current_user_id`, `pick_deadline` in a single conditional update (optimistic concurrency — uses `.eq('current_pick_number', pickNumber)` to prevent double-advance). Also contains `finalizeDraft()`.
- `autopick.ts` — `performAutoPick()`: validates deadline passed + idempotency, picks best available player for the most-needed position, inserts, then advances. Treats a `23505` unique-violation as a graceful no-op (lost race).

`advanceDraftTurn` is called from: `applyPick()` (after a manual pick), `performAutoPick()`, and `api/draft/advance/route.ts`. All calls are idempotent — the conditional UPDATE makes duplicates no-ops.

### Turn advancement flow
1. `makePick` validates `current_user_id === auth user` server-side (fresh session read) before inserting — out-of-turn picks are rejected regardless of UI state
2. After the pick insert, `applyPick` advances the turn server-side; the picking client also POSTs `/api/draft/advance` immediately, and every client POSTs it on the Realtime `draft_picks` INSERT as a fallback
3. On timer expiry, **only the current turn's client** POSTs `/api/draft/autopick` with `{ sessionId, userId, pickNumber }` (no stampede). Every other client schedules a **3-second safety fallback** that POSTs `/api/draft/advance` (covers the active user being disconnected); the timeout is cancelled when the turn advances. Any residual race is resolved server-side via the `UNIQUE(draft_session_id, pick_number)` constraint

### Realtime subscription
`DraftRoom.tsx` uses a **single channel** (`draft-${sessionId}`) with **two `postgres_changes` listeners**:
- **UPDATE on `draft_sessions`** filtered by `id=eq.${sessionId}` — replaces local session state; drives the turn indicator, upcoming-picks queue, and the countdown. The countdown is **derived from `pick_deadline`** (synced via an effect watching `current_pick_number`/`pick_deadline`), never reset to a hardcoded 60 — so it stays correct after reconnects mid-turn
- **INSERT on `draft_picks`** filtered by `draft_session_id=eq.${sessionId}` — removes the player from every client's available list and updates the roster panel

**Realtime requirements (per environment):** both `draft_sessions` and `draft_picks` must be in the `supabase_realtime` publication (Dashboard → Database → Replication, or `ALTER PUBLICATION supabase_realtime ADD TABLE …`). Because both tables have RLS, the client calls `supabase.realtime.setAuth(accessToken)` **before** subscribing — without it the channel reports SUBSCRIBED but events are silently filtered out.

Two separate state values for optimistic UI:
- `pickedPlayerIds: Set<string>` — updated immediately on click AND on every Realtime INSERT; used to filter the player list
- `picks: IDraftPick[]` — updated after `makePick` resolves (optimistic) OR on Realtime INSERT; drives the roster panel

### Reconnection handling
The `.subscribe()` status callback tracks channel health: `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED` set `isConnected=false` and flag the drop (`hadDisconnectRef`); supabase-js auto-rejoins. When `SUBSCRIBED` returns after a flagged drop, `resyncFromServer()` runs:
1. Re-fetches the session and **all** picks from the server, replacing local state wholesale (recovers picks missed while offline) and rebuilding `pickedPlayerIds`
2. Syncs the countdown from the real `pick_deadline` remainder (the turn may be half-elapsed)
3. POSTs `/api/draft/autopick` as a recovery check — a no-op server-side unless the deadline actually expired while offline

### Roster (19 players per team)
| Position | Starters | Bench | Total |
|---|---|---|---|
| GK | 1 | 1 | 2 |
| DEF | 4 | 2 | 6 |
| MID | 3 | 2 | 5 |
| FWD | 3 | 3 | 6 |

`finalizeDraft` assigns starter/bench by pick order within each position: first N picks of a given position are starters, the rest are bench.

---

## My Team (`/leagues/[id]/my-team`)
Server Component page that:
1. Loads the user's roster via `fantasy_team_players` joined to `players` and `national_teams`
2. Calculates per-player and per-matchday points from `match_stats × scoring_rules` entirely in the page (no separate scoring function)
3. Renders `LineupManager` (Client Component) for starter/bench swaps — swaps are optimistic (local state), saved in batch via `saveLineup()` server action
4. Shows a collapsible matchday breakdown table

---

## Database Schema (summary)
| Table | Key columns |
|---|---|
| `national_teams` | `id`, `name`, `flag_url`, `group_name`, `api_football_id` |
| `players` | `id`, `name`, `position` (GK/DEF/MID/FWD), `national_team_id`, `value`, `api_football_id` |
| `leagues` | `id`, `name`, `invite_code`, `admin_user_id`, `max_teams`, `budget_cap` |
| `scoring_rules` | `league_id`, `event_type`, `points` — always read from DB, never hardcode |
| `league_members` | `league_id`, `user_id`, `team_name` — UNIQUE(league_id, user_id) |
| `fantasy_teams` | `league_id`, `user_id`, `total_points` |
| `fantasy_team_players` | `team_id`, `player_id`, `is_starting` |
| `matches` | `home_team_id`, `away_team_id`, `match_date`, `stage`, `api_football_id` |
| `match_stats` | `player_id`, `match_id`, goals/assists/passes/yellow_cards/red_cards/fouls/clean_sheet — UNIQUE(player_id, match_id) |
| `draft_sessions` | `league_id`, `status` (waiting/active/completed), `current_pick_number`, `current_user_id`, `pick_deadline`, `snake_order` (JSONB array of user_id strings) |
| `draft_picks` | `draft_session_id`, `pick_number`, `user_id`, `player_id` — UNIQUE(draft_session_id, pick_number) |

### Migrations (`supabase/migrations/`, run in order via the SQL Editor)
| File | What it does |
|---|---|
| `001_initial_schema.sql` | All core tables (`national_teams` → `match_stats`) + RLS enabled with owner-scoped write policies |
| `002_simplify_read_policies.sql` | Replaces recursive `league_members` self-join read policies with simple `auth.uid() IS NOT NULL` reads on `leagues`, `league_members`, `fantasy_teams`, `fantasy_team_players` |
| `003_add_external_ids.sql` | Adds `api_football_id INTEGER UNIQUE` to `national_teams`/`players`/`matches` + write policies for the sync routes |
| `004_draft.sql` | Creates `draft_sessions` + `draft_picks` with `REPLICA IDENTITY FULL`; draft RLS policies. **After running:** enable Realtime for both tables (Dashboard → Database → Replication) |
| `005_fix_write_policies.sql` | Fixes silently-failing writes: `fantasy_team_players` INSERT now allowed for any league member (required by `finalizeDraft`); adds admin DELETE policies on `league_members`/`fantasy_teams`/`fantasy_team_players`/`draft_sessions`/`draft_picks` (kick member, delete league) |

### RLS summary
- All tables have RLS enabled
- `national_teams`, `players`, `matches`: any authenticated user can read and upsert (sync routes)
- `leagues`, `league_members`, `fantasy_teams`, `fantasy_team_players`: any authenticated user can read
- `fantasy_team_players` writes (005): INSERT by any league member (required by `finalizeDraft`, which inserts rows for every team while running as one user); UPDATE owner-only; DELETE owner or league admin
- `league_members` / `fantasy_teams` / `draft_sessions` / `draft_picks` DELETE (005): league admin (kick member, delete league)
- `draft_sessions`: league members can read and update; only admin can insert
- `draft_picks`: any authenticated user can read and insert (server actions enforce turn order)

**Gotcha:** an RLS-blocked DELETE/UPDATE fails *silently* (0 rows affected, no error). An RLS-blocked INSERT fails the whole statement. `finalizeDraft` was originally broken by the owner-only write policy — any multi-user write needs a policy that covers the *executing* user, not the row owners.

---

## Types
All DB interfaces are in `src/types/db.ts` (prefixed with `I`: `ILeague`, `IPlayer`, `IDraftSession`, etc.). API-Football response interfaces are in `src/types/api-football.ts`. Never use `any`.

---

## Feature Status
| Feature | Status |
|---|---|
| Landing page | ✅ Done |
| Auth (register, login, logout, callback) | ✅ Done |
| League create / invite / join | ✅ Done |
| League detail + leaderboard | ✅ Done (UI; standings stay at 0 points until the scoring engine exists) |
| Admin panel (scoring rules display, draft init) | ✅ Done |
| API-Football sync routes | ✅ Done |
| Snake draft room (Realtime) | ✅ Done — turn advance, auto-pick, and live sync verified working |
| Team builder post-draft (`/my-team`) | ✅ Done |
| Live scoring engine (match stats → `total_points` → live leaderboard) | ⬜ Pending |
| Admin scoring rules editor (CRUD) | ⬜ Pending |
| Admin match stats entry | ⬜ Pending |
| Per-matchday points breakdown (league detail) | ⬜ Pending |
| Player pricing model (dynamic values) | ⬜ Pending |
| Mobile layout for draft room | ✅ Done — below `md` a sticky two-tab bar ('Jugadores' = player list, 'Cola' = turn indicator + queue) switches panels; roster bar always fixed at bottom; desktop keeps the 3-column grid |

---

## Known Technical Debt
- Sync routes (`/api/sync/*`) have **no auth guard** — temporarily opened for initial data load; add auth before deploying
- `SUPABASE_SERVICE_ROLE_KEY` is not configured — admin operations use anon key + permissive RLS; tighten when the key is added
- Realtime publication membership for `draft_sessions`/`draft_picks` is a manual per-environment step (not part of migrations) — see Realtime requirements above
- The draft flow (`DraftRoom.tsx`, `lib/draft/*`, `api/draft/*`) contains verbose `console.log` tracing added during debugging — including a per-render log that fires twice per second during a draft; strip before deploying
- All players default to `value = 10.0`; the budget cap is not meaningful until a pricing system exists

---

## Code Conventions
- **Components:** PascalCase, one per file
- **Functions/hooks:** camelCase
- **Types:** PascalCase, interfaces prefixed with `I`
- **Theme:** `bg-gray-950` base, `bg-gray-900/60` cards, `border-gray-800/60`, green accents (`green-400`/`green-600`)
- **Auth pages typography:** Russo One (headings/CTAs) + Chakra Petch (body/labels) via `next/font/google`; defined in `src/app/(auth)/fonts.ts` and applied as CSS variables (`--font-russo`, `--font-chakra`) from the auth layout
- **Icons:** Use SVG (Heroicons style) — never emoji as UI icons
- Always wrap Supabase calls in try/catch or check `.error`
- Ask before creating new DB tables — check the schema above first
- Player/team data comes from API-Football sync routes, not seed scripts
