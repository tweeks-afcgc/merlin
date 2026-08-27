'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function addTeam(formData: FormData) {
  const supabase = await createClient()

  const type = formData.get('type') as string
  const name = formData.get('name') as string
  const ageGroupRaw = formData.get('age_group') as string
  const foundingSeasonId = formData.get('founding_season_id') as string

  const gender = formData.get('gender') as string || null

  const { error } = await supabase.from('teams').insert({
    type,
    name,
    gender,
    age_group: type === 'junior' ? parseInt(ageGroupRaw) : null,
    founding_age_group: type === 'junior' ? parseInt(ageGroupRaw) : null,
    founding_season_id: type === 'junior' ? foundingSeasonId : null,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/teams')
  revalidatePath('/teams')
}

export async function deleteTeam(teamId: string) {
  const supabase = createAdminClient()

  const results = await Promise.all([
    supabase.from('fixtures').delete().eq('team_id', teamId),
    supabase.from('training_slots').delete().eq('team_id', teamId),
    supabase.from('player_team_seasons').delete().eq('team_id', teamId),
    supabase.from('volunteer_roles').delete().eq('team_id', teamId),
    supabase.from('team_competitions').delete().eq('team_id', teamId),
    supabase.from('team_sponsors').delete().eq('team_id', teamId),
  ])

  const depErrors = results.map((r, i) => r.error ? `dep[${i}]: ${r.error.message}` : null).filter(Boolean)
  if (depErrors.length) return { error: depErrors.join('; ') }

  const { error } = await supabase.from('teams').delete().eq('id', teamId)
  if (error) return { error: `teams: ${error.message}` }

  revalidatePath('/admin/teams')
  revalidatePath('/teams')
}
