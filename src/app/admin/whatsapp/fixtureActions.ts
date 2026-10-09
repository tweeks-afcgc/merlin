'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'
import { fixtureOpponentName, type Season } from '@/lib/teamUtils'

export type UpcomingFixture = {
  id: string
  teamId: string
  teamName: string
  date: string
  kickoffTime: string | null
  opponentName: string
  venueName: string | null
  venueAddress: string | null
  managerName: string | null
  managerMobile: string | null
}

export async function getUpcomingFixtures(): Promise<UpcomingFixture[]> {
  const supabase = await createClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: fixtures, error: fixturesError } = await supabase
    .from('fixtures')
    .select(`
      id, date, kickoff_time, venue, team_id, season_id, internal_team_id,
      opponent_id, is_home,
      teams(id, name, type, founding_age_group, founding_season_id, age_group, nickname, gender, format),
      clubs:opponent_id(name),
      venues(name, address)
    `)
    .gte('date', todayStr)
    .or('cancelled.is.null,cancelled.eq.false')
    .order('date', { ascending: true })
    .limit(30)

  console.log('getUpcomingFixtures:', { todayStr, count: fixtures?.length, error: fixturesError?.message ?? null })

  const [{ data: seasons }, { data: internalTeams }] = await Promise.all([
    supabase.from('seasons').select('id, name, start_date, is_current'),
    supabase.from('club_teams').select('team_id, internal_team_id'),
  ])
  if (!fixtures) return []

  const internalTeamIds = [...new Set(fixtures.map(f => (f as any).internal_team_id).filter(Boolean))]
  const { data: internalTeamRows } = internalTeamIds.length > 0
    ? await supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group, nickname').in('id', internalTeamIds)
    : { data: [] }

  const internalTeamMap = new Map((internalTeamRows ?? []).map(t => [t.id, t]))

  const teamIds = [...new Set(fixtures.map(f => f.team_id).filter(Boolean))]
  const { data: managerRoles } = await supabase
    .from('volunteer_roles')
    .select('team_id, volunteers(id, first_name, last_name, mobile)')
    .in('team_id', teamIds)
    .ilike('role_name', '%manager%')

  const managerMap = new Map<string, { name: string; mobile: string | null }>()
  for (const r of managerRoles ?? []) {
    if (r.team_id && !managerMap.has(r.team_id)) {
      const v = (r as any).volunteers
      if (v) managerMap.set(r.team_id, { name: `${v.first_name} ${v.last_name}`.trim(), mobile: v.mobile ?? null })
    }
  }

  return fixtures.map(f => {
    const team = (f as any).teams
    const club = (f as any).clubs
    const venue = (f as any).venues
    const internalTeam = (f as any).internal_team_id ? internalTeamMap.get((f as any).internal_team_id) : undefined
    const opponent = { club, internal_team_id: (f as any).internal_team_id, is_home: f.is_home, internalTeam }
    const opponentName = fixtureOpponentName(opponent as any, (seasons ?? []) as Season[], f.season_id)
    const manager = managerMap.get(f.team_id)
    return {
      id: f.id,
      teamId: f.team_id,
      teamName: team?.name ?? 'Unknown',
      date: f.date,
      kickoffTime: f.kickoff_time ?? null,
      opponentName,
      venueName: venue?.name ?? null,
      venueAddress: venue?.address ?? null,
      managerName: manager?.name ?? null,
      managerMobile: manager?.mobile ?? null,
    }
  })
}

export async function sendFixtureConfirmation(fixtureId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { ok: false, error: 'Not authorised' }

  const fixtures = await getUpcomingFixtures()
  const fixture = fixtures.find(f => f.id === fixtureId)
  if (!fixture) return { ok: false, error: 'Fixture not found' }
  if (!fixture.managerMobile) return { ok: false, error: 'No mobile number for the team manager' }

  const dateStr = new Date(fixture.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = fixture.kickoffTime ? ` at ${fixture.kickoffTime.slice(0, 5)}` : ''

  return sendWhatsAppTemplate(fixture.managerMobile, 'fixture_confirmed', [
    fixture.managerName ?? 'Manager',
    `${dateStr}${timeStr}`,
    fixture.venueName ?? 'TBC',
    fixture.opponentName,
    fixture.venueAddress ?? 'TBC',
  ])
}
