'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Returns match duration in minutes (including 5-min buffer for half-time/stoppages)
function matchDurationMins(teamType: string | null, ageGroup: number | null): number {
  if (teamType !== 'junior' || !ageGroup) return 95 // senior / unknown: 90 + 5
  if (ageGroup <= 8) return 45  // U7–U8: 40 + 5
  if (ageGroup <= 10) return 55 // U9–U10: 50 + 5
  if (ageGroup <= 12) return 65 // U11–U12: 60 + 5
  if (ageGroup <= 14) return 75 // U13–U14: 70 + 5
  if (ageGroup <= 16) return 85 // U15–U16: 80 + 5
  return 95                      // U17+: 90 + 5
}

export async function confirmFixture(fixtureId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // Fetch the fixture and its team's type/age group
  const { data: fixture } = await supabase
    .from('fixtures')
    .select('id, date, kickoff_time, venue, pitch_id, team_id, teams(type, age_group)')
    .eq('id', fixtureId)
    .single()

  if (!fixture) return { error: 'Fixture not found.' }

  // Kick off time must be set (not TBC)
  if (!fixture.kickoff_time) {
    return { error: 'A kick off time must be set before a fixture can be confirmed.' }
  }

  // Home fixtures must have a pitch assigned
  if (fixture.venue === 'home' && !fixture.pitch_id) {
    return { error: 'A pitch must be assigned before a home fixture can be confirmed.' }
  }

  // Pitch clash check — only applies when a pitch is assigned
  if (fixture.pitch_id && fixture.kickoff_time) {
    const team = (fixture as any).teams
    const matchDuration = matchDurationMins(team?.type, team?.age_group)

    const { data: clashes } = await supabase
      .from('fixtures')
      .select('id, date, kickoff_time, teams(type, age_group)')
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
        const clashTeam = (clash as any).teams
        const clashDuration = matchDurationMins(clashTeam?.type, clashTeam?.age_group)
        // The required gap is the longer of the two match durations
        const requiredGap = Math.max(matchDuration, clashDuration)
        if (Math.abs(fixtureMinutes - clashMinutes) < requiredGap) {
          return { error: `Pitch clash: another confirmed fixture uses this pitch within ${requiredGap} minutes of this kick off time.` }
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
  return {}
}
