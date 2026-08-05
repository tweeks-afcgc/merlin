import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'
import BackButton from '@/components/BackButton'
import TrainingCard from './training/TrainingCard'
import SeasonSelect from './SeasonSelect'
import TeamTabs from './TeamTabs'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

// Map a kit colour description to a CSS background value
function kitColour(s: string | null): string {
  if (!s) return '#d1d5db'
  const t = s.toLowerCase()
  if ((t.includes('red') && t.includes('black')) || (t.includes('black') && t.includes('red'))) {
    return 'repeating-linear-gradient(90deg,#dc2626 0px,#dc2626 6px,#111827 6px,#111827 12px)'
  }
  if (t.includes('red') && t.includes('white')) {
    return 'repeating-linear-gradient(90deg,#dc2626 0px,#dc2626 6px,#f3f4f6 6px,#f3f4f6 12px)'
  }
  if (t.includes('blue') && t.includes('white')) {
    return 'repeating-linear-gradient(90deg,#2563eb 0px,#2563eb 6px,#f3f4f6 6px,#f3f4f6 12px)'
  }
  if (t.includes('navy')) return '#1e3a5f'
  if (t.includes('maroon') || t.includes('burgundy')) return '#881337'
  if (t.includes('sky') || t.includes('light blue')) return '#7dd3fc'
  if (t.includes('red')) return '#dc2626'
  if (t.includes('black')) return '#111827'
  if (t.includes('white') || t.includes('cream')) return '#f3f4f6'
  if (t.includes('blue')) return '#2563eb'
  if (t.includes('yellow') || t.includes('amber') || t.includes('gold')) return '#fbbf24'
  if (t.includes('green')) return '#16a34a'
  if (t.includes('orange')) return '#ea580c'
  if (t.includes('purple') || t.includes('violet')) return '#7c3aed'
  if (t.includes('pink')) return '#ec4899'
  if (t.includes('grey') || t.includes('gray') || t.includes('silver')) return '#9ca3af'
  return '#d1d5db'
}

function KitCircle({
  jersey, shorts, socks,
}: {
  jersey: string | null
  shorts: string | null
  socks: string | null
}) {
  return (
    <div
      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
      style={{ border: '2px solid rgba(0,0,0,0.1)' }}
      title={[jersey, shorts, socks].filter(Boolean).join(' · ')}
    >
      {/* Top half — jersey */}
      <div style={{ height: '50%', background: kitColour(jersey) }} />
      {/* Upper quarter of bottom — shorts */}
      <div style={{ height: '25%', background: kitColour(shorts) }} />
      {/* Lower quarter of bottom — socks */}
      <div style={{ height: '25%', background: kitColour(socks) }} />
    </div>
  )
}

