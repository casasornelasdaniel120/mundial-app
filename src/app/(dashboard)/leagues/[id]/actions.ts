'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function requireAdmin(
  supabase: SupabaseServerClient,
  leagueId: string
): Promise<{ userId?: string; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Debes iniciar sesión.' }

  const { data: league, error } = await supabase
    .from('leagues')
    .select('admin_user_id')
    .eq('id', leagueId)
    .single()

  if (error || !league) return { error: 'Liga no encontrada.' }
  if (league.admin_user_id !== user.id) {
    return { error: 'Solo el administrador puede realizar esta acción.' }
  }

  return { userId: user.id }
}

export async function deleteLeague(
  leagueId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const admin = await requireAdmin(supabase, leagueId)
  if (admin.error) return { ok: false, error: admin.error }

  // 1. Draft picks (children of draft_sessions)
  const { data: sessions, error: sessionsError } = await supabase
    .from('draft_sessions')
    .select('id')
    .eq('league_id', leagueId)

  if (sessionsError) return { ok: false, error: sessionsError.message }

  const sessionIds = (sessions ?? []).map(s => s.id as string)
  if (sessionIds.length) {
    const { error } = await supabase
      .from('draft_picks')
      .delete()
      .in('draft_session_id', sessionIds)
    if (error) return { ok: false, error: error.message }
  }

  // 2. Draft sessions
  const { error: deleteSessionsError } = await supabase
    .from('draft_sessions')
    .delete()
    .eq('league_id', leagueId)
  if (deleteSessionsError) return { ok: false, error: deleteSessionsError.message }

  // 3. Fantasy team players (children of fantasy_teams)
  const { data: teams, error: teamsError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('league_id', leagueId)

  if (teamsError) return { ok: false, error: teamsError.message }

  const teamIds = (teams ?? []).map(t => t.id as string)
  if (teamIds.length) {
    const { error } = await supabase
      .from('fantasy_team_players')
      .delete()
      .in('team_id', teamIds)
    if (error) return { ok: false, error: error.message }
  }

  // 4. Fantasy teams
  const { error: deleteTeamsError } = await supabase
    .from('fantasy_teams')
    .delete()
    .eq('league_id', leagueId)
  if (deleteTeamsError) return { ok: false, error: deleteTeamsError.message }

  // 5. League members
  const { error: deleteMembersError } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
  if (deleteMembersError) return { ok: false, error: deleteMembersError.message }

  // 6. Scoring rules
  const { error: deleteRulesError } = await supabase
    .from('scoring_rules')
    .delete()
    .eq('league_id', leagueId)
  if (deleteRulesError) return { ok: false, error: deleteRulesError.message }

  // 7. The league itself
  const { error: deleteLeagueError } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)
  if (deleteLeagueError) return { ok: false, error: deleteLeagueError.message }

  revalidatePath('/leagues')
  redirect('/leagues')
}

export async function kickMember(
  leagueId: string,
  memberUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()

  const admin = await requireAdmin(supabase, leagueId)
  if (admin.error) return { ok: false, error: admin.error }
  if (admin.userId === memberUserId) {
    return { ok: false, error: 'No puedes expulsarte a ti mismo.' }
  }

  // Fantasy team players first (children of fantasy_teams)
  const { data: team, error: teamError } = await supabase
    .from('fantasy_teams')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', memberUserId)
    .maybeSingle()

  if (teamError) return { ok: false, error: teamError.message }

  if (team) {
    const { error: playersError } = await supabase
      .from('fantasy_team_players')
      .delete()
      .eq('team_id', team.id)
    if (playersError) return { ok: false, error: playersError.message }

    const { error: deleteTeamError } = await supabase
      .from('fantasy_teams')
      .delete()
      .eq('id', team.id)
    if (deleteTeamError) return { ok: false, error: deleteTeamError.message }
  }

  const { error: deleteMemberError } = await supabase
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('user_id', memberUserId)
  if (deleteMemberError) return { ok: false, error: deleteMemberError.message }

  revalidatePath(`/leagues/${leagueId}`)
  return { ok: true }
}
