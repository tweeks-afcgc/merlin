'use server'

import { createClient } from '@/lib/supabase/server'

export type FixtureCardData = {
  teamName: string
  opponentName: string
  date: string
  kickoffTime: string | null
  venue: 'home' | 'away' | 'neutral'
  venueName: string | null
  venueAddress: string | null
  competition: string
  oppColours: string | null
  videoingAllowed: boolean | null
  leagueNotes: string | null
  oppFixSecName: string | null
  oppFixSecEmail: string | null
  oppFixSecPhone: string | null
  oppManagerName: string | null
  oppManagerEmail: string | null
  oppManagerPhone: string | null
}

export async function getFixtureCardData(fixtureId: string, teamId: string): Promise<{ data?: FixtureCardData; error?: string }> {
  const supabase = await createClient()

  const { data: fixture, error } = await supabase
    .from('fixtures')
    .select(`
      date, kickoff_time, venue, competition,
      opp_colours, videoing_allowed, league_notes,
      opp_fixture_sec_name, opp_fixture_sec_email, opp_fixture_sec_phone,
      opp_manager_name, opp_manager_email, opp_manager_phone,
      opp_venue_name, opp_venue_address,
      home_venue_id,
      opponent_id,
      team_id,
      seasons(id, start_date, is_current)
    `)
    .eq('id', fixtureId)
    .single()

  if (error || !fixture) return { error: error?.message ?? 'Fixture not found' }

  // Team name
  const { data: teamsData } = await supabase
    .from('teams')
    .select('id, name, type, founding_age_group, founding_season_id, age_group, nickname')
    .in('id', [teamId])

  const { data: allSeasons } = await supabase
    .from('seasons')
    .select('id, start_date, is_current')
    .order('start_date', { ascending: true })

  function teamDisplayName(team: any, seasons: any[]): string {
    if (team?.type === 'junior' && team.founding_age_group && team.founding_season_id) {
      const foundingIdx = seasons.findIndex((s: any) => s.id === team.founding_season_id)
      const currentIdx = seasons.findIndex((s: any) => s.is_current)
      const age = foundingIdx !== -1 && currentIdx !== -1
        ? team.founding_age_group + (currentIdx - foundingIdx)
        : (team.age_group ?? team.founding_age_group)
      return `Under ${age} ${team.name}`
    }
    return team?.name ?? 'Unknown'
  }

  const seasons = allSeasons ?? []
  const thisTeam = teamsData?.[0]
  const teamName = thisTeam ? teamDisplayName(thisTeam, seasons) : 'Unknown'

  // Opponent name
  let opponentName = 'TBC'
  if (fixture.opponent_id) {
    const { data: ct } = await supabase
      .from('club_teams')
      .select('name, club_id, internal_team_id, clubs(name)')
      .eq('id', fixture.opponent_id)
      .maybeSingle()

    if (ct?.internal_team_id) {
      const { data: oppTeam } = await supabase
        .from('teams')
        .select('id, name, type, founding_age_group, founding_season_id, age_group, nickname')
        .eq('id', ct.internal_team_id)
        .single()
      opponentName = oppTeam ? teamDisplayName(oppTeam, seasons) : 'Unknown'
    } else if (ct?.clubs) {
      opponentName = (ct.clubs as any).name ?? ct.name ?? 'Unknown'
    } else if (ct?.name) {
      opponentName = ct.name
    }
  }

  // Venue name & address
  let venueName: string | null = null
  let venueAddress: string | null = null
  if (fixture.venue === 'home' && fixture.home_venue_id) {
    const { data: v } = await supabase
      .from('venues')
      .select('name, address')
      .eq('id', fixture.home_venue_id)
      .maybeSingle()
    venueName = v?.name ?? null
    venueAddress = (v as any)?.address ?? null
  } else if (fixture.venue === 'away') {
    venueName = (fixture as any).opp_venue_name ?? null
    venueAddress = (fixture as any).opp_venue_address ?? null
  }

  // Competition label
  const compLabels: Record<string, string> = {
    league: 'League', cup: 'Cup', friendly: 'Friendly', tournament: 'Tournament',
  }
  const competition = compLabels[(fixture.competition as string) ?? ''] ?? fixture.competition ?? ''

  return {
    data: {
      teamName,
      opponentName,
      date: fixture.date,
      kickoffTime: fixture.kickoff_time ?? null,
      venue: fixture.venue as 'home' | 'away' | 'neutral',
      venueName,
      venueAddress,
      competition,
      oppColours: (fixture as any).opp_colours ?? null,
      videoingAllowed: (fixture as any).videoing_allowed ?? null,
      leagueNotes: (fixture as any).league_notes ?? null,
      oppFixSecName: (fixture as any).opp_fixture_sec_name ?? null,
      oppFixSecEmail: (fixture as any).opp_fixture_sec_email ?? null,
      oppFixSecPhone: (fixture as any).opp_fixture_sec_phone ?? null,
      oppManagerName: (fixture as any).opp_manager_name ?? null,
      oppManagerEmail: (fixture as any).opp_manager_email ?? null,
      oppManagerPhone: (fixture as any).opp_manager_phone ?? null,
    },
  }
}