export default async function TeamDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { id } = await params
  const { season: seasonParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profile }, { data: team }, { data: seasons }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('teams').select('*').eq('id', id).single(),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
  ])

  if (!team) notFound()

  const isAdmin = profile?.role === 'admin'

  // Check access: admin or volunteer with a role on this team
  if (!isAdmin) {
    const { data: vol } = await supabase.from('volunteers').select('id').eq('profile_id', user.id).maybeSingle()
    const hasRole = vol
      ? !!(await supabase.from('volunteer_roles').select('id').eq('volunteer_id', vol.id).eq('team_id', id).eq('role_type', 'team').maybeSingle()).data
      : false
    if (!hasRole) redirect('/dashboard')
  }

  // Seasons that have at least one fixture for this team
  const { data: fixtureSeasonRows } = await supabase
    .from('fixtures').select('season_id').eq('team_id', id)

  const seasonIdsWithFixtures = new Set((fixtureSeasonRows ?? []).map((f: any) => f.season_id))
  const currentSeason = seasons?.find(s => s.is_current) ?? null
  // Always include current season; also include any season with fixtures
  const statsSeasons = (seasons ?? []).filter(s => s.is_current || seasonIdsWithFixtures.has(s.id))

  // Resolve which season to show stats for
  const selectedStatsSeason =
    statsSeasons.find(s => s.id === seasonParam) ??
    statsSeasons.find(s => s.is_current) ??
    statsSeasons[0] ??
    null

  // Fetch results for the selected stats season
  const { data: resultFixtures } = selectedStatsSeason ? await supabase
    .from('fixtures')
    .select('competition, goals_for, goals_against')
    .eq('team_id', id)
    .eq('season_id', selectedStatsSeason.id)
    .not('goals_for', 'is', null)
    .not('goals_against', 'is', null)
    : { data: [] }

  function calcStats(fixtures: { goals_for: number; goals_against: number }[]) {
    const p = fixtures.length
    const w = fixtures.filter(f => f.goals_for > f.goals_against).length
    const d = fixtures.filter(f => f.goals_for === f.goals_against).length
    const l = fixtures.filter(f => f.goals_for < f.goals_against).length
    const gf = fixtures.reduce((s, f) => s + f.goals_for, 0)
    const ga = fixtures.reduce((s, f) => s + f.goals_against, 0)
    return { p, w, d, l, gf, ga, gd: gf - ga }
  }

  const allStats = calcStats((resultFixtures ?? []) as any)
  const leagueStats = calcStats(((resultFixtures ?? []) as any).filter((f: any) => f.competition === 'league'))

  // Training slots — not season-filtered, always shows current plan
  const [{ data: trainingSlots }, { data: venues }] = await Promise.all([
    supabase
      .from('training_slots')
      .select('id, day_of_week, frequency, start_time, end_time, venue_id, notes, venues(name)')
      .eq('team_id', id),
    supabase.from('venues').select('id, name').order('name'),
  ])

  const trainingSlotsMapped = (trainingSlots ?? []).map((s: any) => ({
    id: s.id,
    day_of_week: s.day_of_week,
    frequency: s.frequency,
    start_time: s.start_time,
    end_time: s.end_time,
    venue_id: s.venue_id ?? null,
    venueName: s.venues?.name ?? null,
    notes: s.notes ?? null,
  }))

  // Volunteers with a team role for this team
  const { data: teamRoleRows } = await supabase
    .from('volunteer_roles')
    .select('id, role_name, volunteers(id, first_name, last_name)')
    .eq('role_type', 'team')
    .eq('team_id', id)
    .order('role_name', { ascending: true })

  const teamRoles = (teamRoleRows ?? []).map((r: any) => ({
    id: r.id,
    role_name: r.role_name,
    volunteerName: r.volunteers ? `${r.volunteers.first_name} ${r.volunteers.last_name}` : 'Unknown',
  }))

  // Players for this team in the current season
  const { data: playerRows } = selectedStatsSeason ? await supabase
    .from('player_team_seasons')
    .select('players(id, first_name, last_name, date_of_birth)')
    .eq('team_id', id)
    .eq('season_id', selectedStatsSeason.id)
    : { data: [] }

  const players = (playerRows ?? [])
    .map((r: any) => r.players)
    .filter(Boolean)
    .sort((a: any, b: any) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`))

  const today = new Date().toISOString().split('T')[0]
  const FIXTURE_SELECT = 'id, date, kickoff_time, venue, referee_required, referee_id, volunteer_referee_id, goals_for, goals_against, club_teams(id, name, clubs(name)), venues(name), pitches(name)'

  const isCurrentSeason = selectedStatsSeason?.is_current ?? false

  const [nextFixtureResult, recentFixtureResult] = await Promise.all([
    // Only fetch "next" fixture for the current season
    isCurrentSeason && selectedStatsSeason
      ? supabase
          .from('fixtures')
          .select(FIXTURE_SELECT)
          .eq('team_id', id)
          .eq('season_id', selectedStatsSeason.id)
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(1)
      : Promise.resolve({ data: [] }),
    // Recent fixtures: for current season use date < today, for past seasons just last 5 by date
    selectedStatsSeason
      ? (() => {
          let q = supabase
            .from('fixtures')
            .select(FIXTURE_SELECT)
            .eq('team_id', id)
            .eq('season_id', selectedStatsSeason.id)
            .order('date', { ascending: false })
            .limit(5)
          if (isCurrentSeason) q = q.lt('date', today) as typeof q
          return q
        })()
      : Promise.resolve({ data: [] }),
  ])

  const nextFixture = (nextFixtureResult.data as any[])?.[0] ?? null
  const recentFixtures = (recentFixtureResult.data as any[]) ?? []

  // Fetch referee name for next fixture if assigned
  let refereeName: string | null = null
  if (nextFixture?.referee_id) {
    const { data: ref } = await supabase
      .from('profiles').select('full_name').eq('id', nextFixture.referee_id).single()
    refereeName = ref?.full_name ?? null
  } else if ((nextFixture as any)?.volunteer_referee_id) {
    const { data: ref } = await supabase
      .from('volunteers').select('first_name, last_name').eq('id', (nextFixture as any).volunteer_referee_id).single()
    if (ref) refereeName = `${ref.first_name} ${ref.last_name}`
  }

  const displayName = teamDisplayName(team, seasons ?? [])

  const ROLE_ORDER = ['manager', 'assistant', 'coach']
  const sortedRoles = [...teamRoles].sort((a, b) => {
    const ai = ROLE_ORDER.findIndex(r => a.role_name.toLowerCase().includes(r))
    const bi = ROLE_ORDER.findIndex(r => b.role_name.toLowerCase().includes(r))
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>

        {/* Team header */}
        <div className="flex items-start gap-4 mb-6">
          <KitCircle jersey={team.kit_jersey} shorts={team.kit_shorts} socks={team.kit_socks} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {team.type === 'senior' ? 'Senior' : 'Junior'}
              </span>
              {team.type === 'junior' && (team as any).format && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {(team as any).format}
                </span>
              )}
            </div>
            {/* Roles inline */}
            {sortedRoles.length > 0 && (
              <div className="mt-2 flex flex-col gap-0.5">
                {sortedRoles.map(r => (
                  <p key={r.id} className="text-sm text-gray-600">
                    <span className="text-gray-400 text-xs font-medium uppercase tracking-wide mr-1.5">{r.role_name}</span>
                    {r.volunteerName}
                  </p>
                ))}
              </div>
            )}
          </div>
          {isAdmin && (
            <Link
              href={`/admin/teams/${id}/edit?from=/teams/${id}`}
              className="text-sm font-semibold text-red-800 hover:underline flex-shrink-0"
            >
              Edit
            </Link>
          )}
        </div>

        {/* Training schedule — expandable */}
        <TrainingCard
          teamId={id}
          slots={trainingSlotsMapped}
          venues={venues ?? []}
          isAdmin={isAdmin}
        />

        {/* Season selector */}
        {statsSeasons.length > 1 && (
          <div className="flex items-center gap-3 mt-6 mb-3">
            <span className="text-sm text-gray-500">Season</span>
            <SeasonSelect
              teamId={id}
              seasons={statsSeasons}
              selectedId={selectedStatsSeason?.id ?? null}
            />
          </div>
        )}

        {/* Tabbed card: Fixtures | Season Stats | Players */}
        <div className={statsSeasons.length > 1 ? '' : 'mt-6'}>
          <TeamTabs
            teamId={id}
            isAdmin={isAdmin}
            currentSeasonId={currentSeason?.id ?? null}
            nextFixture={nextFixture as any}
            recentFixtures={recentFixtures as any[]}
            refereeName={refereeName}
            allStats={allStats}
            leagueStats={leagueStats}
            selectedSeasonName={selectedStatsSeason?.name ?? null}
            players={players as any[]}
            currentSeasonName={selectedStatsSeason?.name ?? null}
          />
        </div>

      </div>
    </AppShell>
  )
}
