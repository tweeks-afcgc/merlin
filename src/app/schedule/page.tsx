import { createAdminClient } from '@/lib/supabase/admin'
import { teamDisplayName, computeAgeGroup } from '@/lib/teamUtils'

export const dynamic = 'force-dynamic'

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

function venueGroupKey(f: any): string {
  if (f.venue !== 'home') return 'Away Games'
  if (!f.venueName) return 'Pitch TBC'
  return f.venueName
}

function pitchGroupKey(f: any): string {
  if (f.venue !== 'home') return ''
  return f.pitchName ?? 'Pitch TBC'
}

function venueGroupSort(a: string, b: string): number {
  const order = (s: string) => s === 'Pitch TBC' ? 0 : s === 'Away Games' ? 2 : 1
  const oa = order(a), ob = order(b)
  if (oa !== ob) return oa - ob
  return a.localeCompare(b)
}

function timeSort(a: any, b: any) {
  if (!a.kickoff_time) return 1
  if (!b.kickoff_time) return -1
  return a.kickoff_time.localeCompare(b.kickoff_time)
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function PublicSchedulePage() {
  const supabase = createAdminClient()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const cutoffDate = new Date(today)
  cutoffDate.setDate(today.getDate() + 14)
  const cutoffStr = cutoffDate.toISOString().split('T')[0]

  const [{ data: rawFixtures }, { data: seasons }] = await Promise.all([
    supabase
      .from('fixtures')
      .select(`
        id, date, kickoff_time, venue, confirmed, pitch_id,
        team_id,
        teams(id, name, type, founding_age_group, founding_season_id, age_group, kit_jersey, kit_shorts),
        club_teams(id, name, clubs(name)),
        venues(name),
        pitches(name)
      `)
      .gte('date', todayStr)
      .lte('date', cutoffStr)
      .order('date', { ascending: true })
      .order('kickoff_time', { ascending: true }),
    supabase.from('seasons').select('id, name, start_date, is_current'),
  ])

  const fixtures = (rawFixtures ?? []).map(f => {
    const team = f.teams as any
    const opponent = f.club_teams as any
    const venueData = f.venues as any
    const pitchData = f.pitches as any

    return {
      id: f.id,
      date: f.date,
      kickoff_time: f.kickoff_time,
      venue: f.venue,
      confirmed: f.confirmed,
      pitch_id: f.pitch_id,
      team_id: f.team_id,
      teamName: team ? teamDisplayName(team, seasons ?? []) : '—',
      opponentName: (() => {
        if (!opponent) return 'TBC'
        const raw = [opponent.clubs?.name, opponent.name].filter((s: any) => s && s.trim()).join(' ') || 'TBC'
        return raw.replace(/^\[Internal\]\s*/, '')
      })(),
      venueName: venueData?.name ?? null,
      pitchName: pitchData?.name ?? null,
    }
  })

  // Group by date → venue → pitch
  const byDate = new Map<string, any[]>()
  for (const f of fixtures) {
    const arr = byDate.get(f.date) ?? []; arr.push(f); byDate.set(f.date, arr)
  }
  const dates = [...byDate.keys()]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-800 px-4 py-5 shadow">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">AFC Green Court</h1>
            <p className="text-sm text-red-200">Fixtures — next 14 days</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {fixtures.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm">No fixtures in the next 14 days.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map(date => {
              const dateFixtures = byDate.get(date)!
              const byVenue = new Map<string, any[]>()
              for (const f of dateFixtures) {
                const key = venueGroupKey(f); const arr = byVenue.get(key) ?? []; arr.push(f); byVenue.set(key, arr)
              }
              const venueKeys = [...byVenue.keys()].sort(venueGroupSort)

              return (
                <div key={date}>
                  <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b-2 border-red-800">
                    {formatDateLong(date)}
                  </h2>
                  <div className="space-y-4">
                    {venueKeys.map(venueKey => {
                      const isHome = venueKey !== 'Away Games' && venueKey !== 'Pitch TBC'
                      const byPitch = new Map<string, any[]>()
                      for (const f of byVenue.get(venueKey)!) {
                        const key = isHome ? pitchGroupKey(f) : ''; const arr = byPitch.get(key) ?? []; arr.push(f); byPitch.set(key, arr)
                      }
                      const pitchKeys = [...byPitch.keys()].sort((a, b) => {
                        if (a === 'Pitch TBC') return 1; if (b === 'Pitch TBC') return -1; if (a === '') return 0; return a.localeCompare(b)
                      })

                      return (
                        <div key={venueKey} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                          <div className={`px-4 py-2.5 ${isHome ? 'bg-red-800' : 'bg-gray-600'}`}>
                            <h3 className="text-sm font-semibold text-white">{venueKey}</h3>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {pitchKeys.map(pitchKey => {
                              const pitchFixtures = byPitch.get(pitchKey)!.slice().sort(timeSort)
                              return (
                                <div key={pitchKey}>
                                  {isHome && (
                                    <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        {pitchKey || 'Pitch TBC'}
                                      </span>
                                    </div>
                                  )}
                                  {pitchFixtures.map(f => (
                                    <div key={f.id} className="flex items-center gap-2 px-3 py-3">
                                      <span className={`text-sm font-bold w-10 flex-shrink-0 ${f.confirmed ? 'text-green-700' : 'text-gray-400'}`}>
                                        {formatTime(f.kickoff_time)}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 leading-snug truncate">
                                          {f.teamName}
                                        </p>
                                        <p className="text-xs text-gray-500 leading-snug truncate">
                                          vs {f.opponentName}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-300 mt-10">
          AFC Green Court · Merlin
        </p>
      </div>
    </div>
  )
}
