import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import FixturesList from './FixturesList'
import { teamDisplayName, computeAgeGroup } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

export default async function FixturesDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'
  const isFS = profile?.role === 'fixture_secretary'
  if (!isAdmin && !isFS) redirect('/dashboard')

  const today = new Date()
  const in14Days = new Date(today)
  in14Days.setDate(today.getDate() + 14)

  const todayStr = today.toISOString().split('T')[0]
  const in14Str = in14Days.toISOString().split('T')[0]

  const [{ data: rawFixtures }, { data: seasons }, { data: allManagers }] = await Promise.all([
    supabase
      .from('fixtures')
      .select(`
        id, date, kickoff_time, venue, confirmed, pitch_id,
        team_id,
        teams(id, name, type, founding_age_group, founding_season_id, age_group, kit_jersey, kit_shorts, kit_socks),
        club_teams(id, name, clubs(name)),
        venues(name, address),
        pitches(name, pitch_type)
      `)
      .gte('date', todayStr)
      .lte('date', in14Str)
      .order('date', { ascending: true })
      .order('kickoff_time', { ascending: true }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
    supabase.from('team_managers').select('team_id, profiles(full_name)'),
  ])

  // Build a map of team_id -> first manager name
  const managerMap = new Map<string, string>()
  for (const m of allManagers ?? []) {
    if (!managerMap.has(m.team_id)) {
      const name = (m.profiles as any)?.full_name
      if (name) managerMap.set(m.team_id, name)
    }
  }

  const SENIOR_ORDER = ['First XI', 'Sunday XI', 'Vets XI', 'Women']

  const fixtures = (rawFixtures ?? []).map(f => {
    const team = f.teams as any
    const opponent = f.club_teams as any
    const venueData = f.venues as any
    const pitchData = f.pitches as any

    let teamSortKey = ''
    if (team) {
      if (team.type === 'senior') {
        const idx = SENIOR_ORDER.indexOf(team.name)
        teamSortKey = `0_${idx === -1 ? 9 : idx}_${team.name}`
      } else {
        const age = computeAgeGroup(team, seasons ?? []) ?? 0
        teamSortKey = `1_${String(999 - age).padStart(4, '0')}_${team.name}`
      }
    }

    // Age group label for email: "Under 12" for junior, "Senior" for senior
    const ageGroupLabel = team?.type === 'junior'
      ? `Under ${computeAgeGroup(team, seasons ?? []) ?? ''}`
      : 'Senior'

    return {
      id: f.id,
      date: f.date,
      kickoff_time: f.kickoff_time,
      venue: f.venue,
      confirmed: f.confirmed,
      pitch_id: f.pitch_id,
      team_id: f.team_id,
      teamName: team ? teamDisplayName(team, seasons ?? []) : '—',
      teamType: team?.type ?? 'senior',
      teamSortKey,
      ageGroupLabel,
      opponentName: opponent ? `${opponent.clubs?.name} ${opponent.name}` : 'Unknown opponent',
      venueName: venueData?.name ?? null,
      venueAddress: venueData?.address ?? null,
      pitchName: pitchData?.name ?? null,
      pitchType: pitchData?.pitch_type ?? null,
      kitJersey: team?.kit_jersey ?? null,
      kitShorts: team?.kit_shorts ?? null,
      kitSocks: team?.kit_socks ?? null,
      managerName: managerMap.get(f.team_id) ?? null,
    }
  })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin} isFixtureSecretary={isFS}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>
            <p className="text-sm text-gray-400 mt-1">All fixtures in the next 14 days.</p>
          </div>
          <Link
            href="/fixtures/add"
            className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add fixture
          </Link>
        </div>

        {fixtures.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm">No fixtures in the next 14 days.</p>
          </div>
        ) : (
          <FixturesList fixtures={fixtures} canConfirm={isAdmin || isFS} />
        )}
      </div>
    </AppShell>
  )
}
