import { redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { teamDisplayName, type Season } from '@/lib/teamUtils'
import CopyLinkButton from './CopyLinkButton'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const todayStr = new Date().toISOString().split('T')[0]

  // Derive the site origin from the request headers
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  const proto = headersList.get('x-forwarded-proto') ?? 'https'
  const origin = `${proto}://${host}`

  const [{ data: rows }, { data: seasons }, { data: teamManagers }] = await Promise.all([
    supabase
      .from('fixture_reviews')
      .select(`
        id, ref_token, manager_token, ref_submitted_at, manager_submitted_at,
        fixtures!inner(
          id, date, team_id, referee_id, volunteer_referee_id,
          teams(id, name, type, founding_age_group, founding_season_id, age_group, nickname),
          profiles:referee_id(full_name),
          volunteers:volunteer_referee_id(first_name, last_name)
        )
      `)
      .or('ref_submitted_at.is.null,manager_submitted_at.is.null')
      .lt('fixtures.date', todayStr)
      .order('fixtures(date)', { ascending: false }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
    supabase
      .from('volunteer_roles')
      .select('team_id, volunteers(first_name, last_name)')
      .eq('role_type', 'team')
      .ilike('role_name', '%manager%'),
  ])

  // Build a map of team_id -> manager name
  const managerByTeam = new Map<string, string>()
  for (const r of teamManagers ?? []) {
    if (r.team_id && (r as any).volunteers) {
      const v = (r as any).volunteers
      managerByTeam.set(r.team_id, `${v.first_name} ${v.last_name}`.trim())
    }
  }

  type PendingItem = {
    key: string
    type: 'referee' | 'manager'
    label: string
    date: string
    teamId: string
    fixtureId: string
    reviewUrl: string
  }

  const pending: PendingItem[] = []

  for (const r of rows ?? []) {
    const fixture = (r as any).fixtures
    if (!fixture) continue
    const date: string = fixture.date
    const teamId: string = fixture.team_id
    const fixtureId: string = fixture.id
    const team = fixture.teams as any
    const refProfile = fixture.profiles as any
    const refVol = fixture.volunteers as any
    const teamName = team ? teamDisplayName(team, seasons as Season[]) : 'Unknown team'
    const refName = refVol
      ? `${refVol.first_name} ${refVol.last_name}`.trim()
      : refProfile?.full_name ?? null

    if (!r.ref_submitted_at && refName) {
      pending.push({
        key: `${r.id}-ref`,
        type: 'referee',
        label: `${refName}|||${teamName}`,
        date,
        teamId,
        fixtureId,
        reviewUrl: `${origin}/review/ref/${r.ref_token}`,
      })
    }
    if (!r.manager_submitted_at) {
      const managerName = managerByTeam.get(teamId)
      const managerLabel = managerName ? `${managerName}|||${teamName}` : teamName
      pending.push({
        key: `${r.id}-mgr`,
        type: 'manager',
        label: managerLabel,
        date,
        teamId,
        fixtureId,
        reviewUrl: `${origin}/review/manager/${r.manager_token}`,
      })
    }
  }

  pending.sort((a, b) => b.date.localeCompare(a.date))

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition">← Admin</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Pending Reviews</h1>
          <p className="text-sm text-gray-400">Feedback links that have not yet been submitted.</p>
        </div>

        {pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-400">No pending reviews - all feedback has been submitted.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {pending.map(item => (
              <div key={item.key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${
                      item.type === 'referee'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.type === 'referee' ? 'Referee Feedback' : 'Manager Feedback'}
                    </span>
                    <p className="text-sm text-gray-900 truncate">
                      <span className="font-semibold">{item.label.split('|||')[0]}</span>
                      {item.label.includes('|||') && (
                        <span className="font-normal text-gray-500"> ({item.label.split('|||')[1]})</span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.date)}</p>
                </div>
                <CopyLinkButton url={item.reviewUrl} />
                <Link
                  href={`/teams/${item.teamId}/fixtures/${item.fixtureId}/edit`}
                  className="text-xs text-red-800 hover:underline flex-shrink-0"
                >
                  View fixture
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
