import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import RoadmapClient from './RoadmapClient'

export default async function RoadmapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  const { data: items } = await supabase
    .from('roadmap_items')
    .select('id, title, description, completed, created_at, completed_at, position')
    .order('position', { ascending: true })

  return (
    <AppShell userName={profile.full_name ?? null} isAdmin>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-4"><BackButton /></div>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">App Roadmap</h1>
          <p className="text-sm text-gray-400 mt-0.5">Features and improvements to build.</p>
        </div>
        <RoadmapClient items={items ?? []} />
      </div>
    </AppShell>
  )
}
