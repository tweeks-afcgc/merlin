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

export async function deleteReview(reviewId: string, type: 'referee' | 'manager') {
  const supabase = await createClient()

  if (type === 'referee') {
    // Check if manager side is submitted — if so, only wipe the ref fields rather than deleting the row
    const { data: row } = await supabase
      .from('fixture_reviews')
      .select('manager_submitted_at')
      .eq('id', reviewId)
      .single()

    if (row?.manager_submitted_at) {
      // Manager already submitted — clear ref fields only (can't delete the row)
      const { error } = await supabase
        .from('fixture_reviews')
        .update({ ref_submitted_at: null, ref_coaches_score: null, ref_spectators_score: null, ref_players_score: null, ref_experience_score: null, ref_comments: null })
        .eq('id', reviewId)
      if (error) return { error: error.message }
      revalidatePath('/admin/reviews')
      return {}
    }
  }

  if (type === 'manager') {
    const { data: row } = await supabase
      .from('fixture_reviews')
      .select('ref_submitted_at')
      .eq('id', reviewId)
      .single()

    if (row?.ref_submitted_at) {
      const { error } = await supabase
        .from('fixture_reviews')
        .update({ manager_submitted_at: null, manager_ref_score: null, manager_comments: null })
        .eq('id', reviewId)
      if (error) return { error: error.message }
      revalidatePath('/admin/reviews')
      return {}
    }
  }

  // Neither side submitted — safe to delete the whole row
  const { error } = await supabase
    .from('fixture_reviews')
    .delete()
    .eq('id', reviewId)
  if (error) return { error: error.message }
  revalidatePath('/admin/reviews')
  return {}
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
