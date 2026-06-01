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
    competition: formData.get('competition') as string,
  })

  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}

export async function updateFixture(fixtureId: string, teamId: string, formData: FormData) {
  const supabase = await createClient()

  const kickoffRaw = formData.get('kickoff_time') as string
  const tbc = formData.get('tbc') === 'true'

  const homeVenueId = formData.get('home_venue_id') as string
  const pitchId = formData.get('pitch_id') as string

  const { error } = await supabase.from('fixtures').update({
    date: formData.get('date') as string,
    kickoff_time: tbc || !kickoffRaw ? null : kickoffRaw,
    opponent_id: formData.get('opponent_id') as string,
    venue: formData.get('venue') as string,
    competition: formData.get('competition') as string,
    home_venue_id: homeVenueId || null,
    pitch_id: pitchId || null,
  }).eq('id', fixtureId)

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
