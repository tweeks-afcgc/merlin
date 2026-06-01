import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profile }, { data: managedTeamLinks }, { data: seasons }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('team_managers').select('team_id, teams(*)').eq('user_id', user.id),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
  ])

  const managedTeams = (managedTeamLinks ?? []).map((r: any) => r.teams).filter(Boolean)
  const firstName = profile?.full_name?.split(' ')[0] ?? null
  const currentSeason = seasons?.find(s => s.is_current) ?? null

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={profile?.role === 'admin'}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {firstName ? `Welcome, ${firstName}` : 'Welcome'}
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here's your Merlin dashboard.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Today</p>
            <p className="text-sm font-semibold text-gray-900">{today}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Season</p>
            <p className="text-sm font-semibold text-gray-900">{currentSeason?.name ?? '—'}</p>
          </div>
        </div>

        {managedTeams.length > 0 ? (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Your teams
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {managedTeams.map((team: any) => (
                <Link
                  key={team.id}
                  href={`/teams/${team.id}`}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition group"
                >
                  <p className="font-semibold text-gray-900 text-base group-hover:text-green-700 transition">
                    {teamDisplayName(team, seasons ?? [])}
                  </p>
                  <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    team.type === 'senior'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {team.type === 'senior' ? 'Senior' : 'Junior'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm">Your dashboard is empty for now.</p>
            <p className="text-gray-300 text-xs mt-1">More features coming soon.</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
