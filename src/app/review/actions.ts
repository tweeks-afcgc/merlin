'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function submitRefReview(token: string, data: {
  coaches: number
  spectators: number
  players: number
  experience: number
  comments: string
}) {
  const supabase = createAdminClient()
  const { data: review, error: findErr } = await supabase
    .from('fixture_reviews')
    .select('id, ref_submitted_at')
    .eq('ref_token', token)
    .single()

  if (findErr || !review) return { error: 'Review link not found.' }
  if (review.ref_submitted_at) return { error: 'This review has already been submitted.' }

  const { error } = await supabase
    .from('fixture_reviews')
    .update({
      ref_submitted_at: new Date().toISOString(),
      ref_coaches_score: data.coaches,
      ref_spectators_score: data.spectators,
      ref_players_score: data.players,
      ref_experience_score: data.experience,
      ref_comments: data.comments || null,
    })
    .eq('id', review.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function submitManagerReview(token: string, data: {
  score: number
  comments: string
}) {
  const supabase = createAdminClient()
  const { data: review, error: findErr } = await supabase
    .from('fixture_reviews')
    .select('id, manager_submitted_at')
    .eq('manager_token', token)
    .single()

  if (findErr || !review) return { error: 'Review link not found.' }
  if (review.manager_submitted_at) return { error: 'This review has already been submitted.' }

  const { error } = await supabase
    .from('fixture_reviews')
    .update({
      manager_submitted_at: new Date().toISOString(),
      manager_ref_score: data.score,
      manager_comments: data.comments || null,
    })
    .eq('id', review.id)

  if (error) return { error: error.message }
  return { success: true }
}
