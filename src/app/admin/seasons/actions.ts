'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addSeason(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('seasons').insert({
    name: formData.get('name') as string,
    start_date: formData.get('start_date') as string,
    end_date: formData.get('end_date') as string,
    is_current: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/seasons')
}

export async function setCurrentSeason(seasonId: string) {
  const supabase = await createClient()

  await supabase.from('seasons').update({ is_current: false }).eq('is_current', true)

  const { error } = await supabase.from('seasons').update({ is_current: true }).eq('id', seasonId)
  if (error) return { error: error.message }

  revalidatePath('/admin/seasons')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
}
