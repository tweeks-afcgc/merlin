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

  // Filter out auto-created blank club_team rows (created by resolveOpponentId when
  // a club-only opponent is selected on a fixture — these are internal and shouldn't
  // be shown or managed by admins)
  const cleanedClubs = (clubs ?? []).map(club => ({
    ...club,
    club_teams: (club.club_teams as any[]).filter((t: any) => t.name !== ''),
  }))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <ClubsClient clubs={cleanedClubs as any} />
      </div>
    </AppShell>
  )
}
