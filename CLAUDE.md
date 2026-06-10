# World Cup Fantasy League — CLAUDE.md

## Project Overview
Fantasy football league app for the 2026 World Cup.
Users can create a league, invite others via a unique link, and compete by selecting players.
The league admin configures custom scoring rules (goals, assists, passes, fouls, etc.).
Built with Next.js 14+ App Router, TypeScript, Tailwind CSS, and Supabase (via REST API).

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
- **Framework:** Next.js 14+ with App Router (`/src/app`)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS — utility classes only, no custom CSS files unless necessary
- **Database:** Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Auth:** Supabase Auth (email magic link or email+password)
- **Env vars:** Loaded from `.env.local` via `process.env`

---

## Supabase Client Setup
Create these two files before anything else:

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
  app/                    → Pages and layouts (App Router)
    (auth)/               → Login, register pages
    (dashboard)/          → Protected pages
      leagues/            → League list, create league
      leagues/[id]/       → League detail + leaderboard
      leagues/[id]/admin/ → Admin scoring config panel
      team/               → User's fantasy team builder
    api/                  → API routes (server-side only)
  components/             → Reusable UI components
  lib/
    supabase/
      client.ts           → Browser Supabase client
      server.ts           → Server Supabase client
  types/                  → TypeScript interfaces (db.ts, etc.)
  utils/                  → Helper functions
```

---

## Core Features to Build

### 1. League Management
- Create a league (name, description, max teams)
- Generate unique invite link using UUID (`/join/[invite_code]`)
- Join a league via invite link
- Only the league creator has admin privileges

### 2. Admin Panel (league creator only)
- Configure scoring rules per event:
  - Goal → +5 pts (default, editable)
  - Assist → +3 pts
  - Pass completed → +0.1 pts
  - Yellow card → -1 pt
  - Red card → -3 pts
  - Foul committed → -0.5 pts
  - Clean sheet (GK/DEF) → +4 pts
  - Admin can add custom event types
  - Points can be negative or positive
- View all teams in the league
- Manually enter match stats per player

### 3. Team Builder (per user)
- Each user creates one team per league
- Select players from World Cup roster
- Budget cap enforced (configurable by admin)
- Starting XI + bench

### 4. Scoring & Standings
- Points = stats × scoring_rules (calculated server-side)
- Leaderboard per league
- Per-matchday breakdown per user

### 5. Player Database
- World Cup teams and players seeded in Supabase
- Positions: GK, DEF, MID, FWD
- Player value for budget cap

---

## Database Schema

```sql
-- National teams
CREATE TABLE national_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  flag_url TEXT,
  group_name TEXT
);

-- Players
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT CHECK (position IN ('GK','DEF','MID','FWD')),
  national_team_id UUID REFERENCES national_teams(id),
  value NUMERIC DEFAULT 10.0
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

-- Scoring rules (per league, JSONB or rows)
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id),
  event_type TEXT NOT NULL,  -- 'goal', 'assist', 'yellow_card', etc.
  points NUMERIC NOT NULL    -- can be negative
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
  stage TEXT  -- 'group', 'round_of_16', 'quarter', 'semi', 'final'
);

-- Match stats (entered by admin)
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
```

---

## Code Conventions
- Components: PascalCase, one per file
- Functions/hooks: camelCase
- Types: PascalCase, interfaces prefixed with `I` (e.g. `ILeague`, `IPlayer`)
- No `any` types — always define proper interfaces in `/src/types/`
- API routes in `/src/app/api/` following REST conventions
- Always wrap Supabase calls in try/catch with typed error returns
- Comments in English

---

## What NOT to do
- Do NOT use Pages Router — App Router only
- Do NOT store Supabase keys in code — always use `process.env`
- Do NOT use `useEffect` for data fetching — use Server Components or SWR/React Query
- Do NOT build custom auth — use Supabase Auth
- Do NOT hardcode scoring values — always read from `scoring_rules` table
- Do NOT expose `SUPABASE_SERVICE_ROLE_KEY` to the client (never prefix with `NEXT_PUBLIC_`)

---

## RLS Policy Reminders
Enable Row Level Security on ALL tables. Basic patterns:
- `leagues`: readable by members, writable only by admin
- `scoring_rules`: readable by members, writable only by league admin
- `match_stats`: readable by all members, writable only by league admin
- `fantasy_team_players`: readable by all, writable only by team owner

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
- Prefer Server Components by default
- Use `"use client"` only for interactive components (forms, dropdowns, modals)
- Ask before creating new DB tables — check schema above first
- Seed script for players/teams goes in `/src/lib/supabase/seed.ts`
