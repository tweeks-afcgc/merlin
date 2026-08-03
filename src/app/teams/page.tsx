import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName, computeAgeGroup } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function kitColour(s: string | null): string {
  if (!s) return '#d1d5db'
  const t = s.toLowerCase()
  if ((t.includes('red') && t.includes('black')) || (t.includes('black') && t.includes('red')))
    return 'repeating-linear-gradient(90deg,#dc2626 0px,#dc2626 6px,#111827 6px,#111827 12px)'
  if (t.includes('red') && t.includes('white'))
    return 'repeating-linear-gradient(90deg,#dc2626 0px,#dc2626 6px,#f3f4f6 6px,#f3f4f6 12px)'
  if (t.includes('blue') && t.includes('white'))
    return 'repeating-linear-gradient(90deg,#2563eb 0px,#2563eb 6px,#f3f4f6 6px,#f3f4f6 12px)'
  if (t.includes('navy')) return '#1e3a5f'
  if (t.includes('maroon') || t.includes('burgundy')) return '#881337'
  if (t.includes('sky') || t.includes('light blue')) return '#7dd3fc'
  if (t.includes('red')) return '#dc2626'
  if (t.includes('black')) return '#111827'
  if (t.includes('white') || t.includes('cream')) return '#f3f4f6'
  if (t.includes('blue')) return '#2563eb'
  if (t.includes('yellow') || t.includes('amber') || t.includes('gold')) return '#fbbf24'
  if (t.includes('green')) return '#16a34a'
  if (t.includes('orange')) return '#ea580c'
  if (t.includes('purple') || t.includes('violet')) return '#7c3aed'
  if (t.includes('pink')) return '#ec4899'
  if (t.includes('grey') || t.includes('gray') || t.includes('silver')) return '#9ca3af'
  return '#d1d5db'
}

const SENIOR_ORDER = ['first xi', 'sunday xi', 'women', 'vets xi']
const JUNIOR_NAME_ORDER = ['knights', 'dukes', 'roses']

const ROLE_ORDER = ['manager', 'coach', 'assistant coach', 'assistant']

function getAge(team: any, seasons: any[]): number | null {
  return computeAgeGroup(team, seasons)
}

function roleSort(roleName: string): number {
  const lower = roleName.toLowerCase()
  const idx = ROLE_ORDER.findIndex(r => lower.includes(r))
  return idx === -1 ? 99 : idx
}

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  const [{ data: rawTeams }, { data: seasons }, { data: roleRows }] = await Promise.all([
    supabase.from('teams').select('id, name, type, age_group, founding_age_group, founding_season_id, kit_jersey, kit_shorts, kit_socks'),
    supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
    supabase
      .from('volunteer_roles')
      .select('team_id, role_name, volunteers(first_name, last_name)')
      .eq('role_type', 'team'),
  ])

  const seasonsList = seasons ?? []

  const teams = (rawTeams ?? [])
    .map(t => ({
      ...t,
      displayName: teamDisplayName(t as any, seasonsList),
      roles: (roleRows ?? [])
        .filter((r: any) => r.team_id === t.id)
        .map((r: any) => ({
          role_name: r.role_name,
          volunteerName: r.volunteers ? `${r.volunteers.first_name} ${r.volunteers.last_name}` : null,
          sortKey: roleSort(r.role_name),
        }))
        .sort((a, b) => a.sortKey - b.sortKey || a.role_name.localeCompare(b.role_name)),
    }))
    .sort((a, b) => {
      // Seniors before juniors
      if (a.type !== b.type) return a.type === 'senior' ? -1 : 1

      if (a.type === 'senior') {
        const ai = SENIOR_ORDER.indexOf(a.name.toLowerCase())
        const bi = SENIOR_ORDER.indexOf(b.name.toLowerCase())
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        return a.name.localeCompare(b.name)
      }

      // Juniors: eldest first (highest age group number), then Knights → Dukes → Roses
      const ageA = getAge(a as any, seasonsList)
      const ageB = getAge(b as any, seasonsList)
      if (ageA !== ageB) return (ageB ?? 0) - (ageA ?? 0)
      const ni = JUNIOR_NAME_ORDER.indexOf(a.name.toLowerCase())
      const nj = JUNIOR_NAME_ORDER.indexOf(b.name.toLowerCase())
      return (ni === -1 ? 99 : ni) - (nj === -1 ? 99 : nj)
    })

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin={profile?.role === 'admin'}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Teams</h1>

        <div className="space-y-3">
          {teams.map(team => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:shadow-md hover:border-red-200 transition group"
            >
              {/* Kit circle */}
              <div
                className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: '2px solid rgba(0,0,0,0.1)' }}
                title={[team.kit_jersey, team.kit_shorts, team.kit_socks].filter(Boolean).join(' · ')}
              >
                <div style={{ height: '50%', background: kitColour(team.kit_jersey ?? null) }} />
                <div style={{ height: '25%', background: kitColour(team.kit_shorts ?? null) }} />
                <div style={{ height: '25%', background: kitColour(team.kit_socks ?? null) }} />
              </div>

              {/* Team name + staff */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition">
                  {team.displayName}
                </p>
                {team.roles.length > 0 ? (
                  <div className="mt-1 space-y-0.5">
                    {team.roles.map((r, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        <span className="text-gray-400">{r.role_name}:</span>{' '}
                        {r.volunteerName ?? '—'}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">No staff listed</p>
                )}
              </div>

              <svg className="w-4 h-4 text-gray-300 group-hover:text-red-800 flex-shrink-0 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}

          {teams.length === 0 && (
            <p className="text-sm text-gray-400">No teams added yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
