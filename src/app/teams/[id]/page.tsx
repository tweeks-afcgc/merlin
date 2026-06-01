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

export default async function TeamDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profile }, { data: team }, { data: seasons }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('teams').select('*').eq('id', id).single(),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
  ])

  if (!team) notFound()

  const isAdmin = profile?.role === 'admin'

  // Check access: admin or manager
  if (!isAdmin) {
    const { data: mgr } = await supabase
      .from('team_managers').select('user_id').eq('team_id', id).eq('user_id', user.id).single()
    if (!mgr) redirect('/dashboard')
  }

  // Next fixture
  const today = new Date().toISOString().split('T')[0]
  const { data: nextFixtureRows } = await supabase
    .from('fixtures')
    .select('id, date, kickoff_time, venue, club_teams(id, name, clubs(name))')
    .eq('team_id', id)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1)

  const nextFixture = nextFixtureRows?.[0] ?? null
  const opponent = nextFixture ? (nextFixture.club_teams as any) : null
  const displayName = teamDisplayName(team, seasons ?? [])

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
          }`}>
            {team.type === 'senior' ? 'Senior' : 'Junior'}
          </span>
        </div>

        {/* Fixtures card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Fixtures</h2>
            <Link
              href={`/teams/${id}/fixtures/add`}
              className="text-xs font-semibold text-red-800 hover:underline"
            >
              + Add fixture
            </Link>
          </div>

          <Link href={`/teams/${id}/fixtures`} className="block px-5 py-4 hover:bg-gray-50 transition group">
            {nextFixture ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Next fixture</p>
                  <p className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition">
                    {opponent ? `${opponent.clubs?.name} ${opponent.name}` : 'Unknown opponent'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(nextFixture.date)} · {formatTime(nextFixture.kickoff_time)} ·{' '}
                    {nextFixture.venue === 'home' ? 'Home' : nextFixture.venue === 'away' ? 'Away' : 'Neutral'}
                  </p>
                </div>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-red-800 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">No upcoming fixtures. View all fixtures.</p>
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
