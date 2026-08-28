import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'
import BackButton from '@/components/BackButton'
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

const COLOUR_MAP: Record<string, string> = {
  'light red': '#fca5a5',
  'red': '#dc2626',
  'dark red': '#991b1b',
  'maroon': '#7f1d1d',
  'burgundy': '#881337',
  'rose': '#fb7185',
  'pink': '#ec4899',
  'hot pink': '#db2777',
  'magenta': '#a21caf',
  'peach': '#fdba74',
  'orange': '#f97316',
  'dark orange': '#c2410c',
  'burnt orange': '#92400e',
  'yellow': '#fde047',
  'amber': '#f59e0b',
  'gold': '#d97706',
  'lime': '#a3e635',
  'light green': '#4ade80',
  'green': '#16a34a',
  'dark green': '#15803d',
  'forest': '#166534',
  'emerald': '#059669',
  'sky blue': '#7dd3fc',
  'light blue': '#38bdf8',
  'cyan': '#06b6d4',
  'blue': '#2563eb',
  'royal blue': '#1d4ed8',
  'dark blue': '#1e40af',
  'navy': '#1e3a5f',
  'lilac': '#c084fc',
  'purple': '#9333ea',
  'violet': '#7c3aed',
  'indigo': '#4f46e5',
  'white': '#f9fafb',
  'cream': '#fef9c3',
  'silver': '#e5e7eb',
  'light grey': '#9ca3af',
  'grey': '#6b7280',
  'gray': '#6b7280',
  'dark grey': '#374151',
  'charcoal': '#1f2937',
  'black': '#111827',
}

function kitColour(s: string | null): string {
  if (!s) return '#d1d5db'
  return COLOUR_MAP[s.toLowerCase()] ?? '#d1d5db'
}

