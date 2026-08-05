'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function quickAddPlayer(
  teamId: string,
  seasonId: string,
  formData: FormData,
) {
  const supabase = await createClient()

  const first_name = (formData.get('first_name') as string).trim()
  const last_name = (formData.get('last_name') as string).trim()
  const date_of_birth = (formData.get('date_of_birth') as string) || null

  if (!first_name || !last_name) return { error: 'First and last name are required.' }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({ first_name, last_name, date_of_birth })
    .select('id')
    .single()

  if (playerError) return { error: playerError.message }

  const { error: linkError } = await supabase
    .from('player_team_seasons')
    .insert({ player_id: player.id, team_id: teamId, season_id: seasonId })

  if (linkError) return { error: linkError.message }

  revalidatePath(`/teams/${teamId}`)
}
