'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addClub(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('clubs').insert({ name: formData.get('name') as string })
  if (error) return { error: error.message }
  revalidatePath('/admin/clubs')
}

export async function addClubTeam(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.from('club_teams').insert({
    club_id: formData.get('club_id') as string,
    name: formData.get('name') as string,
  })
  if (error) return { error: error.message }
  revalidatePath('/admin/clubs')
}

export async function deleteClub(clubId: string) {
  const supabase = await createClient()
  await supabase.from('clubs').delete().eq('id', clubId)
  revalidatePath('/admin/clubs')
}

export async function deleteClubTeam(teamId: string) {
  const supabase = await createClient()
  await supabase.from('club_teams').delete().eq('id', teamId)
  revalidatePath('/admin/clubs')
}
