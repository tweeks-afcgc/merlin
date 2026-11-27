import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import InjuryLogDetail from './InjuryLogDetail'

export const dynamic = 'force-dynamic'

export default async function InjuryLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: log } = await supabase
    .from('injury_logs')
    .select('*, teams:reporter_team_id(name), venues:venue_id(name)')
    .eq('id', id)
    .single()

  if (!log) notFound()

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/admin/injury-log" className="text-xs text-gray-400 hover:text-gray-600 transition">← Injury Log</Link>
        <InjuryLogDetail log={log} />
      </div>
    </AppShell>
  )
}
