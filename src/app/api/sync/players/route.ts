import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPlayersByTeam } from '@/lib/api-football/client'

// API-Football position labels → our DB enum
const POSITION_MAP: Record<string, 'GK' | 'DEF' | 'MID' | 'FWD'> = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'MID',
  Attacker: 'FWD',
}

function toPosition(raw: string | null | undefined): 'GK' | 'DEF' | 'MID' | 'FWD' {
  return POSITION_MAP[raw ?? ''] ?? 'MID'
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

type PlayerRow = {
  api_football_id: number
  name: string
  position: 'GK' | 'DEF' | 'MID' | 'FWD'
  national_team_id: string
  value: number
}

export async function GET() {
  const supabase = await createClient()

  try {
    // Require teams to be synced first so we can resolve api_football_id → UUID.
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

    // api_football_id (number) → our UUID
    const teamIdMap = new Map<number, string>(
      teams.map(t => [t.api_football_id as number, t.id as string])
    )

    const allPlayers: PlayerRow[] = []
    let teamsProcessed = 0

    for (const team of teams) {
      const apiTeamId = team.api_football_id as number
      const teamUuid = teamIdMap.get(apiTeamId)!

      // /players/squads returns the full squad in one request — no pagination needed.
      const data = await fetchPlayersByTeam(apiTeamId)
      const squad = data.response[0]?.players ?? []

      for (const player of squad) {
        allPlayers.push({
          api_football_id: player.id,
          name: player.name,
          position: toPosition(player.position),
          national_team_id: teamUuid,
          value: 10.0,
        })
      }

      teamsProcessed++
    }

    // Upsert in batches of 200 to stay within PostgREST limits.
    let upserted = 0
    for (const batch of chunk(allPlayers, 200)) {
      const { error } = await supabase
        .from('players')
        .upsert(batch, { onConflict: 'api_football_id' })

      if (error) throw new Error(error.message)
      upserted += batch.length
    }

    return NextResponse.json({ ok: true, upserted, teams_processed: teamsProcessed })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
