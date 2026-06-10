import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { finalizeDraft } from '@/lib/draft/advance'
import DraftRoom from './DraftRoom'

type Props = { params: Promise<{ id: string }> }

export default async function DraftPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: league } = await supabase
    .from('leagues')
    .select('id, name, admin_user_id')
    .eq('id', id)
    .single()
  if (!league) notFound()

  // Must be a member
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) redirect('/leagues')

  // Must have a session
  const { data: draftSession } = await supabase
    .from('draft_sessions')
    .select('*')
    .eq('league_id', id)
    .maybeSingle()
  if (!draftSession) redirect(`/leagues/${id}/admin`)

  // Self-heal: if the draft completed but the rosters were never created
  // (e.g. the finalize insert was rejected by RLS), retry on page load.
  // finalizeDraft is idempotent — it no-ops if roster rows already exist.
  if (draftSession.status === 'completed') {
    const result = await finalizeDraft(supabase, draftSession.id, id)
    if (result.error) {
      console.log(`[draft/page] finalize retry failed: ${result.error}`)
    }
  }

  // Initial data — kept live via Realtime inside DraftRoom
  const [{ data: picks }, { data: players }, { data: members }] = await Promise.all([
    supabase
      .from('draft_picks')
      .select('*')
      .eq('draft_session_id', draftSession.id)
      .order('pick_number', { ascending: true }),
    supabase
      .from('players')
      .select('id, name, position, value, api_football_id, national_team_id, national_teams(name, flag_url)')
      .order('value', { ascending: false }),
    supabase
      .from('league_members')
      .select('user_id, team_name')
      .eq('league_id', id),
  ])

  // Supabase types the nested relation as an array; normalise to single object | null
  const normalisedPlayers = (players ?? []).map(p => ({
    ...p,
    national_teams: Array.isArray(p.national_teams)
      ? (p.national_teams[0] ?? null)
      : p.national_teams,
  }))

  return (
    <DraftRoom
      leagueId={id}
      leagueName={league.name}
      isAdmin={league.admin_user_id === user.id}
      initialSession={draftSession as Parameters<typeof DraftRoom>[0]['initialSession']}
      initialPicks={(picks ?? []) as Parameters<typeof DraftRoom>[0]['initialPicks']}
      players={normalisedPlayers as Parameters<typeof DraftRoom>[0]['players']}
      leagueMembers={members ?? []}
      currentUserId={user.id}
    />
  )
}
