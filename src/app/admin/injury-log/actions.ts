'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateInjuryLog(id: string, data: {
  status: string
  reported_to_league: boolean | null
  reported_to_league_date: string | null
  reported_to_kent_fa: boolean | null
  reported_to_kent_fa_date: string | null
  reported_to_insurer: boolean | null
  reported_to_insurer_date: string | null
  fit_to_return_date: string | null
  admin_notes: string | null
  closed_by: string | null
  closed_date: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Not authorised' }

  const { error } = await supabase.from('injury_logs').update(data).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/injury-log/${id}`)
  revalidatePath('/admin/injury-log')
  return { success: true }
}
