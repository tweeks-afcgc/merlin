'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// If opponent_id is 'club:${clubId}', find or create a blank club_team row for that club
async function resolveOpponentId(supabase: any, opponentId: string): Promise<string> {
  if (!opponentId.startsWith('club:')) return opponentId
  const clubId = opponentId.slice(5)
  const { data: existing } = await supabase
    .from('club_teams').select('id').eq('club_id', clubId).eq('name', '').maybeSingle()
  if (existing) return existing.id
  const { data: created } = await supabase
    .from('club_teams').insert({ club_id: clubId, name: '' }).select('id').single()
  return created!.id
}

export async function addFixture(teamId: string, formData: FormData) {
  const supabase = await createClient()

  const kickoffRaw = formData.get('kickoff_time') as string
  const tbc = formData.get('tbc') === 'true'
  const venue = formData.get('venue') as string
  const opponentId = await resolveOpponentId(supabase, formData.get('opponent_id') as string)

  const { data: inserted, error } = await supabase.from('fixtures').insert({
    team_id: teamId,
    season_id: formData.get('season_id') as string,
    date: formData.get('date') as string,
    kickoff_time: tbc || !kickoffRaw ? null : kickoffRaw,
    opponent_id: opponentId,
    venue,
    competition: formData.get('competition') as string,
    referee_required: venue === 'home',
  }).select('id').single()

  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
  return { id: inserted.id }
}

export async function updateFixture(fixtureId: string, teamId: string, formData: FormData) {
  const supabase = await createClient()

  const kickoffRaw = formData.get('kickoff_time') as string
  const tbc = formData.get('tbc') === 'true'
  const homeVenueId = formData.get('home_venue_id') as string
  const pitchId = formData.get('pitch_id') as string
  const refereeRequired = formData.get('referee_required') === 'true'
  const refereeIdRaw = formData.get('referee_id') as string
  const goalsForRaw = formData.get('goals_for') as string
  const goalsAgainstRaw = formData.get('goals_against') as string
  const opponentId = await resolveOpponentId(supabase, formData.get('opponent_id') as string)

  const { error } = await supabase.from('fixtures').update({
    date: formData.get('date') as string,
    kickoff_time: tbc || !kickoffRaw ? null : kickoffRaw,
    opponent_id: opponentId,
    venue: formData.get('venue') as string,
    competition: formData.get('competition') as string,
    home_venue_id: homeVenueId || null,
    pitch_id: pitchId || null,
    referee_required: refereeRequired,
    referee_id: refereeRequired && refereeIdRaw ? refereeIdRaw : null,
    goals_for: goalsForRaw !== '' ? parseInt(goalsForRaw) : null,
    goals_against: goalsAgainstRaw !== '' ? parseInt(goalsAgainstRaw) : null,
  }).eq('id', fixtureId)

  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}

export async function assignRefereeFromRequest(fixtureId: string, refereeId: string, teamId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('fixtures').update({ referee_id: refereeId }).eq('id', fixtureId)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath('/fixtures')
  revalidatePath('/referee')
  return {}
}

export async function deleteFixture(fixtureId: string, teamId: string) {
  const supabase = await createClient()
  await supabase.from('fixtures').delete().eq('id', fixtureId)
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}
