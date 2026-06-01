'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addTeam(formData: FormData) {
  const supabase = await createClient()

  const type = formData.get('type') as string
  const name = formData.get('name') as string
  const ageGroupRaw = formData.get('age_group') as string

  const { error } = await supabase.from('teams').insert({
    type,
    name,
    age_group: type === 'junior' ? parseInt(ageGroupRaw) : null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
}

export async function deleteTeam(teamId: string) {
  const supabase = await createClient()
  await supabase.from('teams').delete().eq('id', teamId)
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
}
