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

  // Unset existing current season
  await supabase.from('seasons').update({ is_current: false }).eq('is_current', true)

  // Set new current season
  const { error } = await supabase.from('seasons').update({ is_current: true }).eq('id', seasonId)
  if (error) return { error: error.message }

  // Increment age_group on all junior teams
  const { data: juniorTeams } = await supabase
    .from('teams')
    .select('id, age_group')
    .eq('type', 'junior')

  if (juniorTeams) {
    for (const team of juniorTeams) {
      await supabase
        .from('teams')
        .update({ age_group: (team.age_group ?? 0) + 1 })
        .eq('id', team.id)
    }
  }

  revalidatePath('/admin/seasons')
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
}
