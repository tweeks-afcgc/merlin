import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName, fixtureOpponentName, type Season } from '@/lib/teamUtils'
import CopyLinkButton from './CopyLinkButton'
import DeleteReviewButton from './DeleteReviewButton'
import TabBar from './TabBar'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const FIXTURE_REVIEW_SELECT = `
  id, ref_token, manager_token, ref_submitted_at, manager_submitted_at,
  fixtures!inner(
    id, date, team_id, referee_id, volunteer_referee_id, opponent_id, season_id,
    teams(id, name, type, founding_age_group, founding_season_id, age_group, nickname),
    profiles:referee_id(full_name),
    volunteers:volunteer_referee_id(first_name, last_name),
    club_teams:opponent_id(id, name, internal_team_id, clubs(name))
  )
`

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { tab } = await searchParams
  const activeTab: 'incomplete' | 'complete' = tab === 'complete' ? 'complete' : 'incomplete'

  const todayStr = new Date().toISOString().split('T')[0]

  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const origin = `${proto}://${host}`

  const [{ data: rows }, { data: seasons }] = await Promise.all([
    activeTab === 'incomplete'
      ? supabase
          .from('fixture_reviews')
          .select(FIXTURE_REVIEW_SELECT)
          .or('ref_submitted_at.is.null,manager_submitted_at.is.null')
          .lt('fixtures.date', todayStr)
          .order('fixtures(date)', { ascending: false })
      : supabase
          .from('fixture_reviews')
          .select(FIXTURE_REVIEW_SELECT)
          .not('ref_submitted_at', 'is', null)
          .not('manager_submitted_at', 'is', null)
          .lt('fixtures.date', todayStr)
          .order('fixtures(date)', { ascending: false }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  type ReviewItem = {
    key: string
    reviewId: string
    type: 'referee' | 'manager'
    date: string
    teamId: string
    fixtureId: string
    teamName: string
    opponentName: string
    refName: string | null
    reviewUrl: string
  }

  const items: ReviewItem[] = []

  for (const r of rows ?? []) {
    const fixture = (r as any).fixtures
    if (!fixture) continue
    const date: string = fixture.date
    const teamId: string = fixture.team_id
    const fixtureId: string = fixture.id
    const team = fixture.teams as any
    const refProfile = fixture.profiles as any
    const refVol = fixture.volunteers as any
    const opponent = fixture.club_teams as any
    const teamName = team ? teamDisplayName(team, seasons as Season[]) : 'Unknown team'
    const refName = refVol
      ? `${refVol.first_name} ${refVol.last_name}`.trim()
      : refProfile?.full_name ?? null
    const oppName = fixtureOpponentName(opponent ? { ...opponent, internal_team: null } : null, seasons as Season[], fixture.season_id)

    if (activeTab === 'incomplete') {
      if (!r.ref_submitted_at && refName) {
        items.push({ key: `${r.id}-ref`, reviewId: r.id, type: 'referee', date, teamId, fixtureId, teamName, opponentName: oppName, refName, reviewUrl: `${origin}/review/ref/${r.ref_token}` })
      }
      if (!r.manager_submitted_at) {
        items.push({ key: `${r.id}-mgr`, reviewId: r.id, type: 'manager', date, teamId, fixtureId, teamName, opponentName: oppName, refName, reviewUrl: `${origin}/review/manager/${r.manager_token}` })
      }
    } else {
      if (r.ref_submitted_at && refName) {
        items.push({ key: `${r.id}-ref`, reviewId: r.id, type: 'referee', date, teamId, fixtureId, teamName, opponentName: oppName, refName, reviewUrl: `${origin}/review/ref/${r.ref_token}` })
      }
      if (r.manager_submitted_at) {
        items.push({ key: `${r.id}-mgr`, reviewId: r.id, type: 'manager', date, teamId, fixtureId, teamName, opponentName: oppName, refName, reviewUrl: `${origin}/review/manager/${r.manager_token}` })
      }
    }
  }

  items.sort((a, b) => b.date.localeCompare(a.date))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition">← Admin</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Post-match Reviews</h1>
          <p className="text-sm text-gray-400">
            {activeTab === 'incomplete' ? 'Feedback links that have not yet been submitted.' : 'Feedback that has been submitted.'}
          </p>
        </div>

        <TabBar active={activeTab} />

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-400">
              {activeTab === 'incomplete' ? 'No pending reviews — all feedback has been submitted.' : 'No completed reviews yet.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                      item.type === 'referee' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'referee' ? 'Referee Feedback' : 'Manager Feedback'}
                    </span>
                    <p className="text-sm text-gray-900 truncate">
                      <span className="font-semibold">{item.teamName}</span>
                      <span className="text-gray-400"> vs </span>
                      <span>{item.opponentName}</span>
                      {item.refName && (
                        <span className="text-gray-400"> · {item.refName}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.date)}</p>
                </div>
                {activeTab === 'incomplete' && <CopyLinkButton url={item.reviewUrl} />}
                {activeTab === 'incomplete' && <DeleteReviewButton reviewId={item.reviewId} type={item.type} />}
                <Link
                  href={`/teams/${item.teamId}/fixtures/${item.fixtureId}/edit`}
                  className="text-xs text-red-800 hover:underline flex-shrink-0"
                >
                  View fixture
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
