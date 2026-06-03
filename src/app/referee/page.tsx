import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import RefDropdown from './RefDropdown'
import RequestButton from './RequestButton'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

function venueBadge(venue: string) {
  const label = venue === 'home' ? 'H' : venue === 'away' ? 'A' : 'N'
  const colour = venue === 'home' ? 'bg-blue-100 text-blue-800' : venue === 'away' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-600'
  return <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${colour}`}>{label}</span>
}

// Check if a fixture time clashes (within 60 min) with any fixture in the given list
function hasTimeClash(date: string, time: string | null, others: { date: string; kickoff_time: string | null }[]): boolean {
  if (!time) return false
  const [h, m] = time.split(':').map(Number)
  const mins = h * 60 + m
  for (const o of others) {
    if (o.date !== date || !o.kickoff_time) continue
    const [oh, om] = o.kickoff_time.split(':').map(Number)
    const omins = oh * 60 + om
    if (Math.abs(mins - omins) < 60) return true
  }
  return false
}

function FixtureRow({ f, seasons, subtitle }: {
  f: any
  seasons: any[]
  subtitle?: React.ReactNode
}) {
  const team = f.teams as any
  const opponent = f.club_teams as any
  const venueData = f.venues as any
  const teamName = team ? teamDisplayName(team, seasons) : '—'
  const opponentName = opponent ? `${opponent.clubs?.name} ${opponent.name}` : 'Unknown opponent'

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="text-sm font-bold text-gray-500 w-12 flex-shrink-0 pt-0.5">{formatTime(f.kickoff_time)}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {teamName} <span className="font-normal text-gray-500">vs {opponentName}</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {f.venue === 'home' ? 'Home' : f.venue === 'away' ? 'Away' : 'Neutral'}
            {venueData?.name ? ` · ${venueData.name}` : ''}
          </p>
          {subtitle}
        </div>
      </div>
      {venueBadge(f.venue)}
    </div>
  )
}

export default async function RefereeDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref: refParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, role, is_referee').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'
  const isFS = profile?.role === 'fixture_secretary'
  const isSelfReferee = profile?.is_referee ?? false

  if (!isAdmin && !isFS && !isSelfReferee) redirect('/dashboard')

  const canSeeDropdown = isAdmin || isFS

  // Fetch all referees for dropdown (admin/FS only)
  let referees: { id: string; full_name: string | null }[] = []
  if (canSeeDropdown) {
    const { data } = await supabase
      .from('profiles').select('id, full_name').eq('is_referee', true).order('full_name')
    referees = data ?? []
  }

  // Determine selected referee
  let selectedRefId: string | null = null
  if (canSeeDropdown) {
    if (refParam && referees.find(r => r.id === refParam)) {
      selectedRefId = refParam
    } else if (isSelfReferee) {
      selectedRefId = user.id // default to self if also a referee
    } else if (referees.length > 0) {
      selectedRefId = referees[0].id
    }
  } else {
    selectedRefId = user.id // pure referee, always self
  }

  const today = new Date().toISOString().split('T')[0]
  const in14Days = new Date()
  in14Days.setDate(in14Days.getDate() + 14)
  const in14Str = in14Days.toISOString().split('T')[0]

  const fixtureSelect = `
    id, date, kickoff_time, venue, confirmed, team_id,
    teams(id, name, type, founding_age_group, founding_season_id),
    club_teams(id, name, clubs(name)),
    venues(name)
  `

  // Fetch assigned fixtures for selected referee + seasons in parallel
  const [
    { data: assignedFixtures },
    { data: needsRefFixtures },
    { data: seasons },
    { data: myRequests },
    { data: myAssignedForClash },
  ] = await Promise.all([
    selectedRefId
      ? supabase.from('fixtures')
          .select(fixtureSelect)
          .eq('referee_id', selectedRefId)
          .gte('date', today).lte('date', in14Str)
          .order('date').order('kickoff_time')
      : Promise.resolve({ data: [] }),
    supabase.from('fixtures')
      .select(fixtureSelect)
      .eq('referee_required', true)
      .is('referee_id', null)
      .gte('date', today).lte('date', in14Str)
      .order('date').order('kickoff_time'),
    supabase.from('seasons').select('id, name, start_date, is_current'),
    isSelfReferee
      ? supabase.from('referee_requests').select('fixture_id').eq('referee_id', user.id)
      : Promise.resolve({ data: [] }),
    // For clash checking: fetch logged-in user's OWN assigned fixtures (if they're a referee)
    isSelfReferee
      ? supabase.from('fixtures')
          .select('id, date, kickoff_time')
          .eq('referee_id', user.id)
          .gte('date', today).lte('date', in14Str)
      : Promise.resolve({ data: [] }),
  ])

  const myRequestedFixtureIds = new Set((myRequests ?? []).map((r: any) => r.fixture_id))
  const myAssignedList = (myAssignedForClash ?? []) as { id: string; date: string; kickoff_time: string | null }[]

  const selectedRefName = referees.find(r => r.id === selectedRefId)?.full_name
    ?? (selectedRefId === user.id ? profile?.full_name : null)

  return (
    <AppShell
      userName={profile?.full_name ?? null}
      isAdmin={isAdmin}
      isFixtureSecretary={isFS}
      isReferee={isSelfReferee}
    >
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Referee</h1>
            <p className="text-sm text-gray-400 mt-1">Next 14 days.</p>
          </div>
          {canSeeDropdown && referees.length > 0 && (
            <RefDropdown
              referees={referees}
              selectedId={selectedRefId}
              selfId={isSelfReferee ? user.id : null}
            />
          )}
        </div>

        {/* Section 1: Assigned fixtures */}
        <div className="mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            {selectedRefId === user.id ? 'Your assigned fixtures' : `${selectedRefName ?? 'Referee'}'s assigned fixtures`}
          </h2>

          {!assignedFixtures?.length ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-sm text-gray-400">No fixtures assigned in the next 14 days.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {groupByDate(assignedFixtures).map(({ date, fixtures: dayFixtures }) => (
                <div key={date}>
                  <div className="px-4 py-2 bg-red-800">
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">{formatDateLong(date)}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {dayFixtures.map(f => (
                      <FixtureRow key={f.id} f={f} seasons={seasons ?? []} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Fixtures needing a referee */}
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Fixtures requiring a referee</h2>

          {!needsRefFixtures?.length ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
              <p className="text-sm text-gray-400">No fixtures currently require a referee.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {groupByDate(needsRefFixtures).map(({ date, fixtures: dayFixtures }) => (
                <div key={date}>
                  <div className="px-4 py-2 bg-gray-600">
                    <p className="text-xs font-semibold text-white uppercase tracking-wide">{formatDateLong(date)}</p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {dayFixtures.map(f => {
                      const alreadyRequested = myRequestedFixtureIds.has(f.id)
                      const clash = hasTimeClash(f.date, f.kickoff_time, myAssignedList)
                      return (
                        <div key={f.id} className="px-4 py-3 flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="text-sm font-bold text-gray-500 w-12 flex-shrink-0 pt-0.5">{formatTime(f.kickoff_time)}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {f.teams ? teamDisplayName(f.teams as any, seasons ?? []) : '—'}{' '}
                                <span className="font-normal text-gray-500">
                                  vs {f.club_teams ? `${(f.club_teams as any).clubs?.name} ${(f.club_teams as any).name}` : 'Unknown'}
                                </span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {f.venue === 'home' ? 'Home' : f.venue === 'away' ? 'Away' : 'Neutral'}
                                {(f.venues as any)?.name ? ` · ${(f.venues as any).name}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {venueBadge(f.venue)}
                            {isSelfReferee && (
                              <RequestButton
                                fixtureId={f.id}
                                alreadyRequested={alreadyRequested}
                                hasClash={!alreadyRequested && clash}
                              />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function groupByDate(fixtures: any[]): { date: string; fixtures: any[] }[] {
  const map = new Map<string, any[]>()
  for (const f of fixtures) {
    const arr = map.get(f.date) ?? []
    arr.push(f)
    map.set(f.date, arr)
  }
  return [...map.entries()].map(([date, fixtures]) => ({ date, fixtures }))
}
