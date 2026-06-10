import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchFixtures } from '@/lib/api-football/client'
import type { IMatch } from '@/types/db'

type Stage = IMatch['stage']

// Maps API-Football round strings to our stage enum.
// Examples: "Group Stage - 1", "Round of 16", "Quarter-finals", "Semi-finals", "Final"
function toStage(round: string): Stage {
  const r = round.toLowerCase()
  if (r.includes('group')) return 'group'
  if (r.includes('16')) return 'round_of_16'
  if (r.includes('quarter')) return 'quarter'
  if (r.includes('semi')) return 'semi'
  if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 'final'
  return null
}

type MatchRow = {
  api_football_id: number
  home_team_id: string
  away_team_id: string
  match_date: string
  stage: Stage
}

export async function GET() {
  const supabase = await createClient()

  try {
    // Require teams to be synced first so foreign keys can be resolved.
    const { data: teams, error: teamsError } = await supabase
      .from('national_teams')
      .select('id, api_football_id')
      .not('api_football_id', 'is', null)

    if (teamsError) throw new Error(teamsError.message)

    if (!teams?.length) {
      return NextResponse.json(
        { ok: false, error: 'No synced teams found. Run GET /api/sync/teams first.' },
        { status: 400 }
      )
    }

    const teamIdMap = new Map<number, string>(
      teams.map(t => [t.api_football_id as number, t.id as string])
    )

    const fixturesData = await fetchFixtures()

    const rows: MatchRow[] = []
    let skipped = 0

    for (const { fixture, league, teams: { home, away } } of fixturesData.response) {
      const homeUuid = teamIdMap.get(home.id)
      const awayUuid = teamIdMap.get(away.id)

      // Skip if either team hasn't been synced yet.
      if (!homeUuid || !awayUuid) {
        skipped++
        continue
      }

      rows.push({
        api_football_id: fixture.id,
        home_team_id: homeUuid,
        away_team_id: awayUuid,
        match_date: fixture.date,
        stage: toStage(league.round),
      })
    }

    const { error } = await supabase
      .from('matches')
      .upsert(rows, { onConflict: 'api_football_id' })

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, upserted: rows.length, skipped })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
