'use server'

import { createClient } from '@/lib/supabase/server'
import { sendWhatsAppTemplate } from '@/lib/whatsapp'

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
      id, date, kickoff_time, venue, team_id,
      teams(id, name),
      club_teams(id, name, internal_team_id, clubs(name)),
      venues(name, address)
    `)
    .gte('date', todayStr)
    .order('date', { ascending: true })
    .limit(30)

  console.log('getUpcomingFixtures:', { todayStr, count: fixtures?.length, error: fixturesError?.message ?? null })

  if (!fixtures || fixtures.length === 0) return []

  const teamIds = [...new Set(fixtures.map(f => f.team_id).filter(Boolean))]
  const { data: managerRoles } = teamIds.length
    ? await supabase
        .from('volunteer_roles')
        .select('team_id, volunteers(first_name, last_name, mobile)')
        .in('team_id', teamIds)
        .ilike('role_name', '%manager%')
    : { data: [] }

  const managerMap = new Map<string, { name: string; mobile: string | null }>()
  for (const r of managerRoles ?? []) {
    if (r.team_id && !managerMap.has(r.team_id)) {
      const v = (r as any).volunteers
      if (v) managerMap.set(r.team_id, { name: `${v.first_name} ${v.last_name}`.trim(), mobile: v.mobile ?? null })
    }
  }

  return fixtures.map(f => {
    const team = (f as any).teams
    const ct = (f as any).club_teams
    const venue = (f as any).venues
    const opponentName = ct?.clubs?.name ?? ct?.name ?? 'Unknown opponent'
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
