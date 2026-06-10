'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function initDraft(leagueId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('admin_user_id')
    .eq('id', leagueId)
    .single()

  if (!league || league.admin_user_id !== user.id) {
    throw new Error('Solo el admin puede iniciar el draft.')
  }

  // Prevent duplicate sessions
  const { data: existing } = await supabase
    .from('draft_sessions')
    .select('id')
    .eq('league_id', leagueId)
    .maybeSingle()

  if (existing) redirect(`/leagues/${leagueId}/draft`)

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members?.length) throw new Error('La liga no tiene miembros.')

  // Fisher-Yates shuffle for a random snake order
  const order = members.map(m => m.user_id as string)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const { data: session, error } = await supabase
    .from('draft_sessions')
    .insert({
      league_id: leagueId,
      status: 'waiting',
      current_pick_number: 1,
      current_user_id: order[0],
      snake_order: order,
    })
    .select('id')
    .single()

  if (error || !session) throw new Error(error?.message ?? 'Error al crear el draft.')

  redirect(`/leagues/${leagueId}/draft`)
}
