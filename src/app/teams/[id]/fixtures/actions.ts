'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// If opponent_id is 'club:${clubId}', find or create a blank club_team row for that club.
// If opponent_id is 'internal:${teamId}', find or create a club_teams row for the internal team.
async function resolveOpponentId(supabase: any, opponentId: string): Promise<string> {
  if (opponentId.startsWith('club:')) {
    const clubId = opponentId.slice(5)
    const { data: existing } = await supabase
      .from('club_teams').select('id').eq('club_id', clubId).eq('name', '').maybeSingle()
    if (existing) return existing.id
    const { data: created } = await supabase
      .from('club_teams').insert({ club_id: clubId, name: '' }).select('id').single()
    return created!.id
  }
  if (opponentId.startsWith('internal:')) {
    const teamId = opponentId.slice(9)
    const [{ data: team }, { data: seasons }] = await Promise.all([
      supabase.from('teams').select('name, type, founding_age_group, founding_season_id, age_group').eq('id', teamId).single(),
      supabase.from('seasons').select('id, start_date, is_current').order('start_date', { ascending: true }),
    ])
    let displayName = team?.name ?? 'Unknown'
    if (team?.type === 'junior' && team.founding_age_group && team.founding_season_id && seasons) {
      const foundingIdx = seasons.findIndex((s: any) => s.id === team.founding_season_id)
      const currentIdx = seasons.findIndex((s: any) => s.is_current)
      const age = foundingIdx !== -1 && currentIdx !== -1
        ? team.founding_age_group + (currentIdx - foundingIdx)
        : (team.age_group ?? team.founding_age_group)
      displayName = `Under ${age} ${team.name}`
    }
    const name = `[Internal] ${displayName}`
    const { data: existing } = await supabase
      .from('club_teams').select('id').is('club_id', null).eq('internal_team_id', teamId).maybeSingle()
    if (existing) return existing.id
    const { data: created } = await supabase
      .from('club_teams').insert({ club_id: null, name, internal_team_id: teamId }).select('id').single()
    return created!.id
  }
  return opponentId
}

export async function addFixture(teamId: string, formData: FormData) {
  const supabase = await createClient()

  const kickoffRaw = formData.get('kickoff_time') as string
  const tbc = formData.get('tbc') === 'true'
  const venue = formData.get('venue') as string
  const opponentRaw = formData.get('opponent_id') as string
  const intraClub = formData.get('intra_club_match') === 'true'
  const intraClubTeamId = intraClub ? (formData.get('intra_club_team_id') as string) : null

  // For intra-club, opponent is the internal team; for external, resolve normally
  const opponentId = intraClub && intraClubTeamId
    ? await resolveOpponentId(supabase, `internal:${intraClubTeamId}`)
    : opponentRaw === 'tbc' ? null : await resolveOpponentId(supabase, opponentRaw)

  const homeVenueId = (formData.get('home_venue_id') as string) || null
  const pitchId = (formData.get('pitch_id') as string) || null
  const competitionRaw = formData.get('competition') as string
  const competition = competitionRaw.startsWith('cup:') ? 'cup' : competitionRaw
  const competitionId = competitionRaw.startsWith('cup:') ? competitionRaw.slice(4) : null
  const leagueAssignedReferee = formData.get('league_assigned_referee') === 'true'
  const refereeRequired = !leagueAssignedReferee && formData.get('referee_required') === 'true'
  const date = formData.get('date') as string
  const seasonId = formData.get('season_id') as string
  const kickoffTime = tbc || !kickoffRaw ? null : kickoffRaw

  const { data: inserted, error } = await supabase.from('fixtures').insert({
    team_id: teamId,
    season_id: seasonId,
    date,
    kickoff_time: kickoffTime,
    opponent_id: opponentId,
    venue,
    competition,
    competition_id: competitionId,
    referee_required: refereeRequired,
    league_assigned_referee: leagueAssignedReferee,
    home_venue_id: venue === 'home' ? homeVenueId : null,
    pitch_id: venue === 'home' ? pitchId : null,
  }).select('id').single()

  if (error) return { error: error.message }

  // Create mirror fixture for intra-club matches
  if (intraClub && intraClubTeamId) {
    // Mirror venue: home -> away, away -> home, neutral -> neutral
    const mirrorVenue = venue === 'home' ? 'away' : venue === 'away' ? 'home' : 'neutral'
    // Mirror opponent: the primary team as seen from the mirror team's perspective
    const mirrorOpponentId = await resolveOpponentId(supabase, `internal:${teamId}`)

    const { data: mirror, error: mirrorError } = await supabase.from('fixtures').insert({
      team_id: intraClubTeamId,
      season_id: seasonId,
      date,
      kickoff_time: kickoffTime,
      opponent_id: mirrorOpponentId,
      venue: mirrorVenue,
      competition,
      competition_id: competitionId,
      referee_required: false,
      league_assigned_referee: leagueAssignedReferee,
      home_venue_id: mirrorVenue === 'home' ? homeVenueId : null,
      pitch_id: mirrorVenue === 'home' ? pitchId : null,
      is_mirror: true,
      linked_fixture_id: inserted.id,
    }).select('id').single()

    if (!mirrorError && mirror) {
      // Link primary back to mirror
      await supabase.from('fixtures').update({ linked_fixture_id: mirror.id }).eq('id', inserted.id)
      revalidatePath(`/teams/${intraClubTeamId}/fixtures`)
      revalidatePath(`/teams/${intraClubTeamId}`)
    }
  }

  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/schedule')
  return { id: inserted.id }
}

