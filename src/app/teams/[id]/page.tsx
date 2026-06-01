import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName } from '@/lib/teamUtils'
import BackButton from '@/components/BackButton'

export const dynamic = 'force-dynamic'

export default async function TeamDashboardPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const [{ data: profile }, { data: team }, { data: seasons }] = await Promise.all([
    supabase.from('profiles').select('full_name, role').eq('id', user.id).single(),
    supabase.from('teams').select('*').eq('id', params.id).single(),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
  ])

  if (!team) notFound()

  const displayName = teamDisplayName(team, seasons ?? [])

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={profile?.role === 'admin'}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            team.type === 'senior' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
          }`}>
            {team.type === 'senior' ? 'Senior' : 'Junior'}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">Team dashboard coming soon.</p>
        </div>
      </div>
    </AppShell>
  )
}
