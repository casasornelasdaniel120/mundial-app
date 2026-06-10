'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DEFAULT_SCORING_RULES = [
  { event_type: 'goal', points: 5 },
  { event_type: 'assist', points: 3 },
  { event_type: 'pass', points: 0.1 },
  { event_type: 'yellow_card', points: -1 },
  { event_type: 'red_card', points: -3 },
  { event_type: 'foul', points: -0.5 },
  { event_type: 'clean_sheet', points: 4 },
]

export async function createLeague(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = (formData.get('name') as string).trim()
  const maxTeams = Math.max(2, Math.min(100, parseInt(formData.get('max_teams') as string) || 20))
  const budgetCap = parseFloat(formData.get('budget_cap') as string) || 100.0

  if (!name) return { error: 'League name is required.' }

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .insert({ name, max_teams: maxTeams, budget_cap: budgetCap, admin_user_id: user.id })
    .select('id')
    .single()

  if (leagueError || !league) {
    return { error: leagueError?.message ?? 'Failed to create league.' }
  }

  // Add creator as first member
  await supabase.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    team_name: 'My Team',
  })

  // Create empty fantasy team for creator
  await supabase.from('fantasy_teams').insert({
    league_id: league.id,
    user_id: user.id,
  })

  // Seed default scoring rules
  await supabase.from('scoring_rules').insert(
    DEFAULT_SCORING_RULES.map(r => ({ ...r, league_id: league.id }))
  )

  redirect(`/leagues/${league.id}`)
}

export async function joinLeague(
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const inviteCode = (formData.get('invite_code') as string).trim()
  const teamName = (formData.get('team_name') as string ?? '').trim()

  if (!teamName) return { error: 'El nombre del equipo es obligatorio.' }
  if (teamName.length > 30) return { error: 'El nombre del equipo no puede superar 30 caracteres.' }

  const { data: league, error: leagueError } = await supabase
    .from('leagues')
    .select('id, name, max_teams')
    .eq('invite_code', inviteCode)
    .single()

  if (leagueError || !league) return { error: 'Invite link is invalid or the league no longer exists.' }

  // Check capacity
  const { count } = await supabase
    .from('league_members')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', league.id)

  if (count !== null && count >= league.max_teams) {
    return { error: 'This league is full.' }
  }

  const { error: memberError } = await supabase.from('league_members').insert({
    league_id: league.id,
    user_id: user.id,
    team_name: teamName,
  })

  if (memberError) {
    if (memberError.code === '23505') {
      redirect(`/leagues/${league.id}`)
    }
    return { error: memberError.message }
  }

  await supabase.from('fantasy_teams').insert({
    league_id: league.id,
    user_id: user.id,
  })

  redirect(`/leagues/${league.id}`)
}
