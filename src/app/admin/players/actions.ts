'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addPlayer(formData: FormData) {
  const supabase = await createClient()
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  const dob = (formData.get('date_of_birth') as string) || null
  if (!firstName || !lastName) return { error: 'First and last name are required' }
  const { error } = await supabase.from('players').insert({ first_name: firstName, last_name: lastName, date_of_birth: dob })
  if (error) return { error: error.message }
  revalidatePath('/admin/players')
}

export async function updatePlayer(playerId: string, formData: FormData) {
  const supabase = await createClient()
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  const dob = (formData.get('date_of_birth') as string) || null
  if (!firstName || !lastName) return { error: 'First and last name are required' }
  const { error } = await supabase.from('players').update({ first_name: firstName, last_name: lastName, date_of_birth: dob }).eq('id', playerId)
  if (error) return { error: error.message }
  revalidatePath('/admin/players')
}

export async function deletePlayer(playerId: string) {
  const supabase = await createClient()
  await supabase.from('players').delete().eq('id', playerId)
  revalidatePath('/admin/players')
}

export async function addPlayerTeamSeason(playerId: string, formData: FormData) {
  const supabase = await createClient()
  const teamId = formData.get('team_id') as string
  const seasonId = formData.get('season_id') as string
  if (!teamId || !seasonId) return { error: 'Team and season are required' }
  const { error } = await supabase.from('player_team_seasons').insert({ player_id: playerId, team_id: teamId, season_id: seasonId })
  if (error?.code === '23505') return { error: 'This player is already linked to that team for that season' }
  if (error) return { error: error.message }
  revalidatePath('/admin/players')
}

export async function removePlayerTeamSeason(id: string) {
  const supabase = await createClient()
  await supabase.from('player_team_seasons').delete().eq('id', id)
  revalidatePath('/admin/players')
}
