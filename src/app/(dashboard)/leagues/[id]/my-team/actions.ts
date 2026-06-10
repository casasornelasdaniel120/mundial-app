'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type LineupUpdate = {
  rosterId: string
  isStarting: boolean
}

export async function saveLineup(
  leagueId: string,
  updates: LineupUpdate[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Debes iniciar sesion.' }
  if (!updates.length) return { ok: true }

  const { data: fantasyTeam, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (teamError || !fantasyTeam) {
    return { ok: false, error: 'No se pudo validar tu equipo.' }
  }

  const uniqueUpdates = Array.from(
    new Map(updates.map(update => [update.rosterId, update])).values()
  )
  const rosterIds = uniqueUpdates.map(update => update.rosterId)

  const { data: ownedRows, error: rowsError } = await supabase
    .from('fantasy_team_players')
    .select('id')
    .eq('team_id', fantasyTeam.id)
    .in('id', rosterIds)

  if (rowsError) {
    return { ok: false, error: rowsError.message }
  }

  if ((ownedRows?.length ?? 0) !== rosterIds.length) {
    return { ok: false, error: 'La alineacion contiene jugadores invalidos.' }
  }

  const starters = uniqueUpdates.filter(update => update.isStarting).map(update => update.rosterId)
  const bench = uniqueUpdates.filter(update => !update.isStarting).map(update => update.rosterId)

  const updateCalls = []
  if (starters.length) {
    updateCalls.push(
      supabase
        .from('fantasy_team_players')
        .update({ is_starting: true })
        .eq('team_id', fantasyTeam.id)
        .in('id', starters)
    )
  }
  if (bench.length) {
    updateCalls.push(
      supabase
        .from('fantasy_team_players')
        .update({ is_starting: false })
        .eq('team_id', fantasyTeam.id)
        .in('id', bench)
    )
  }

  const results = await Promise.all(updateCalls)
  const error = results.find(result => result.error)?.error

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/leagues/${leagueId}/my-team`)
  return { ok: true }
}
