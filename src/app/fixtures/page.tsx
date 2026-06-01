import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import ConfirmToggle from './ConfirmToggle'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

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

  const [{ data: fixtures }, { data: seasons }] = await Promise.all([
    supabase
      .from('fixtures')
      .select(`
        id, date, kickoff_time, venue, confirmed, pitch_id,
        team_id,
        teams(id, name, type, founding_age_group, founding_season_id, age_group),
        club_teams(id, name, clubs(name)),
        venues(name),
        pitches(name)
      `)
      .gte('date', todayStr)
      .lte('date', in14Str)
      .order('date', { ascending: true })
      .order('kickoff_time', { ascending: true }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  const canConfirm = isAdmin || isFS

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin} isFixtureSecretary={isFS}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>
          <p className="text-sm text-gray-400 mt-1">All fixtures in the next 14 days.</p>
        </div>

        {!fixtures?.length ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm">No fixtures in the next 14 days.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fixtures.map(f => {
              const opponent = f.club_teams as any
              const team = f.teams as any
              const venueInfo = f.venues as any
              const pitchInfo = f.pitches as any
              const needsPitch = f.venue === 'home' && !f.pitch_id
              const fullTeamName = team ? teamDisplayName(team, seasons ?? []) : '—'

              return (
                <div
                  key={f.id}
                  className={`bg-white rounded-xl border shadow-sm flex items-center justify-between gap-4 ${
                    f.confirmed ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <Link
                    href={`/teams/${f.team_id}/fixtures/${f.id}/edit`}
                    className="flex items-center gap-4 min-w-0 flex-1 px-5 py-4 hover:bg-gray-50 rounded-l-xl transition"
                  >
                    {/* Status dot */}
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${f.confirmed ? 'bg-green-500' : 'bg-red-500'}`} />

                    <div className="min-w-0">
                      {/* Team name */}
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
                        {fullTeamName}
                      </p>
                      {/* Opponent */}
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        vs {opponent ? `${opponent.clubs?.name} ${opponent.name}` : 'Unknown opponent'}
                      </p>
                      {/* Date · time · venue */}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(f.date)} · {formatTime(f.kickoff_time)} ·{' '}
                        {f.venue === 'home' ? 'Home' : f.venue === 'away' ? 'Away' : 'Neutral'}
                        {venueInfo ? ` · ${venueInfo.name}` : ''}
                        {pitchInfo ? ` · ${pitchInfo.name}` : ''}
                      </p>
                      {/* Warning if home with no pitch */}
                      {needsPitch && (
                        <p className="text-xs text-amber-600 font-medium mt-0.5">No pitch assigned — cannot confirm</p>
                      )}
                    </div>
                  </Link>

                  {canConfirm && (
                    <div className="flex-shrink-0 pr-5">
                      <ConfirmToggle
                        fixtureId={f.id}
                        confirmed={f.confirmed}
                        disabled={!f.confirmed && needsPitch}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
