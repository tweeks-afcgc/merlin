import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { teamDisplayName } from '@/lib/teamUtils'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'
import AdminTeamsClient from './AdminTeamsClient'

export const dynamic = 'force-dynamic'

export default async function AdminTeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: rawTeams }, { data: seasons }] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
  ])

  const currentSeason = seasons?.find(s => s.is_current) ?? null

  const SENIOR_ORDER = ['First XI', 'Sunday XI', 'Vets XI', 'Women']
  const sortedSeasons = [...(seasons ?? [])]
  const currentIdx = sortedSeasons.findIndex(s => s.is_current)

  function teamSortKey(team: NonNullable<typeof rawTeams>[number]) {
    if ((team as any).type === 'senior') {
      const idx = SENIOR_ORDER.indexOf((team as any).name)
      return `0_${idx === -1 ? 9 : idx}_${(team as any).name}`
    }
    const foundingAge = (team as any).founding_age_group ?? 0
    const foundingIdx = sortedSeasons.findIndex(s => s.id === (team as any).founding_season_id)
    const age = foundingIdx === -1 || currentIdx === -1 ? foundingAge : foundingAge + (currentIdx - foundingIdx)
    return `1_${String(999 - age).padStart(4, '0')}_${(team as any).name}`
  }

  const teams = [...(rawTeams ?? [])]
    .sort((a, b) => teamSortKey(a).localeCompare(teamSortKey(b)))
    .map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      founding_age_group: (t as any).founding_age_group ?? null,
      founding_season_id: (t as any).founding_season_id ?? null,
      age_group: (t as any).age_group ?? null,
      display_name: teamDisplayName(t, seasons ?? []),
    }))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <AdminTeamsClient
          teams={teams}
          seasons={seasons ?? []}
          currentSeason={currentSeason ?? null}
        />
      </div>
    </AppShell>
  )
}