export async function updateFixture(fixtureId: string, teamId: string, formData: FormData) {
  const supabase = await createClient()

  const kickoffRaw = formData.get('kickoff_time') as string
  const tbc = formData.get('tbc') === 'true'
  const homeVenueId = formData.get('home_venue_id') as string
  const pitchId = formData.get('pitch_id') as string
  const leagueAssignedReferee = formData.get('league_assigned_referee') === 'true'
  const refereeRequired = !leagueAssignedReferee && formData.get('referee_required') === 'true'
  const refereeIdRaw = (formData.get('referee_id') as string) || ''
  const goalsForRaw = formData.get('goals_for') as string
  const goalsAgainstRaw = formData.get('goals_against') as string
  const opponentRaw = formData.get('opponent_id') as string
  const opponentId = opponentRaw === 'tbc' ? null : await resolveOpponentId(supabase, opponentRaw)

  const newDate = formData.get('date') as string
  const newKickoff = tbc || !kickoffRaw ? null : kickoffRaw
  const newCompetition = formData.get('competition') as string
  const newVenue = formData.get('venue') as string

  const { error } = await supabase.from('fixtures').update({
    date: newDate,
    kickoff_time: newKickoff,
    opponent_id: opponentId,
    venue: newVenue,
    competition: newCompetition,
    home_venue_id: homeVenueId || null,
    pitch_id: pitchId || null,
    referee_required: refereeRequired,
    league_assigned_referee: leagueAssignedReferee,
    referee_id: refereeRequired && refereeIdRaw && !refereeIdRaw.startsWith('vol:') ? refereeIdRaw : null,
    volunteer_referee_id: refereeRequired && refereeIdRaw.startsWith('vol:') ? refereeIdRaw.slice(4) : null,
    goals_for: goalsForRaw !== '' ? parseInt(goalsForRaw) : null,
    goals_against: goalsAgainstRaw !== '' ? parseInt(goalsAgainstRaw) : null,
  }).eq('id', fixtureId)

  if (error) return { error: error.message }

  // Sync date/kickoff/competition to linked mirror fixture (if this is the primary)
  const { data: thisFixture } = await supabase.from('fixtures').select('linked_fixture_id, is_mirror').eq('id', fixtureId).single()
  if (thisFixture?.linked_fixture_id && !thisFixture.is_mirror) {
    await supabase.from('fixtures').update({
      date: newDate,
      kickoff_time: newKickoff,
      competition: newCompetition,
    }).eq('id', thisFixture.linked_fixture_id)
  }

  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/schedule')
}

export async function assignRefereeFromRequest(fixtureId: string, refereeId: string, teamId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('fixtures').update({ referee_id: refereeId }).eq('id', fixtureId)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath('/fixtures')
  revalidatePath('/referee')
  return {}
}

export type PlayerPerformance = {
  player_id: string
  played: boolean
  goals: number
  assists: number
  motm: boolean
  mins_played: number
}

export async function saveResult(fixtureId: string, teamId: string, goalsFor: number, goalsAgainst: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fixtures')
    .update({ goals_for: goalsFor, goals_against: goalsAgainst })
    .eq('id', fixtureId)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}

export async function saveMatchNotes(fixtureId: string, teamId: string, notes: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('fixtures').update({ notes }).eq('id', fixtureId)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
}

export async function savePerformances(fixtureId: string, teamId: string, performances: PlayerPerformance[]) {
  const supabase = await createClient()

  // Delete existing then re-insert (simpler than upsert with conflict handling)
  const { error: delErr } = await supabase
    .from('fixture_player_performances')
    .delete()
    .eq('fixture_id', fixtureId)
  if (delErr) return { error: delErr.message }

  if (performances.length === 0) return {}

  const rows = performances.map(p => ({
    fixture_id: fixtureId,
    player_id: p.player_id,
    played: p.played,
    goals: p.goals,
    assists: p.assists,
    motm: p.motm,
    mins_played: p.mins_played,
  }))

  const { error } = await supabase.from('fixture_player_performances').insert(rows)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  return {}
}

export async function cancelFixture(fixtureId: string, teamId: string, cancellationReason: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fixtures')
    .update({ cancelled: true, cancellation_reason: cancellationReason })
    .eq('id', fixtureId)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/schedule')
  return {}
}

export async function uncancelFixture(fixtureId: string, teamId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('fixtures')
    .update({ cancelled: false, cancellation_reason: null })
    .eq('id', fixtureId)
  if (error) return { error: error.message }
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
  revalidatePath('/schedule')
  return {}
}

export async function deleteFixture(fixtureId: string, teamId: string) {
  const supabase = await createClient()
  await supabase.from('fixtures').delete().eq('id', fixtureId)
  revalidatePath(`/teams/${teamId}/fixtures`)
  revalidatePath(`/teams/${teamId}`)
}
