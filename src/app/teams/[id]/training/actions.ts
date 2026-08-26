'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addTrainingSlot(teamId: string, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.from('training_slots').insert({
    team_id: teamId,
    day_of_week: formData.get('day_of_week') as string,
    frequency: formData.get('frequency') as string,
    start_time: (formData.get('start_time') as string) || null,
    end_time: (formData.get('end_time') as string) || null,
    venue_id: (formData.get('venue_id') as string) || null,
    notes: (formData.get('notes') as string).trim() || null,
  })

  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}`)
}

export async function deleteTrainingSlot(slotId: string, teamId: string) {
  const supabase = await createClient()
  await supabase.from('training_slots').delete().eq('id', slotId)
  revalidatePath(`/teams/${teamId}`)
}
