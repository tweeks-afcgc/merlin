import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function avg(vals: (number | null)[]): number | null {
  const filtered = vals.filter((v): v is number => v !== null)
  if (!filtered.length) return null
  return Math.round((filtered.reduce((a, b) => a + b, 0) / filtered.length) * 10) / 10
}

export default async function RefereeReviewsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // Find the volunteer (referee)
  const { data: volunteer } = await supabase
    .from('volunteers')
    .select('id, first_name, last_name, profile_id')
    .eq('id', params.id)
    .single()

  if (!volunteer || !(volunteer as any).profile_id) redirect('/admin/volunteers')

  const profileId = (volunteer as any).profile_id
  const refName = `${volunteer.first_name} ${volunteer.last_name}`.trim()

  // Get all fixtures where this profile is assigned referee, that have a submitted manager review
  const { data: rows } = await supabase
    .from('fixture_reviews')
    .select(`
      id, manager_submitted_at, manager_ref_score, manager_comments,
      fixtures!inner(id, date, team_id, referee_id,
        teams(name, nickname, type, founding_age_group, founding_season_id, age_group)
      )
    `)
    .not('manager_submitted_at', 'is', null)
    .eq('fixtures.referee_id', profileId)
    .order('manager_submitted_at', { ascending: false })

  const reviews = (rows ?? []).map((r: any) => {
    const team = r.fixtures?.teams as any
    return {
      id: r.id,
      date: r.fixtures?.date ?? '',
      teamName: team?.nickname || team?.name || 'Unknown team',
      score: r.manager_ref_score as number | null,
      comments: r.manager_comments as string | null,
    }
  })

  const avgScore = avg(reviews.map(r => r.score))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="mb-6">
          <Link href="/admin/volunteers" className="text-xs text-gray-400 hover:text-gray-600 transition">← Admin: Volunteers</Link>
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
            <div className="space-y-4">
              {reviews.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.teamName}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-2xl font-bold ${r.score === null ? 'text-gray-300' : r.score >= 4 ? 'text-green-600' : r.score >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
                        {r.score ?? '—'}
                      </span>
                      <span className="text-xs text-gray-400">/5</span>
                    </div>
                  </div>
                  {r.comments && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3 italic mt-2">"{r.comments}"</p>
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
