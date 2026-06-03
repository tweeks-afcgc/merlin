import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { teamDisplayName } from '@/lib/teamUtils'
import DeleteFixtureButton from './DeleteFixtureButton'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

export default async function FixturesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { id: teamId } = await params
  const { season: seasonParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'
  if (!isAdmin) {
    const { data: mgr } = await supabase
      .from('team_managers').select('user_id').eq('team_id', teamId).eq('user_id', user.id).single()
    if (!mgr) redirect('/dashboard')
  }

  const [{ data: team }, { data: seasons }] = await Promise.all([
    supabase.from('teams').select('*').eq('id', teamId).single(),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
  ])

  if (!team) notFound()

  // Find which seasons have at least one fixture for this team
  const { data: fixtureSeasonRows } = await supabase
    .from('fixtures').select('season_id').eq('team_id', teamId)
  const seasonsWithFixtures = new Set((fixtureSeasonRows ?? []).map(f => f.season_id))

  // Only show seasons that have fixtures, but always include the current season
  const currentSeason = seasons?.find(s => s.is_current)
  const visibleSeasons = (seasons ?? []).filter(s => seasonsWithFixtures.has(s.id) || s.is_current)

  const activeSeason = seasonParam
    ? visibleSeasons.find(s => s.id === seasonParam)
    : currentSeason ?? visibleSeasons[0]
  const activeSeasonId = activeSeason?.id ?? visibleSeasons[0]?.id

  const { data: fixtures } = await supabase
    .from('fixtures')
    .select('id, date, kickoff_time, venue, confirmed, opponent_id, referee_required, referee_id, club_teams(id, name, clubs(name)), venues(name), pitches(name)')
    .eq('team_id', teamId)
    .eq('season_id', activeSeasonId ?? '')
    .order('date', { ascending: true })

  // Fetch referee names
  const refereeIds = [...new Set((fixtures ?? []).map(f => (f as any).referee_id).filter(Boolean))]
  const refereeMap = new Map<string, string>()
  if (refereeIds.length > 0) {
    const { data: refs } = await supabase.from('profiles').select('id, full_name').in('id', refereeIds)
    for (const r of refs ?? []) if (r.full_name) refereeMap.set(r.id, r.full_name)
  }

  const teamName = teamDisplayName(team, seasons ?? [])
  const today = new Date().toDateString()

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-4"><BackButton /></div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{teamName}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Fixtures</p>
          </div>
          <Link
            href={`/teams/${teamId}/fixtures/add`}
            className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + Add fixture
          </Link>
        </div>

        {/* Season tabs — only show if more than one visible season */}
        {visibleSeasons.length > 1 && (
          <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
            {visibleSeasons.map(s => (
              <Link
                key={s.id}
                href={`/teams/${teamId}/fixtures?season=${s.id}`}
                className={`whitespace-nowrap px-3 pb-3 -mb-px text-sm transition ${
                  s.id === activeSeasonId
                    ? 'text-red-800 font-semibold border-b-2 border-red-800'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {s.name}{s.is_current ? ' (current)' : ''}
              </Link>
            ))}
          </div>
        )}

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
          {!fixtures?.length ? (
            <div className="p-10 text-center">
              <p className="text-gray-400 text-sm">No fixtures for {activeSeason?.name ?? 'this season'}.</p>
              <Link
                href={`/teams/${teamId}/fixtures/add`}
                className="mt-4 inline-block text-sm text-red-800 font-medium hover:underline"
              >
                Add the first fixture
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pl-4 pr-3 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-3 py-3">Time</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-3 py-3">Opponent</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-3 py-3">Venue · Pitch</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide px-3 py-3">Referee</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map(f => {
                  const opponent = f.club_teams as any
                  const confirmed = (f as any).confirmed
                  const isPast = new Date(f.date) < new Date(today)
                  const refId = (f as any).referee_id
                  const refName = refId ? refereeMap.get(refId) : null
                  const refRequired = (f as any).referee_required ?? true

                  // Row background based on home/away
                  const rowBg = f.venue === 'home'
                    ? 'bg-blue-50 hover:bg-blue-100'
                    : f.venue === 'away'
                    ? 'bg-orange-50 hover:bg-orange-100'
                    : 'bg-white hover:bg-gray-50'

                  // Left border colour based on confirmed status
                  const borderColour = confirmed ? 'border-l-4 border-green-500' : 'border-l-4 border-red-400'

                  return (
                    <tr
                      key={f.id}
                      className={`border-b border-gray-100 last:border-b-0 transition ${rowBg} ${isPast ? 'opacity-50' : ''}`}
                    >
                      <td className={`pl-4 pr-3 py-3 font-medium text-gray-900 whitespace-nowrap ${borderColour}`}>
                        {formatDate(f.date)}
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatTime(f.kickoff_time)}</td>
                      <td className="px-3 py-3 text-gray-900">
                        {opponent ? `${opponent.clubs?.name} ${opponent.name}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {f.venue === 'home'
                          ? <span>
                              {(f as any).venues?.name ?? <span className="text-gray-300">Venue TBC</span>}
                              {(f as any).pitches?.name ? ` · ${(f as any).pitches.name}` : ''}
                            </span>
                          : <span className="text-gray-400">{f.venue === 'away' ? 'Away' : 'Neutral'}</span>
                        }
                      </td>
                      <td className="px-3 py-3">
                        {refName
                          ? <span className="text-xs text-gray-500">{refName}</span>
                          : refRequired
                            ? <span className="text-xs text-amber-600 font-medium">Not assigned</span>
                            : <span className="text-xs text-gray-400">Not requested</span>
                        }
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <Link href={`/teams/${teamId}/fixtures/${f.id}/edit`} className="text-xs text-gray-400 hover:text-gray-700 transition">Edit</Link>
                          <DeleteFixtureButton fixtureId={f.id} teamId={teamId} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
