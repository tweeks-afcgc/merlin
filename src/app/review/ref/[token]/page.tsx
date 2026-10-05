import { createAdminClient } from '@/lib/supabase/admin'
import { teamDisplayName } from '@/lib/teamUtils'
import RefReviewForm from './RefReviewForm'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function RefReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: review } = await supabase
    .from('fixture_reviews')
    .select('id, ref_submitted_at, ref_token, fixture_id')
    .eq('ref_token', token)
    .single()

  if (!review) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <p className="text-gray-500 text-sm">This review link is not valid.</p>
        </div>
      </div>
    )
  }

  const [{ data: fixture }, { data: seasons }] = await Promise.all([
    supabase
      .from('fixtures')
      .select('id, date, referee_id, volunteer_referee_id, teams(name, type, founding_age_group, founding_season_id, age_group, nickname), club_teams(name, clubs(name)), profiles:referee_id(full_name), volunteers:volunteer_referee_id(first_name, last_name)')
      .eq('id', review.fixture_id)
      .single(),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  const team = (fixture as any)?.teams as any
  const opponent = (fixture as any)?.club_teams as any
  const teamName = team ? teamDisplayName(team, seasons ?? []) : 'AFC Green Court'
  const opponentName = opponent ? [opponent.clubs?.name, opponent.name].filter(Boolean).join(' ').replace(/^\[Internal\]\s*/, '') : 'Opponent'
  const refProfile = (fixture as any)?.profiles as any
  const refVol = (fixture as any)?.volunteers as any
  const refName = refProfile?.full_name
    ?? (refVol ? `${refVol.first_name ?? ''} ${refVol.last_name ?? ''}`.trim() : null)
    ?? 'Referee'
  const refFirstName = refVol?.first_name ?? refProfile?.full_name?.split(' ')[0] ?? 'Referee'

  if (review.ref_submitted_at) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Review already submitted</h1>
          <p className="text-sm text-gray-500">Thank you — your review of {teamName} has already been recorded.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-800 px-4 py-5 shadow">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-white">AFC Green Court</h1>
          <p className="text-sm text-red-200">Post-match referee review</p>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 mb-4">
          <p className="text-sm font-semibold text-gray-900">{teamName} vs {opponentName}</p>
          {fixture?.date && <p className="text-xs text-gray-400 mt-0.5">{formatDate(fixture.date as string)}</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-6 py-4 mb-6">
          <p className="text-sm font-semibold text-gray-900 mb-1">Hello, {refFirstName}</p>
          <p className="text-sm text-gray-500 leading-relaxed">Thank you for officiating the above fixture. We take our teams' conduct seriously and use referee feedback to ensure our players, coaches, and supporters are representing the club well. It would mean a lot if you could take a moment to complete the questions below.</p>
          <p className="text-xs text-gray-400 mt-2">If you've received this link in error, please ignore it.</p>
        </div>
        <RefReviewForm token={token} teamName={teamName} />
      </div>
    </div>
  )
}
