'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppText } from '@/lib/whatsapp'

export async function sendAdminWhatsApp(volunteerId: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { ok: false, error: 'Not authorised' }

  const { data: volunteer } = await supabase
    .from('volunteers')
    .select('first_name, last_name, mobile')
    .eq('id', volunteerId)
    .single()

  if (!volunteer?.mobile) return { ok: false, error: 'No mobile number for this volunteer' }

  return sendWhatsAppText(volunteer.mobile, message)
}
