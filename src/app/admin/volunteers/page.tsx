import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'
import VolunteersClient from './VolunteersClient'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

export default async function AdminVolunteersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient()

  const [{ data: rawVolunteers }, { data: rawTeams }, { data: seasons }, { data: allProfiles }] = await Promise.all([
    supabase
      .from('volunteers')
      .select('id, profile_id, first_name, last_name, email, is_app_user, user_role, is_referee, volunteer_roles(id, role_type, role_name, team_id, teams(id, name, type, founding_age_group, founding_season_id, age_group))')
      .order('last_name', { ascending: true }),
    supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
    adminClient.from('profiles').select('id, full_name, email, role'),
  ])

  const seasonsList = seasons ?? []

  // Profiles that don't yet have a volunteer record
  const linkedProfileIds = new Set((rawVolunteers ?? []).map((v: any) => v.profile_id).filter(Boolean))
  const unlinkedProfiles = (allProfiles ?? [])
    .filter(p => !linkedProfileIds.has(p.id))
    .map(p => {
      const parts = (p.full_name ?? '').trim().split(' ')
      const firstName = parts[0] ?? ''
      const lastName = parts.slice(1).join(' ') || ''
      return { id: p.id, first_name: firstName, last_name: lastName, email: p.email ?? null, user_role: (p as any).role ?? null }
    })
    .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))

  const volunteers = (rawVolunteers ?? []).map(v => ({
    id: v.id,
    first_name: v.first_name,
    last_name: v.last_name,
    email: v.email ?? null,
    is_app_user: v.is_app_user,
    user_role: v.user_role ?? null,
    is_referee: v.is_referee,
    roles: ((v as any).volunteer_roles ?? []).map((r: any) => ({
      id: r.id,
      role_type: r.role_type,
      role_name: r.role_name,
      team_id: r.team_id ?? null,
      teamName: r.teams ? teamDisplayName(r.teams, seasonsList) : null,
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
        <VolunteersClient volunteers={volunteers} teams={teams} unlinkedProfiles={unlinkedProfiles} />
      </div>
    </AppShell>
  )
}
