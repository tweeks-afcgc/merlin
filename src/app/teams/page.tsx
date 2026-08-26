import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName, computeAgeGroup } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

const COLOUR_MAP: Record<string, string> = {
  'light red': '#fca5a5', 'red': '#dc2626', 'dark red': '#991b1b', 'maroon': '#7f1d1d', 'burgundy': '#881337',
  'rose': '#fb7185', 'pink': '#ec4899', 'hot pink': '#db2777', 'magenta': '#a21caf',
  'peach': '#fdba74', 'orange': '#f97316', 'dark orange': '#c2410c', 'burnt orange': '#92400e',
  'yellow': '#fde047', 'amber': '#f59e0b', 'gold': '#d97706',
  'lime': '#a3e635', 'light green': '#4ade80', 'green': '#16a34a', 'dark green': '#15803d', 'forest': '#166534', 'emerald': '#059669',
  'sky blue': '#7dd3fc', 'light blue': '#38bdf8', 'cyan': '#06b6d4', 'blue': '#2563eb', 'royal blue': '#1d4ed8', 'dark blue': '#1e40af', 'navy': '#1e3a5f',
  'lilac': '#c084fc', 'purple': '#9333ea', 'violet': '#7c3aed', 'indigo': '#4f46e5',
  'white': '#f9fafb', 'cream': '#fef9c3', 'silver': '#e5e7eb', 'light grey': '#9ca3af', 'grey': '#6b7280', 'gray': '#6b7280', 'dark grey': '#374151', 'charcoal': '#1f2937', 'black': '#111827',
}

function kitColour(s: string | null): string {
  if (!s) return '#d1d5db'
  return COLOUR_MAP[s.toLowerCase()] ?? '#d1d5db'
}

const SENIOR_ORDER = ['first xi', 'sunday xi', 'women', 'vets xi']
const JUNIOR_NAME_ORDER = ['knights', 'dukes', 'roses']
const ROLE_ORDER = ['manager', 'coach', 'assistant coach', 'assistant']
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getAge(team: any, seasons: any[]): number | null {
  return computeAgeGroup(team, seasons)
}

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

function fmtTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  const [teamsRes, seasonsRes, rolesRes, venuesRes, compsRes, trainingRes, sponsorsRes] = await Promise.all([
    supabase.from('teams').select('*'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
    supabase.from('volunteer_roles').select('team_id, role_name, volunteers(first_name, last_name)').eq('role_type', 'team'),
    supabase.from('venues').select('id, name'),
    supabase.from('team_competitions').select('team_id, type, name, abbr_name, division, season_id'),
    supabase.from('training_slots').select('team_id, day_of_week, frequency, start_time, end_time, venues(name)').order('created_at'),
    supabase.from('team_sponsors').select('team_id, name, season_id'),
  ])

  if (teamsRes.error) throw new Error(`teams: ${teamsRes.error.message}`)
  if (seasonsRes.error) throw new Error(`seasons: ${seasonsRes.error.message}`)

  const rawTeams = teamsRes.data
  const seasons = seasonsRes.data
  const roleRows = rolesRes.data ?? []
  const venuesData = venuesRes.data ?? []
  const competitionsData = compsRes.data ?? []
  const trainingData = trainingRes.data ?? []
  const sponsorsData = sponsorsRes.data ?? []

  const seasonsList = seasons ?? []
  const currentSeasonId = seasonsList.find(s => s.is_current)?.id ?? null

  const teams = (rawTeams ?? [])

    .map(t => {
      // Group roles by role_name, collect volunteer names
      const teamRoles = (roleRows ?? []).filter((r: any) => r.team_id === t.id)
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
          value: names.join(', ') || '—',
        }))

      // League for current season
      const league = currentSeasonId
        ? (competitionsData ?? []).find((c: any) => c.team_id === t.id && c.season_id === currentSeasonId && c.type === 'league') as any
        : null

      // Training slots sorted by day
      const slots = (trainingData ?? [])
        .filter((s: any) => s.team_id === t.id)
        .sort((a: any, b: any) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week))

      // Default venue
      const venueName = (venuesData ?? []).find((v: any) => v.id === (t as any).default_venue_id)?.name ?? null

      // Sponsors for current season
      const sponsors = currentSeasonId
        ? (sponsorsData ?? []).filter((s: any) => s.team_id === t.id && s.season_id === currentSeasonId).map((s: any) => s.name)
        : []

      return {
        ...t,
        displayName: teamDisplayName(t as any, seasonsList),
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
      const ageA = getAge(a as any, seasonsList)
      const ageB = getAge(b as any, seasonsList)
      if (ageA !== ageB) return (ageB ?? 0) - (ageA ?? 0)
      const ni = JUNIOR_NAME_ORDER.indexOf(a.name.toLowerCase())
      const nj = JUNIOR_NAME_ORDER.indexOf(b.name.toLowerCase())
      return (ni === -1 ? 99 : ni) - (nj === -1 ? 99 : nj)
    })

  const isAdmin = profile?.role === 'admin'

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={isAdmin}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Teams</h1>

        <div className="space-y-3">
          {teams.map(team => (
            <div key={team.id} className="relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition group">
              {/* Whole-card link */}
              <Link href={`/teams/${team.id}`} className="block px-5 py-4 pr-14">
                <div className="flex items-start gap-4">
                  {/* Kit circles — desktop only (left side), stacked vertically */}
                  <div className="hidden sm:flex flex-col gap-1 flex-shrink-0 mt-0.5">
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden"
                      style={{ border: '2px solid rgba(0,0,0,0.1)' }}
                      title={[team.kit_jersey, team.kit_shorts].filter(Boolean).join(' · ')}
                    >
                      <div style={{ height: '50%', background: kitColour(team.kit_jersey ?? null) }} />
                      <div style={{ height: '50%', background: kitColour(team.kit_shorts ?? null) }} />
                    </div>
                    {(team as any).away_kit_jersey ? (
                      <div
                        className="w-11 h-11 rounded-full overflow-hidden"
                        style={{ border: '2px solid rgba(0,0,0,0.1)' }}
                        title={[(team as any).away_kit_jersey, (team as any).away_kit_shorts].filter(Boolean).join(' · ')}
                      >
                        <div style={{ height: '50%', background: kitColour((team as any).away_kit_jersey ?? null) }} />
                        <div style={{ height: '50%', background: kitColour((team as any).away_kit_shorts ?? null) }} />
                      </div>
                    ) : (
                      <div className="w-11 h-11" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition">
                        {team.displayName}
                      </p>
                      {/* Kit circles — mobile only (inline after name) */}
                      <div className="sm:hidden flex gap-1 flex-shrink-0">
                        <div
                          className="w-5 h-5 rounded-full overflow-hidden"
                          style={{ border: '1.5px solid rgba(0,0,0,0.1)' }}
                          title={[team.kit_jersey, team.kit_shorts].filter(Boolean).join(' · ')}
                        >
                          <div style={{ height: '50%', background: kitColour(team.kit_jersey ?? null) }} />
                          <div style={{ height: '50%', background: kitColour(team.kit_shorts ?? null) }} />
                        </div>
                        {(team as any).away_kit_jersey && (
                          <div
                            className="w-5 h-5 rounded-full overflow-hidden"
                            style={{ border: '1.5px solid rgba(0,0,0,0.1)' }}
                            title={[(team as any).away_kit_jersey, (team as any).away_kit_shorts].filter(Boolean).join(' · ')}
                          >
                            <div style={{ height: '50%', background: kitColour((team as any).away_kit_jersey ?? null) }} />
                            <div style={{ height: '50%', background: kitColour((team as any).away_kit_shorts ?? null) }} />
                          </div>
                        )}
                      </div>
                      {team.type === 'junior' && (team as any).format && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {(team as any).format}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 space-y-1">

                      {/* Staff roles */}
                      {team.roleLines.map((r: { label: string; value: string }, i: number) => (
                        <div key={i} className="flex items-baseline gap-2">
                          <span className="w-24 flex-shrink-0 text-xs text-gray-400">{r.label}</span>
                          <span className="text-xs text-gray-700">{r.value}</span>
                        </div>
                      ))}

                      {/* League */}
                      {team.league && (
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 flex-shrink-0 text-xs text-gray-400">League</span>
                          <span className="text-xs text-gray-700">
                            {team.league.abbr_name ?? team.league.name}{team.league.division ? ` · Division ${team.league.division}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Home ground */}
                      {team.venueName && (
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 flex-shrink-0 text-xs text-gray-400">Home ground</span>
                          <span className="text-xs text-gray-700">{team.venueName}</span>
                        </div>
                      )}

                      {/* Training */}
                      {team.slots.map((slot: any, i: number) => {
                        const start = fmtTime(slot.start_time)
                        const end = fmtTime(slot.end_time)
                        const timeStr = start && end ? `${start}–${end}` : start ? `from ${start}` : null
                        const isAlt = slot.frequency === 'Alternate' || slot.frequency === 'bi-weekly'
                        const dayStr = slot.day_of_week + 's' + (isAlt ? ' (Alt)' : '')
                        const freqPart = !isAlt && slot.frequency !== 'weekly' ? slot.frequency : null
                        const mainParts = [dayStr, freqPart, timeStr].filter(Boolean)
                        const venuePart = (slot.venues as any)?.name ? `@ ${(slot.venues as any).name}` : null
                        const display = venuePart ? `${mainParts.join(' ')} ${venuePart}` : mainParts.join(' ')
                        return (
                          <div key={i} className="flex items-baseline gap-2">
                            <span className={`w-24 flex-shrink-0 text-xs ${i === 0 ? 'text-gray-400' : 'invisible'}`}>Training</span>
                            <span className="text-xs text-gray-700">{display}</span>
                          </div>
                        )
                      })}

                      {/* Sponsors */}
                      {team.sponsors.length > 0 && (
                        <div className="flex items-baseline gap-2">
                          <span className="w-24 flex-shrink-0 text-xs text-gray-400">
                            {team.sponsors.length > 1 ? 'Sponsors' : 'Sponsor'}
                          </span>
                          <span className="text-xs text-gray-700">{team.sponsors.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>

              {/* Edit button (admin only) */}
              {isAdmin && (
                <Link
                  href={`/admin/teams/${team.id}/edit?from=/teams`}
                  className="absolute top-3.5 right-4 p-1.5 rounded-lg text-gray-300 hover:text-red-800 hover:bg-red-50 transition"
                  title="Edit team"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              )}
            </div>
          ))}

          {teams.length === 0 && (
            <p className="text-sm text-gray-400">No teams added yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
