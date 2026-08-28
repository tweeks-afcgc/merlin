import { createClient } from '@/lib/supabase/server'
import { teamDisplayName, computeAgeGroup } from '@/lib/teamUtils'
import TeamsClient from '@/app/teams/TeamsClient'

export const dynamic = 'force-dynamic'

const SENIOR_ORDER = ['first xi', 'sunday xi', 'women', 'vets xi']
const JUNIOR_NAME_ORDER = ['knights', 'dukes', 'roses']
const ROLE_ORDER = ['manager', 'coach', 'assistant coach', 'assistant']
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function roleSort(roleName: string): number {
  const lower = roleName.toLowerCase()
  const idx = ROLE_ORDER.findIndex(r => lower.includes(r))
  return idx === -1 ? 99 : idx
}

function pluralise(role: string): string {
  const lower = role.toLowerCase()
  if (lower.endsWith('ch')) return role + 'es'
  return role + 's'
}

export default async function PublicSquadsPage() {
  const supabase = await createClient()

  const [teamsRes, seasonsRes, rolesRes, venuesRes, compsRes, trainingRes, sponsorsRes] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
    supabase.from('volunteer_roles').select('team_id, role_name, volunteers(first_name, last_name)').eq('role_type', 'team'),
    supabase.from('venues').select('id, name'),
    supabase.from('team_competitions').select('team_id, type, name, abbr_name, division, season_id'),
    supabase.from('training_slots').select('team_id, day_of_week, frequency, start_time, end_time, venues(name)').order('created_at'),
    supabase.from('team_sponsors').select('team_id, name, season_id'),
  ])

  const rawTeams = teamsRes.data ?? []
  const seasons = seasonsRes.data ?? []
  const roleRows = rolesRes.data ?? []
  const venuesData = venuesRes.data ?? []
  const competitionsData = compsRes.data ?? []
  const trainingData = trainingRes.data ?? []
  const sponsorsData = sponsorsRes.data ?? []

  const currentSeasonId = seasons.find(s => s.is_current)?.id ?? null

  const teams = rawTeams
    .map(t => {
      const teamRoles = roleRows.filter((r: any) => r.team_id === t.id)
      const roleMap = new Map<string, { names: string[]; sortKey: number }>()
      for (const r of teamRoles as any[]) {
        if (!roleMap.has(r.role_name)) roleMap.set(r.role_name, { names: [], sortKey: roleSort(r.role_name) })
        const name = r.volunteers ? `${r.volunteers.first_name} ${r.volunteers.last_name}` : null
        if (name) roleMap.get(r.role_name)!.names.push(name)
      }
      const roleLines = Array.from(roleMap.entries())
        .sort((a, b) => a[1].sortKey - b[1].sortKey || a[0].localeCompare(b[0]))
        .map(([roleName, { names }]) => ({
          label: names.length > 1 ? pluralise(roleName) : roleName,
          names: names.length > 0 ? names : ['—'],
        }))

      const league = currentSeasonId
        ? (competitionsData).find((c: any) => c.team_id === t.id && c.season_id === currentSeasonId && c.type === 'league') as any
        : null

      const slots = trainingData
        .filter((s: any) => s.team_id === t.id)
        .sort((a: any, b: any) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week))

      const venueName = venuesData.find((v: any) => v.id === (t as any).default_venue_id)?.name ?? null

      const sponsors = currentSeasonId
        ? sponsorsData.filter((s: any) => s.team_id === t.id && s.season_id === currentSeasonId).map((s: any) => s.name)
        : []

      return {
        ...t,
        displayName: teamDisplayName(t as any, seasons),
        roleLines,
        league,
        slots,
        venueName,
        sponsors,
      }
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'senior' ? -1 : 1
      if (a.type === 'senior') {
        const ai = SENIOR_ORDER.indexOf(a.name.toLowerCase())
        const bi = SENIOR_ORDER.indexOf(b.name.toLowerCase())
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        return a.name.localeCompare(b.name)
      }
      const ageA = computeAgeGroup(a as any, seasons)
      const ageB = computeAgeGroup(b as any, seasons)
      if (ageA !== ageB) return (ageB ?? 0) - (ageA ?? 0)
      const ni = JUNIOR_NAME_ORDER.indexOf(a.name.toLowerCase())
      const nj = JUNIOR_NAME_ORDER.indexOf(b.name.toLowerCase())
      return (ni === -1 ? 99 : ni) - (nj === -1 ? 99 : nj)
    })

  const venueNames = [...new Set(teams.map(t => t.venueName).filter(Boolean) as string[])].sort()
  const formats = [...new Set(teams.map(t => (t as any).format).filter(Boolean) as string[])]
    .sort((a, b) => {
      const order = ['3v3', '5v5', '7v7', '9v9', '11v11']
      return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b))
    })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-800 px-4 py-5 shadow">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-lg font-bold text-white leading-tight">AFC Green Court</h1>
          <p className="text-sm text-red-200">Our teams</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {teams.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm">No teams to display.</p>
          </div>
        ) : (
          <TeamsClient
            teams={teams}
            isAdmin={false}
            venueNames={venueNames}
            formats={formats}
            readOnly
          />
        )}

        <p className="text-center text-xs text-gray-300 mt-10">AFC Green Court · Merlin</p>
      </div>
    </div>
  )
}
