import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'
import { teamDisplayName, computeAgeGroup } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function avg(vals: (number | null)[]): number | null {
  const filtered = vals.filter((v): v is number => v !== null)
  if (!filtered.length) return null
  return Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length) * 10) / 10
}

function Stars({ score, max = 5 }: { score: number | null; max?: number }) {
  if (score === null) return <span className="text-gray-300 text-xs">—</span>
  return (
    <span className="font-semibold text-gray-900">{score}/{max}</span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function TeamReviewsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: seasons } = await supabase.from('seasons').select('id, name, start_date, is_current')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, type, founding_age_group, founding_season_id, age_group, nickname')
    .eq('id', params.id)
    .single()

  if (!team) redirect('/admin/teams')

  const teamName = teamDisplayName(team as any, seasons ?? [])

  const { data: reviews } = await supabase
    .from('fixture_reviews')
    .select(`
      id, ref_submitted_at,
      ref_coaches_score, ref_spectators_score, ref_players_score, ref_experience_score, ref_comments,
      fixtures(id, date, club_teams(name, clubs(name)))
    `)
    .not('ref_submitted_at', 'is', null)
    .eq('fixtures.team_id', params.id)
    .order('ref_submitted_at', { ascending: false })

  // Filter to only reviews for this team (Supabase can't filter nested)
  const { data: allFixtureReviews } = await supabase
    .from('fixture_reviews')
    .select(`
      id, ref_submitted_at,
      ref_coaches_score, ref_spectators_score, ref_players_score, ref_experience_score, ref_comments,
      fixtures!inner(id, date, team_id, club_teams(name, clubs(name)))
    `)
    .not('ref_submitted_at', 'is', null)
    .eq('fixtures.team_id', params.id)
    .order('ref_submitted_at', { ascending: false })

  const rows = (allFixtureReviews ?? []).map((r: any) => ({
    id: r.id,
    date: r.fixtures?.date ?? '',
    opponent: (() => {
      const ct = r.fixtures?.club_teams as any
      if (!ct) return 'Unknown'
      return [ct.clubs?.name, ct.name].filter(Boolean).join(' ').replace(/^\[Internal\]\s*/, '') || 'Unknown'
    })(),
    coaches: r.ref_coaches_score as number | null,
    spectators: r.ref_spectators_score as number | null,
    players: r.ref_players_score as number | null,
    experience: r.ref_experience_score as number | null,
    comments: r.ref_comments as string | null,
  }))

  const avgCoaches = avg(rows.map(r => r.coaches))
  const avgSpectators = avg(rows.map(r => r.spectators))
  const avgPlayers = avg(rows.map(r => r.players))
  const avgExperience = avg(rows.map(r => r.experience))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="mb-6">
          <Link href="/admin/teams" className="text-xs text-gray-400 hover:text-gray-600 transition">← Admin: Teams</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">{teamName}</h1>
          <p className="text-sm text-gray-400">Referee reviews — behaviour scores from referees</p>
        </div>

        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-400">No referee reviews submitted yet.</p>
          </div>
        ) : (
          <>
            {/* Averages */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Average scores ({rows.length} review{rows.length !== 1 ? 's' : ''})</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Coaches', val: avgCoaches },
                  { label: 'Spectators', val: avgSpectators },
                  { label: 'Players', val: avgPlayers },
                  { label: 'Club experience', val: avgExperience },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${val === null ? 'text-gray-300' : val >= 4 ? 'text-green-600' : val >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
                      {val ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400">/ 5</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual reviews */}
            <div className="space-y-4">
              {rows.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">vs {r.opponent}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: 'Coaches', val: r.coaches },
                      { label: 'Spectators', val: r.spectators },
                      { label: 'Players', val: r.players },
                      { label: 'Experience', val: r.experience },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className={`text-lg font-bold ${val === null ? 'text-gray-300' : val >= 4 ? 'text-green-600' : val >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
                          {val ?? '—'}<span className="text-xs font-normal text-gray-400">/5</span>
                        </p>
                      </div>
                    ))}
                  </div>
                  {r.comments && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3 italic">"{r.comments}"</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
