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

export default async function TeamReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: seasons } = await supabase.from('seasons').select('id, name, start_date, is_current')

  const { data: team } = await supabase
    .from('teams')
    .select('id, name, type, founding_age_group, founding_season_id, age_group, nickname')
    .eq('id', id)
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
    .eq('fixtures.team_id', id)
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
    .eq('fixtures.team_id', id)
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
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {rows.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">vs {r.opponent}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {[
                      { label: 'Co', val: r.coaches },
                      { label: 'Sp', val: r.spectators },
                      { label: 'Pl', val: r.players },
                      { label: 'Ex', val: r.experience },
                    ].map(({ label, val }) => (
                      <div key={label} className="text-center w-8">
                        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
                        <p className={`text-sm font-bold leading-none ${val === null ? 'text-gray-300' : val >= 4 ? 'text-green-600' : val >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
                          {val ?? '—'}
                        </p>
                      </div>
                    ))}
                    {r.comments ? (
                      <div className="relative group w-5 flex-shrink-0">
                        <svg className="w-4 h-4 text-gray-300 hover:text-gray-500 cursor-default transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="absolute right-0 top-6 z-20 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                          <p className="italic">"{r.comments}"</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
