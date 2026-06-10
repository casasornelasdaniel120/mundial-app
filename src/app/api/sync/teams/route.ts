import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchTeams, fetchStandings } from '@/lib/api-football/client'

export async function GET() {
  console.log('API_FOOTBALL_KEY:', process.env.API_FOOTBALL_KEY)

  const supabase = await createClient()

  try {
    // Fetch teams and standings concurrently; standings may not exist yet pre-tournament.
    const [teamsData, standingsData] = await Promise.all([
      fetchTeams(),
      fetchStandings().catch(() => null),
    ])

    // Build api_football_team_id → group name map from standings when available.
    const groupMap = new Map<number, string>()
    if (standingsData && standingsData.results > 0 && standingsData.response[0]) {
      standingsData.response[0].league.standings
        .flat()
        .forEach(entry => groupMap.set(entry.team.id, entry.group))
    }

    const rows = teamsData.response.map(({ team }) => ({
      api_football_id: team.id,
      name: team.name,
      flag_url: team.logo,
      group_name: groupMap.get(team.id) ?? null,
    }))

    const { error } = await supabase
      .from('national_teams')
      .upsert(rows, { onConflict: 'api_football_id' })

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, upserted: rows.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
