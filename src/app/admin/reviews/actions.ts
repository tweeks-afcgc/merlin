'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function ensureFixtureReview(fixtureId: string) {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('fixture_reviews')
    .select('id, ref_token, manager_token')
    .eq('fixture_id', fixtureId)
    .single()

  if (existing) return { review: existing }

  const { data, error } = await supabase
    .from('fixture_reviews')
    .insert({ fixture_id: fixtureId })
    .select('id, ref_token, manager_token')
    .single()

  if (error) return { error: error.message }
  return { review: data }
}

export async function resetRefReview(fixtureId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fixture_reviews')
    .update({
      ref_submitted_at: null,
      ref_coaches_score: null,
      ref_spectators_score: null,
      ref_players_score: null,
      ref_experience_score: null,
      ref_comments: null,
    })
    .eq('fixture_id', fixtureId)

  if (error) return { error: error.message }
  revalidatePath('/fixtures')
}

export async function resetManagerReview(fixtureId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fixture_reviews')
    .update({
      manager_submitted_at: null,
      manager_ref_score: null,
      manager_comments: null,
    })
    .eq('fixture_id', fixtureId)

  if (error) return { error: error.message }
  revalidatePath('/fixtures')
}
