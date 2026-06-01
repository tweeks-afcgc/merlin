import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { teamDisplayName } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('type', { ascending: false })
    .order('name', { ascending: true })

  const { data: seasons } = await supabase
    .from('seasons')
    .select('id, name, start_date, is_current')
    .order('start_date', { ascending: true })

  const currentSeason = seasons?.find(s => s.is_current)

  const seniorTeams = teams?.filter(t => t.type === 'senior') ?? []
  const juniorTeams = teams?.filter(t => t.type === 'junior') ?? []

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-green-700">Merlin</h1>
          <Link href="/profile" className="text-sm text-gray-500 hover:text-gray-700">Profile</Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Teams</h2>
          {currentSeason && (
            <span className="text-xs text-gray-400 bg-white border border-gray-200 rounded-full px-3 py-1">
              {currentSeason.name} season
            </span>
          )}
        </div>

        {!teams?.length && (
          <p className="text-sm text-gray-400">No teams have been added yet.</p>
        )}

        {seniorTeams.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Senior</h3>
            <div className="space-y-2">
              {seniorTeams.map(team => (
                <div key={team.id} className="bg-white shadow-sm rounded-xl px-5 py-4 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{teamDisplayName(team, seasons ?? [])}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Senior
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {juniorTeams.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Junior</h3>
            <div className="space-y-2">
              {juniorTeams.map(team => (
                <div key={team.id} className="bg-white shadow-sm rounded-xl px-5 py-4 flex items-center justify-between">
                  <span className="font-medium text-gray-900">{teamDisplayName(team, seasons ?? [])}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Junior
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
