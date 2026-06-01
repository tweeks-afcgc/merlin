'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addFixture(teamId: string, formData: FormData) {
  const supabase = await createClient()

  const kickoffRaw = formData.get('kickoff_time') as string
  const tbc = formData.get('tbc') === 'true'

  const { error } = await supabase.from('fixtures').insert({
    team_id: teamId,
    season_id: formData.get('season_id') as string,
    date: formData.get('date') as string,
    kickoff_time: tbc || !kickoffRaw ? null : kickoffRaw,
    opponent_id: formData.get('opponent_id') as string,
    venue: formData.get('venue') as string,
  })

  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}

export async function deleteFixture(fixtureId: string, teamId: string) {
  const supabase = await createClient()
  await supabase.from('fixtures').delete().eq('id', fixtureId)
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}