function KitCircle({
  jersey, shorts, title,
}: {
  jersey: string | null
  shorts: string | null
  title?: string
}) {
  return (
    <div
      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
      style={{ border: '2px solid rgba(0,0,0,0.1)' }}
      title={[jersey, shorts].filter(Boolean).join(' · ')}
    >
      <div style={{ height: '50%', background: kitColour(jersey) }} />
      <div style={{ height: '50%', background: kitColour(shorts) }} />
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
  const allSeasons = seasons ?? []
  const currentSeason = allSeasons.find(s => s.is_current) ?? null
  // Seasons shown in the dropdown: those with fixtures + current season
  const statsSeasons = allSeasons.filter(s => s.is_current || seasonIdsWithFixtures.has(s.id))

  // Resolve selected season — search ALL seasons so the URL param always wins,
  // even if the season has no fixtures (e.g. it only has players or training slots)
  const selectedStatsSeason =
    allSeasons.find(s => s.id === seasonParam) ??
    allSeasons.find(s => s.is_current) ??
    allSeasons[0] ??
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
  const [{ data: trainingSlots }, { data: venues }, { data: defaultVenueRow }, { data: pitchRow }, { data: competitionsData }, { data: sponsorsData }] = await Promise.all([
    supabase
      .from('training_slots')
      .select('id, day_of_week, frequency, start_time, end_time, venue_id, notes, venues(name)')
      .eq('team_id', id),
    supabase.from('venues').select('id, name').order('name'),
    (team as any).default_venue_id
      ? supabase.from('venues').select('name').eq('id', (team as any).default_venue_id).single()
      : Promise.resolve({ data: null }),
    (team as any).default_pitch_id
      ? supabase.from('pitches').select('name').eq('id', (team as any).default_pitch_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('team_competitions').select('id, season_id, type, name, abbr_name, division').eq('team_id', id).order('created_at'),
    supabase.from('team_sponsors').select('id, season_id, name').eq('team_id', id).order('created_at'),
  ])
  const defaultVenueName: string | null = (defaultVenueRow as any)?.name ?? null
  const defaultPitchName: string | null = ((pitchRow as any)?.name) ?? null

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
    .select('player_number, players(id, first_name, last_name, date_of_birth)')
    .eq('team_id', id)
    .eq('season_id', selectedStatsSeason.id)
    : { data: [] }

  const players = (playerRows ?? [])
    .map((r: any) => r.players ? { ...r.players, player_number: r.player_number ?? null } : null)
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (a.player_number != null && b.player_number != null) return a.player_number - b.player_number
      if (a.player_number != null) return -1
      if (b.player_number != null) return 1
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    })

  // Player performance stats for the selected season
  const { data: perfRows } = selectedStatsSeason ? await supabase
    .from('fixture_player_performances')
    .select('player_id, played, goals, assists, motm, mins_played, fixtures!inner(team_id, season_id)')
    .eq('fixtures.team_id', id)
    .eq('fixtures.season_id', selectedStatsSeason.id)
    : { data: [] }

  // Aggregate per player
  type PlayerStat = {
    player_id: string
    name: string
    player_number: number | null
    played: number
    goals: number
    assists: number
    motm: number
    total_mins: number
  }
  const playerMap = new Map<string, PlayerStat>()
  for (const p of players as any[]) {
    playerMap.set(p.id, { player_id: p.id, name: `${p.first_name} ${p.last_name}`, player_number: p.player_number, played: 0, goals: 0, assists: 0, motm: 0, total_mins: 0 })
  }
  for (const row of (perfRows ?? []) as any[]) {
    const s = playerMap.get(row.player_id)
    if (!s) continue
    if (row.played) s.played += 1
    s.goals += row.goals ?? 0
    s.assists += row.assists ?? 0
    if (row.motm) s.motm += 1
    s.total_mins += row.mins_played ?? 0
  }
  const playerStats = Array.from(playerMap.values())

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
          <div className="flex gap-2 flex-shrink-0">
            <KitCircle
              jersey={team.kit_jersey}
              shorts={team.kit_shorts}
              title="Home kit"
            />
            {(team as any).away_kit_jersey && (
              <KitCircle
                jersey={(team as any).away_kit_jersey ?? null}
                shorts={(team as any).away_kit_shorts ?? null}
                title="Away kit"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {team.type === 'senior' ? 'Senior' : 'Junior'}
              </span>
              {(team as any).gender && (() => {
                const g = (team as any).gender
                const cls = g === 'Male' ? 'bg-blue-100 text-blue-800' : g === 'Female' ? 'bg-pink-100 text-pink-800' : 'bg-green-100 text-green-800'
                return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{g}</span>
              })()}
              {team.type === 'junior' && (team as any).format && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {(team as any).format}
                </span>
              )}
            </div>
            {/* Info rows — consistent label/value layout */}
            {(sortedRoles.length > 0 || defaultVenueName || trainingSlotsMapped.length > 0) && (
              <div className="mt-2 space-y-1">
                {/* Roles — one per line, label only on first of each role group */}
                {sortedRoles.map(r => (
                  <div key={r.id} className="flex items-baseline gap-2">
                    <span className="w-28 flex-shrink-0 text-sm text-gray-400">{r.role_name}</span>
                    <span className="text-sm text-gray-700">{r.volunteerName}</span>
                  </div>
                ))}
                {/* Home */}
                {defaultVenueName && (
                  <div className="flex items-baseline gap-2">
                    <span className="w-28 flex-shrink-0 text-sm text-gray-400">Home</span>
                    <span className="text-sm text-gray-700">{defaultVenueName}{defaultPitchName ? ` · ${defaultPitchName}` : ''}</span>
                  </div>
                )}
                {/* Training slots */}
                {trainingSlotsMapped.map((slot, i) => {
                  const start = slot.start_time ? slot.start_time.slice(0, 5) : null
                  const end = slot.end_time ? slot.end_time.slice(0, 5) : null
                  const timeStr = start && end ? `${start} - ${end}` : start ? `from ${start}` : null
                  const isAlt = slot.frequency === 'Alternate' || slot.frequency === 'bi-weekly'
                  const dayStr = slot.day_of_week + (isAlt ? ' (Alt)' : '')
                  const freqPart = !isAlt && slot.frequency !== 'weekly' ? slot.frequency : null
                  const mainParts = [dayStr, freqPart, timeStr].filter(Boolean)
                  const venuePart = slot.venueName ? `@ ${slot.venueName}` : null
                  const display = venuePart ? `${mainParts.join(' ')} ${venuePart}` : mainParts.join(' ')
                  return (
                    <div key={slot.id} className="flex items-baseline gap-2">
                      <span className={`w-28 flex-shrink-0 text-sm ${i === 0 ? 'text-gray-400' : 'invisible'}`}>Training</span>
                      <span className="text-sm text-gray-700">{display}</span>
                    </div>
                  )
                })}
                {/* League */}
                {(competitionsData ?? []).filter((c: any) => c.season_id === currentSeason?.id && c.type === 'league').map((c: any) => (
                  <div key={c.id} className="flex items-baseline gap-2">
                    <span className="w-28 flex-shrink-0 text-sm text-gray-400">League</span>
                    <span className="text-sm text-gray-700">{c.abbr_name ?? c.name}{c.division ? ` - ${c.division}` : ''}</span>
                  </div>
                ))}
                {/* Cup(s) */}
                {(competitionsData ?? []).filter((c: any) => c.season_id === currentSeason?.id && c.type === 'cup').map((c: any) => (
                  <div key={c.id} className="flex items-baseline gap-2">
                    <span className="w-28 flex-shrink-0 text-sm text-gray-400">Cup</span>
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                ))}
                {/* Sponsors — one per line */}
                {(sponsorsData ?? []).filter((s: any) => s.season_id === currentSeason?.id).map((s: any, i: number, arr: any[]) => (
                  <div key={s.id} className="flex items-baseline gap-2">
                    <span className={`w-28 flex-shrink-0 text-sm ${i === 0 ? 'text-gray-400' : 'invisible'}`}>
                      {i === 0 ? (arr.length > 1 ? 'Sponsors' : 'Sponsor') : 'Sponsor'}
                    </span>
                    <span className="text-sm text-gray-700">{s.name}</span>
                  </div>
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
            key={selectedStatsSeason?.id ?? 'no-season'}
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
            playerStats={playerStats}
            currentSeasonName={selectedStatsSeason?.name ?? null}
          />
        </div>

      </div>
    </AppShell>
  )
}
