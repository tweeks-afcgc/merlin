'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function confirmFixture(fixtureId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Fetch the fixture
  const { data: fixture } = await supabase
    .from('fixtures')
    .select('id, date, kickoff_time, venue, pitch_id, team_id')
    .eq('id', fixtureId)
    .single()

  if (!fixture) return { error: 'Fixture not found.' }

  // Home fixtures must have a pitch assigned
  if (fixture.venue === 'home' && !fixture.pitch_id) {
    return { error: 'A pitch must be assigned before a home fixture can be confirmed.' }
  }

  // Pitch clash check — only applies when a pitch is assigned
  if (fixture.pitch_id && fixture.kickoff_time) {
    const { data: clashes } = await supabase
      .from('fixtures')
      .select('id, date, kickoff_time')
      .eq('pitch_id', fixture.pitch_id)
      .eq('date', fixture.date)
      .eq('confirmed', true)
      .neq('id', fixtureId)

    if (clashes && clashes.length > 0) {
      const [fh, fm] = fixture.kickoff_time.split(':').map(Number)
      const fixtureMinutes = fh * 60 + fm

      for (const clash of clashes) {
        if (!clash.kickoff_time) continue
        const [ch, cm] = clash.kickoff_time.split(':').map(Number)
        const clashMinutes = ch * 60 + cm
        if (Math.abs(fixtureMinutes - clashMinutes) < 90) {
          return { error: `Pitch clash: another confirmed fixture uses this pitch within 90 minutes of this kick off time.` }
        }
      }
    }
  }

  const { error } = await supabase
    .from('fixtures')
    .update({ confirmed: true })
    .eq('id', fixtureId)

  if (error) return { error: error.message }

  revalidatePath('/fixtures')
  revalidatePath(`/teams/${fixture.team_id}/fixtures`)
  return {}
}

export async function unconfirmFixture(fixtureId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: fixture } = await supabase
    .from('fixtures').select('team_id').eq('id', fixtureId).single()

  const { error } = await supabase
    .from('fixtures').update({ confirmed: false }).eq('id', fixtureId)

  if (error) return { error: error.message }

  revalidatePath('/fixtures')
  if (fixture) revalidatePath(`/teams/${fixture.team_id}/fixtures`)
}
