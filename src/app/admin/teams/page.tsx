import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DeleteTeamButton } from './DeleteTeamButton'
import AddTeamForm from './AddTeamForm'
import { teamDisplayName } from '@/lib/teamUtils'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function AdminTeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: rawTeams }, { data: seasons }] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
  ])

  const currentSeason = seasons?.find(s => s.is_current) ?? null

  const SENIOR_ORDER = ['First XI', 'Sunday XI', 'Vets XI', 'Women']

  const sortedSeasons = [...(seasons ?? [])].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )
  const currentIdx = sortedSeasons.findIndex(s => s.is_current)

  function teamSortKey(team: typeof rawTeams extends (infer T)[] | null ? T : never) {
    if (!team) return ''
    if ((team as any).type === 'senior') {
      const idx = SENIOR_ORDER.indexOf((team as any).name)
      return `0_${idx === -1 ? 9 : idx}_${(team as any).name}`
    }
    const foundingAge = (team as any).founding_age_group ?? 0
    const foundingIdx = sortedSeasons.findIndex(s => s.id === (team as any).founding_season_id)
    const age = foundingIdx === -1 || currentIdx === -1 ? foundingAge : foundingAge + (currentIdx - foundingIdx)
    return `1_${String(999 - age).padStart(4, '0')}_${(team as any).name}`
  }

  const teams = [...(rawTeams ?? [])].sort((a, b) => teamSortKey(a).localeCompare(teamSortKey(b)))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />

        <AddTeamForm currentSeason={currentSeason} />

        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Teams</h2>
            {currentSeason && <span className="text-xs text-gray-400">Season: {currentSeason.name}</span>}
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
                    <td className="py-3 pr-4 font-medium text-gray-900">{teamDisplayName(team, seasons ?? [])}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {team.type === 'senior' ? 'Senior' : 'Junior'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-4">
                        <Link href={`/teams/${team.id}/fixtures`} className="text-sm text-gray-500 hover:text-gray-900 hover:underline">Fixtures</Link>
                        <Link href={`/admin/teams/${team.id}/edit`} className="text-sm text-red-800 hover:underline">Edit</Link>
                        <DeleteTeamButton teamId={team.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
