import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/AppShell'
import { computeAgeGroup, teamDisplayName, type Season } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-100 text-red-700',
  monitoring: 'bg-amber-100 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default async function InjuryLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: logs }, { data: seasons }] = await Promise.all([
    supabase
      .from('injury_logs')
      .select('id, created_at, incident_date, injured_name, reporter_name, status, suspected_concussion, ambulance_called, teams:reporter_team_id(id, name, type, founding_age_group, founding_season_id, age_group, nickname)')
      .order('incident_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  return (
    <AppShell userName={profile?.full_name ?? null} isAdmin>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 transition">← Admin</Link>
            <h1 className="text-xl font-bold text-gray-900 mt-2">Injury Log</h1>
            <p className="text-sm text-gray-400">All submitted injury and incident reports.</p>
          </div>
          <a
            href="/injury-report"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-red-800 hover:underline font-medium flex items-center gap-1"
          >
            Public form ↗
          </a>
        </div>

        {(!logs || logs.length === 0) ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-sm text-gray-400">No injury reports submitted yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {logs.map(log => {
              const team = (log as any).teams
              const teamLabel = team ? teamDisplayName(team, (seasons ?? []) as Season[]) : null
              const flags = []
              if (log.suspected_concussion) flags.push('Concussion')
              if (log.ambulance_called) flags.push('Ambulance')
              return (
                <Link
                  key={log.id}
                  href={`/admin/injury-log/${log.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${STATUS_STYLES[log.status] ?? STATUS_STYLES.open}`}>
                        {log.status}
                      </span>
                      {flags.map(f => (
                        <span key={f} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                          ⚠ {f}
                        </span>
                      ))}
                      <span className="text-sm font-semibold text-gray-900 truncate">{log.injured_name}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(log.incident_date)}
                      {teamLabel ? ` · ${teamLabel}` : ''}
                      {` · Reported by ${log.reporter_name}`}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
