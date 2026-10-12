import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  // Admin only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Not authorised' }, { status: 403 })

  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const wabaIdParam = new URL(req.url).searchParams.get('waba_id')

  // Try fetching phone number info with available fields
  const phoneRes = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}?fields=id,display_phone_number,verified_name`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const phoneData = await phoneRes.json()

  // Try fetching the app's WABAs via the token's associated business
  const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const meData = await meRes.json()

  // Fetch templates via WABA ID if provided
  let templates = null
  if (wabaIdParam) {
    const tmplRes = await fetch(`https://graph.facebook.com/v20.0/${wabaIdParam}/message_templates?fields=name,language,status&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    templates = await tmplRes.json()
  }

  return NextResponse.json({ phoneNumberId, phoneData, meData, templates, hint: 'Pass ?waba_id=YOUR_WABA_ID to list templates' })
}
