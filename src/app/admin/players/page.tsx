import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'
import PlayersClient from './PlayersClient'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

export default async function AdminPlayersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: rawPlayers }, { data: rawTeams }, { data: seasons }] = await Promise.all([
    supabase
      .from('players')
      .select('id, first_name, last_name, date_of_birth, player_team_seasons(id, team_id, season_id, teams(id, name, type, founding_age_group, founding_season_id, age_group), seasons(id, name, is_current))')
      .order('last_name', { ascending: true }),
    supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
  ])

  const seasonsList = seasons ?? []

  const players = (rawPlayers ?? []).map(p => ({
    id: p.id,
    first_name: p.first_name,
    last_name: p.last_name,
    date_of_birth: (p as any).date_of_birth ?? null,
    teamSeasons: ((p as any).player_team_seasons ?? []).map((ts: any) => ({
      id: ts.id,
      team_id: ts.team_id,
      season_id: ts.season_id,
      teamName: ts.teams ? teamDisplayName(ts.teams, seasonsList) : '—',
      seasonName: ts.seasons?.name ?? '—',
    })),
  }))

  const teams = (rawTeams ?? []).map(t => ({
    id: t.id,
    displayName: teamDisplayName(t as any, seasonsList),
  })).sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <PlayersClient players={players} teams={teams} seasons={seasonsList} />
      </div>
    </AppShell>
  )
}
