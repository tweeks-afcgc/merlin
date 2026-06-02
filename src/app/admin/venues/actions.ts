'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addVenue(formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required' }
  const address = (formData.get('address') as string).trim() || null
  const { error } = await supabase.from('venues').insert({ name, address })
  if (error) return { error: error.message }
  revalidatePath('/admin/venues')
}

export async function updateVenue(id: string, formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required' }
  const address = (formData.get('address') as string).trim() || null
  const { error } = await supabase.from('venues').update({ name, address }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/venues')
}

export async function deleteVenue(id: string) {
  const supabase = await createClient()
  await supabase.from('venues').delete().eq('id', id)
  revalidatePath('/admin/venues')
}

export async function addPitch(venueId: string, formData: FormData) {
  const supabase = await createClient()
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Name is required' }
  const { error } = await supabase.from('pitches').insert({ venue_id: venueId, name })
  if (error) return { error: error.message }
  revalidatePath('/admin/venues')
}

export async function deletePitch(id: string) {
  const supabase = await createClient()
  await supabase.from('pitches').delete().eq('id', id)
  revalidatePath('/admin/venues')
}
