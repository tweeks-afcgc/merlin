import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import FixturesList from './FixturesList'
import { teamDisplayName, fixtureOpponentName, computeAgeGroup, type Season } from '@/lib/teamUtils'

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

  const todayStr = new Date().toISOString().split('T')[0]

  const [{ data: rawFixtures }, { data: seasons }, { data: allManagers }, { data: allReferees }, { data: allRequests }, { data: allVolunteerRefs }] = await Promise.all([
    supabase
      .from('fixtures')
      .select(`
        id, date, kickoff_time, venue, confirmed, pitch_id,
        referee_required, referee_id, volunteer_referee_id,
        team_id, season_id, cancelled, cancellation_reason,
        teams(id, name, type, founding_age_group, founding_season_id, age_group, nickname, kit_jersey, kit_shorts, kit_socks),
        club_teams(id, name, internal_team_id, clubs(name)),
        venues(name, address),
        pitches(name, pitch_type)
      `)
      .gte('date', todayStr)
      .order('date', { ascending: true })
      .order('kickoff_time', { ascending: true }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
    supabase.from('team_managers').select('team_id, profiles(full_name)'),
    supabase.from('profiles').select('id, full_name').eq('is_referee', true),
    supabase.from('referee_requests').select('fixture_id'),
    supabase.from('volunteers').select('id, first_name, last_name').eq('is_referee', true),
  ])

  // Enrich internal team opponents with their teams row (for nickname + age resolution)
  const internalTeamIds = [...new Set((rawFixtures ?? []).map((f: any) => f.club_teams?.internal_team_id).filter(Boolean))]
  const internalTeamDataMap = new Map<string, any>()
  if (internalTeamIds.length > 0) {
    const { data: iTeams } = await supabase
      .from('teams')
      .select('id, name, type, founding_age_group, founding_season_id, nickname')
      .in('id', internalTeamIds)
    for (const t of iTeams ?? []) internalTeamDataMap.set(t.id, t)
  }
  const enrichedFixtures = (rawFixtures ?? []).map((f: any) => {
    const ct = f.club_teams
    const internalTeam = ct?.internal_team_id ? internalTeamDataMap.get(ct.internal_team_id) ?? null : null
    return { ...f, club_teams: ct ? { ...ct, internal_team: internalTeam } : ct }
  })

  // Build a set of fixture_ids that have at least one referee request
  const fixturesWithRequests = new Set((allRequests ?? []).map((r: any) => r.fixture_id))

  // Build a map of referee_id / volunteer_referee_id -> name
  const refereeMap = new Map<string, string>()
  for (const r of allReferees ?? []) {
    if (r.full_name) refereeMap.set(r.id, r.full_name)
  }
  const volunteerRefMap = new Map<string, string>()
  for (const v of allVolunteerRefs ?? []) {
    volunteerRefMap.set(v.id, `${v.first_name} ${v.last_name}`.trim())
  }

  // Build a map of team_id -> first manager name
  const managerMap = new Map<string, string>()
  for (const m of allManagers ?? []) {
    if (!managerMap.has(m.team_id)) {
      const name = (m.profiles as any)?.full_name
      if (name) managerMap.set(m.team_id, name)
    }
  }

  const SENIOR_ORDER = ['First XI', 'Sunday XI', 'Vets XI', 'Women']

  const fixtures = enrichedFixtures.map((f: any) => {
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
      teamShortName: team?.name ?? '',
      opponentName: fixtureOpponentName(opponent, (seasons ?? []) as Season[], f.season_id),
      venueName: venueData?.name ?? null,
      venueAddress: venueData?.address ?? null,
      pitchName: pitchData?.name ?? null,
      pitchType: pitchData?.pitch_type ?? null,
      kitJersey: team?.kit_jersey ?? null,
      kitShorts: team?.kit_shorts ?? null,
      kitSocks: team?.kit_socks ?? null,
      managerName: managerMap.get(f.team_id) ?? null,
      refereeRequired: f.referee_required ?? true,
      refereeName: f.referee_id
        ? (refereeMap.get(f.referee_id) ?? null)
        : f.volunteer_referee_id
          ? (volunteerRefMap.get(f.volunteer_referee_id) ?? null)
          : null,
      hasRefereeRequest: fixturesWithRequests.has(f.id),
      cancelled: f.cancelled ?? false,
      cancellationReason: f.cancellation_reason ?? null,
    }
  })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin} isFixtureSecretary={isFS}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>
            <p className="text-sm text-gray-400 mt-1">Upcoming fixtures.</p>
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
