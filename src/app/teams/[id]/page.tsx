import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'
import BackButton from '@/components/BackButton'

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

  // Check access: admin or manager
  if (!isAdmin) {
    const { data: mgr } = await supabase
      .from('team_managers').select('user_id').eq('team_id', id).eq('user_id', user.id).single()
    if (!mgr) redirect('/dashboard')
  }

  // Seasons that have at least one fixture for this team
  const { data: fixtureSeasonRows } = await supabase
    .from('fixtures')
    .select('season_id')
    .eq('team_id', id)

  const seasonIdsWithFixtures = new Set((fixtureSeasonRows ?? []).map((f: any) => f.season_id))
  const currentSeason = seasons?.find(s => s.is_current) ?? null
  const statsSeasons = (seasons ?? []).filter(s => seasonIdsWithFixtures.has(s.id))

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

  // Next fixture
  const today = new Date().toISOString().split('T')[0]
  const { data: nextFixtureRows } = await supabase
    .from('fixtures')
    .select('id, date, kickoff_time, venue, referee_required, referee_id, club_teams(id, name, clubs(name)), venues(name), pitches(name)')
    .eq('team_id', id)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1)

  // Fetch referee name if assigned
  const nextFixture = nextFixtureRows?.[0] ?? null
  const opponent = nextFixture ? (nextFixture.club_teams as any) : null
  let refereeName: string | null = null
  if (nextFixture?.referee_id) {
    const { data: ref } = await supabase
      .from('profiles').select('full_name').eq('id', nextFixture.referee_id).single()
    refereeName = ref?.full_name ?? null
  }

  const displayName = teamDisplayName(team, seasons ?? [])

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>

        {/* Team header with kit circle */}
        <div className="flex items-center gap-4 mb-8">
          <KitCircle jersey={team.kit_jersey} shorts={team.kit_shorts} socks={team.kit_socks} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
            }`}>
              {team.type === 'senior' ? 'Senior' : 'Junior'}
            </span>
          </div>
          {isAdmin && (
            <Link
              href={`/admin/teams/${id}/edit?from=/teams/${id}`}
              className="text-sm font-semibold text-red-800 hover:underline flex-shrink-0"
            >
              Edit team
            </Link>
          )}
        </div>

        {/* Season stats card */}
        {statsSeasons.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <div className="px-5 pt-4 pb-0">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Season stats</h2>
              {/* Season tabs */}
              {statsSeasons.length > 1 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {statsSeasons.map(s => (
                    <Link
                      key={s.id}
                      href={`/teams/${id}?season=${s.id}`}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                        selectedStatsSeason?.id === s.id
                          ? 'bg-red-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {s.name}{s.is_current ? ' ●' : ''}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {allStats.p === 0 ? (
              <p className="px-5 pb-4 text-sm text-gray-400">No results recorded for {selectedStatsSeason?.name}.</p>
            ) : (
              <div className="px-5 pb-1">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2 border-b border-gray-100">
                  <span></span>
                  {['P','W','D','L','GF','GA','GD'].map(h => (
                    <span key={h} className="text-xs font-medium text-gray-400 uppercase tracking-wide text-center">{h}</span>
                  ))}
                </div>
                {/* All competitions */}
                <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2.5 border-b border-gray-50">
                  <span className="text-sm text-gray-700 font-medium">All</span>
                  {[allStats.p, allStats.w, allStats.d, allStats.l, allStats.gf, allStats.ga].map((v, i) => (
                    <span key={i} className="text-sm text-gray-900 text-center">{v}</span>
                  ))}
                  <span className={`text-sm font-semibold text-center ${allStats.gd > 0 ? 'text-green-700' : allStats.gd < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {allStats.gd > 0 ? `+${allStats.gd}` : allStats.gd}
                  </span>
                </div>
                {/* League only */}
                <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2.5">
                  <span className="text-sm text-gray-500">League</span>
                  {[leagueStats.p, leagueStats.w, leagueStats.d, leagueStats.l, leagueStats.gf, leagueStats.ga].map((v, i) => (
                    <span key={i} className="text-sm text-gray-700 text-center">{v}</span>
                  ))}
                  <span className={`text-sm font-medium text-center ${leagueStats.gd > 0 ? 'text-green-700' : leagueStats.gd < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {leagueStats.p > 0 ? (leagueStats.gd > 0 ? `+${leagueStats.gd}` : leagueStats.gd) : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixtures card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Fixtures</h2>
            <Link
              href={`/teams/${id}/fixtures`}
              className="text-xs font-semibold text-red-800 hover:underline"
            >
              Fixture list →
            </Link>
          </div>

          <Link href={nextFixture ? `/teams/${id}/fixtures/${nextFixture.id}/edit` : `/teams/${id}/fixtures`} className="block px-5 py-4 hover:bg-gray-50 transition group">
            {nextFixture ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Next fixture</p>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition">
                    {opponent ? [opponent.clubs?.name, opponent.name].filter((s: any) => s && s.trim()).join(' ') || 'Unknown opponent' : 'Unknown opponent'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(nextFixture.date)} · {formatTime(nextFixture.kickoff_time)} ·{' '}
                    {nextFixture.venue === 'home' ? 'Home' : nextFixture.venue === 'away' ? 'Away' : 'Neutral'}
                    {(nextFixture.venues as any)?.name ? ` · ${(nextFixture.venues as any).name}` : ''}
                    {(nextFixture.pitches as any)?.name ? ` · ${(nextFixture.pitches as any).name}` : ''}
                  </p>
                  <p className={`text-xs mt-0.5 ${refereeName ? 'text-gray-400' : 'text-amber-600 font-medium'}`}>
                    {refereeName
                      ? `Referee: ${refereeName}`
                      : (nextFixture as any).referee_required
                        ? 'No referee assigned'
                        : 'No referee requested'
                    }
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-red-800 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">No upcoming fixtures.</p>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-red-800 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
