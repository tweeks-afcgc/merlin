import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { addTeam } from './actions'
import { DeleteTeamButton } from './DeleteTeamButton'
import AddTeamForm from './AddTeamForm'

export const dynamic = 'force-dynamic'

function AdminNav() {
  return (
    <div className="flex gap-4 text-sm mb-8">
      <Link href="/admin/seasons" className="text-gray-500 hover:text-gray-700">Seasons</Link>
      <Link href="/admin/teams" className="text-green-700 font-semibold border-b-2 border-green-700 pb-0.5">Teams</Link>
      <Link href="/admin/users" className="text-gray-500 hover:text-gray-700">Users</Link>
    </div>
  )
}

function teamDisplayName(team: { type: string; name: string; age_group: number | null }) {
  if (team.type === 'junior') return `Under ${team.age_group} ${team.name}`
  return team.name
}

export default async function AdminTeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/profile')

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('type', { ascending: false })
    .order('name', { ascending: true })

  const { data: currentSeason } = await supabase
    .from('seasons')
    .select('name')
    .eq('is_current', true)
    .single()

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-green-700">Merlin</h1>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">Back to profile</Link>
        </div>

        <AdminNav />

        <AddTeamForm />

        <div className="bg-white shadow rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Teams</h2>
            {currentSeason && (
              <span className="text-xs text-gray-400">Season: {currentSeason.name}</span>
            )}
          </div>

          {!teams?.length ? (
            <p className="text-sm text-gray-400">No teams added yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Team name</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3">Type</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teams.map(team => (
                  <tr key={team.id}>
                    <td className="py-3 pr-4 font-medium text-gray-900">{teamDisplayName(team)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        team.type === 'senior'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {team.type === 'senior' ? 'Senior' : 'Junior'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <DeleteTeamButton teamId={team.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  )
}
