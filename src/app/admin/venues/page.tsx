import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import AdminNav from '@/components/AdminNav'
import VenuesClient from './VenuesClient'

export const dynamic = 'force-dynamic'

export default async function AdminVenuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: venuesRaw } = await supabase
    .from('venues')
    .select('id, name, address, pitches(id, name)')
    .order('name', { ascending: true })

  const venues = (venuesRaw ?? []).map(v => ({
    id: v.id,
    name: v.name,
    address: (v as any).address ?? null,
    pitches: Array.isArray(v.pitches) ? v.pitches : [],
  }))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <VenuesClient venues={venues} />
      </div>
    </AppShell>
  )
}
