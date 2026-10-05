import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function avg(vals: (number | null)[]): number | null {
  const filtered = vals.filter((v): v is number => v !== null)
  if (!filtered.length) return null
  return Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length) * 10) / 10
}

export default async function RefereeReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Find the volunteer (referee)
  const { data: volunteer } = await supabase
    .from('volunteers')
    .select('id, first_name, last_name, profile_id')
    .eq('id', id)
    .single()

  if (!volunteer) redirect('/referee')

  const refName = `${volunteer.first_name} ${volunteer.last_name}`.trim()

  const [{ data: rows }, { data: seasons }] = await Promise.all([
    supabase
      .from('fixture_reviews')
      .select(`
        id, manager_submitted_at, manager_ref_score, manager_comments,
        fixtures!inner(id, date, team_id, volunteer_referee_id,
          teams(id, name, nickname, type, founding_age_group, founding_season_id, age_group)
        )
      `)
      .not('manager_submitted_at', 'is', null)
      .eq('fixtures.volunteer_referee_id', id)
      .order('manager_submitted_at', { ascending: false }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  const reviews = (rows ?? []).map((r: any) => {
    const team = r.fixtures?.teams as any
    return {
      id: r.id,
      date: r.fixtures?.date ?? '',
      teamName: team ? teamDisplayName(team, seasons ?? []) : 'Unknown team',
      score: r.manager_ref_score as number | null,
      comments: r.manager_comments as string | null,
    }
  })

  const avgScore = avg(reviews.map(r => r.score))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/referee" className="text-xs text-gray-400 hover:text-gray-600 transition">← Referee</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">{refName}</h1>
          <p className="text-sm text-gray-400">Manager reviews — ratings from team managers</p>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm text-gray-400">No manager reviews submitted yet for this referee.</p>
          </div>
        ) : (
          <>
            {/* Average */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center gap-6">
              <div className="text-center">
                <p className={`text-4xl font-bold ${avgScore === null ? 'text-gray-300' : avgScore >= 4 ? 'text-green-600' : avgScore >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
                  {avgScore ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">avg / 5</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-gray-400">from team managers</p>
              </div>
            </div>

            {/* Individual reviews */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {reviews.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{r.teamName}</p>
                    <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right w-10">
                      <span className={`text-sm font-bold ${r.score === null ? 'text-gray-300' : r.score >= 4 ? 'text-green-600' : r.score >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
                        {r.score ?? '—'}
                      </span>
                      <span className="text-xs text-gray-400">/5</span>
                    </div>
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
