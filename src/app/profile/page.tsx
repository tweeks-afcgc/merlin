import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'â€”'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profile }, { data: managedTeamLinks }, { data: seasons }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, dob, role').eq('id', user.id).single(),
    supabase.from('team_managers').select('team_id, teams(*)').eq('user_id', user.id),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
  ])

  const managedTeams = (managedTeamLinks ?? []).map((row: any) => row.teams).filter(Boolean)

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={profile?.role === 'admin'}>
      <div className="max-w-md mx-auto px-4 py-8">

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-800 text-xl font-bold flex-shrink-0">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{profile?.full_name ?? 'â€”'}</h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-900 capitalize">
                {profile?.role ?? 'standard'}
              </span>
            </div>
          </div>

          <dl className="space-y-4 mb-6">
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.full_name ?? 'â€”'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Email address</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile?.email ?? user.email ?? 'â€”'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Date of birth</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(profile?.dob ?? null)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">Role</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{profile?.role ?? 'standard'}</dd>
            </div>
          </dl>

          <Link
            href="/profile/edit"
            className="block w-full text-center border border-red-800 text-red-800 hover:bg-red-50 font-semibold py-2.5 rounded-lg text-sm transition"
          >
            Edit profile
          </Link>
        </div>

        {managedTeams.length > 0 && (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Teams managed</h3>
            <ul className="space-y-2">
              {managedTeams.map((team: any) => (
                <li key={team.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{teamDisplayName(team, seasons ?? [])}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {team.type === 'senior' ? 'Senior' : 'Junior'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  )
}

