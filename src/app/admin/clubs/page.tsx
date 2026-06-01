import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'
import ClubsClient from './ClubsClient'

export const dynamic = 'force-dynamic'

export default async function AdminClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, name, club_teams(id, name)')
    .order('name', { ascending: true })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <ClubsClient clubs={(clubs ?? []) as any} />
      </div>
    </AppShell>
  )
}
