import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  // Admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  // Get the WABA ID from the phone number
  const phoneRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating,platform_type,throughput,whatsapp_business_account`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const phoneData = await phoneRes.json()

  const wabaId = phoneData?.whatsapp_business_account?.id

  let templates = null
  if (wabaId) {
    const tmplRes = await fetch(`https://graph.facebook.com/v20.0/${wabaId}/message_templates?fields=name,language,status&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    templates = await tmplRes.json()
  }

  return NextResponse.json({ phoneNumberId, phoneData, wabaId, templates })
}
