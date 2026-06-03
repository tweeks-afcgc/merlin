'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestFixture(fixtureId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles').select('is_referee').eq('id', user.id).single()
  if (!profile?.is_referee) return { error: 'Not a referee' }

  const { error } = await supabase.from('referee_requests').insert({
    fixture_id: fixtureId,
    referee_id: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/referee')
  revalidatePath('/fixtures')
  return {}
}
