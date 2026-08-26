'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addTeamCompetition(teamId: string, seasonId: string, type: 'league' | 'cup', name: string, abbrName?: string, division?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('team_competitions').insert({
    team_id: teamId,
    season_id: seasonId,
    type,
    name: name.trim(),
    abbr_name: abbrName?.trim() || null,
    division: division?.trim() || null,
  })
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}`)
  return {}
}

export async function deleteTeamCompetition(id: string, teamId: string) {
  const supabase = await createClient()
  await supabase.from('team_competitions').delete().eq('id', id)
  revalidatePath(`/teams/${teamId}`)
}

export async function addTeamSponsor(teamId: string, seasonId: string, name: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('team_sponsors').insert({ team_id: teamId, season_id: seasonId, name: name.trim() })
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}`)
  return {}
}

export async function deleteTeamSponsor(id: string, teamId: string) {
  const supabase = await createClient()
  await supabase.from('team_sponsors').delete().eq('id', id)
  revalidatePath(`/teams/${teamId}`)
}
