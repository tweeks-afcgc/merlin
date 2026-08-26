'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import ConfirmToggle from './ConfirmToggle'
import EmailModal from './EmailModal'

type Fixture = {
  id: string
  date: string
  kickoff_time: string | null
  venue: string
  confirmed: boolean
  pitch_id: string | null
  team_id: string
  teamName: string
  teamType: string
  teamSortKey: string
  ageGroupLabel: string
  teamShortName: string
  opponentName: string
  venueName: string | null
  venueAddress: string | null
  pitchName: string | null
  pitchType: string | null
  kitJersey: string | null
  kitShorts: string | null
  kitSocks: string | null
  managerName: string | null
  refereeRequired: boolean
  refereeName: string | null
  hasRefereeRequest: boolean
}

type ViewMode = 'schedule' | 'team' | 'pitch'
type TeamFilter = 'all' | 'senior' | 'junior'
type VenueFilter = 'all' | 'home' | 'away'
type DateRange = 14 | 30 | 'all'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

function venueGroupKey(f: Fixture): string {
  if (f.venue !== 'home') return 'Away Games'
  if (!f.venueName) return 'Pitch TBC'
  return f.venueName
}

function pitchGroupKey(f: Fixture): string {
  if (f.venue !== 'home') return ''
  return f.pitchName ?? 'Pitch TBC'
}

function venueGroupSort(a: string, b: string): number {
  const order = (s: string) => s === 'Pitch TBC' ? 0 : s === 'Away Games' ? 2 : 1
  const oa = order(a), ob = order(b)
  if (oa !== ob) return oa - ob
  return a.localeCompare(b)
}

function timeSort(a: Fixture, b: Fixture) {
  if (!a.kickoff_time) return 1
  if (!b.kickoff_time) return -1
  return a.kickoff_time.localeCompare(b.kickoff_time)
}

// ─── sub-components ─────────────────────────────────────────────────────────

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${active ? 'bg-red-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}

function FixtureRow({ f, canConfirm, showTeam = true }: { f: Fixture; canConfirm: boolean; showTeam?: boolean }) {
  const needsTime = !f.kickoff_time
  const needsPitch = f.venue === 'home' && !f.pitch_id
  const needsRef = f.refereeRequired && !f.refereeName
  const hasWarning = needsTime || (!needsTime && needsPitch)

  return (
    <div className={`flex items-center justify-between gap-2 ${f.confirmed ? '' : 'border-l-4 border-red-400'}`}>
      <Link href={`/teams/${f.team_id}/fixtures/${f.id}/edit?from=/fixtures`} className="flex items-center gap-2 min-w-0 flex-1 px-3 py-3 hover:bg-gray-50 transition">
        <span className={`text-sm font-bold w-10 flex-shrink-0 ${f.confirmed ? 'text-green-700' : 'text-red-600'}`}>
          {formatTime(f.kickoff_time)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug truncate">
            {showTeam ? f.teamName : f.opponentName}
          </p>
          {showTeam && (
            <p className="text-xs text-gray-500 leading-snug truncate">vs {f.opponentName}</p>
          )}
          {/* Warnings — desktop always shown, mobile only for blocking issues */}
          {hasWarning && (
            <p className="text-xs text-amber-600 font-medium leading-snug">
              {needsTime ? 'Kick off TBC' : 'No pitch assigned'}
            </p>
          )}
          {/* Referee — desktop shows all states, mobile only shows missing when required */}
          {f.refereeName ? (
            <p className="hidden sm:block text-xs text-gray-400 leading-snug">Ref: {f.refereeName}</p>
          ) : f.hasRefereeRequest ? (
            <p className="hidden sm:block text-xs text-blue-600 font-medium leading-snug">Referee request made</p>
          ) : f.refereeRequired ? (
            <p className="text-xs text-amber-600 font-medium leading-snug">No referee</p>
          ) : (
            <p className="hidden sm:block text-xs text-amber-600 font-medium leading-snug">No referee requested</p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-1.5 flex-shrink-0 pr-3">
        {f.confirmed && f.venue === 'home' && (
          <EmailModal fixture={f} />
        )}
        {canConfirm && (
          <ConfirmToggle fixtureId={f.id} confirmed={f.confirmed} disabled={!f.confirmed && (needsTime || needsPitch)} />
        )}
      </div>
    </div>
  )
}

function DateSelect({ dates, value, onChange }: { dates: string[]; value: string; onChange: (d: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 bg-white"
    >
      {dates.map(d => <option key={d} value={d}>{formatDateShort(d)}</option>)}
    </select>
  )
}

// ─── Schedule view ───────────────────────────────────────────────────────────

function ScheduleView({ fixtures, canConfirm }: { fixtures: Fixture[]; canConfirm: boolean }) {
  const byDate = new Map<string, Fixture[]>()
  for (const f of fixtures) {
    const arr = byDate.get(f.date) ?? []; arr.push(f); byDate.set(f.date, arr)
  }
  const dates = [...byDate.keys()]

  return (
    <div className="space-y-8">
      {dates.map(date => {
        const dateFixtures = byDate.get(date)!
        const byVenue = new Map<string, Fixture[]>()
        for (const f of dateFixtures) {
          const key = venueGroupKey(f); const arr = byVenue.get(key) ?? []; arr.push(f); byVenue.set(key, arr)
        }
        const venueKeys = [...byVenue.keys()].sort(venueGroupSort)

        return (
          <div key={date}>
            <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b-2 border-red-800">{formatDateLong(date)}</h2>
            <div className="space-y-4">
              {venueKeys.map(venueKey => {
                const isHome = venueKey !== 'Away Games' && venueKey !== 'Pitch TBC'
                const byPitch = new Map<string, Fixture[]>()
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
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{pitchKey || 'Pitch TBC'}</span>
                              </div>
                            )}
                            {pitchFixtures.map(f => <FixtureRow key={f.id} f={f} canConfirm={canConfirm} />)}
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
  )
}

// ─── Team view ───────────────────────────────────────────────────────────────

function TeamView({ fixtures, canConfirm, dates }: { fixtures: Fixture[]; canConfirm: boolean; dates: string[] }) {
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? '')
  const dayFixtures = fixtures.filter(f => f.date === selectedDate).slice().sort((a, b) => a.teamSortKey.localeCompare(b.teamSortKey))

  return (
    <div>
      <div className="mb-5">
        <DateSelect dates={dates} value={selectedDate} onChange={setSelectedDate} />
      </div>
      {dayFixtures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No fixtures on this date.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {dayFixtures.map(f => {
            const needsTime = !f.kickoff_time
            const needsPitch = f.venue === 'home' && !f.pitch_id
            return (
              <div key={f.id} className={`flex items-center justify-between gap-2 ${f.confirmed ? '' : 'border-l-4 border-red-400'}`}>
                <Link href={`/teams/${f.team_id}/fixtures/${f.id}/edit?from=/fixtures`} className="flex items-center gap-2 min-w-0 flex-1 px-3 py-3 hover:bg-gray-50 transition">
                  <span className={`text-sm font-bold w-10 flex-shrink-0 ${f.confirmed ? 'text-green-700' : 'text-red-600'}`}>
                    {formatTime(f.kickoff_time)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{f.teamName}</p>
                    <p className="text-xs text-gray-500 truncate leading-snug">vs {f.opponentName}</p>
                    <p className="text-xs text-gray-400 truncate leading-snug">
                      {f.venue === 'home' ? 'H' : f.venue === 'away' ? 'A' : 'N'}
                      {f.venueName ? ` · ${f.venueName}` : ''}
                      {f.pitchName ? ` · ${f.pitchName}` : ''}
                      <span className="hidden sm:inline">
                        {f.refereeName
                          ? ` · Ref: ${f.refereeName}`
                          : f.hasRefereeRequest
                            ? ' · Ref requested'
                            : f.refereeRequired
                              ? ' · No ref'
                              : ''
                        }
                      </span>
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5 flex-shrink-0 pr-3">
                  {f.confirmed && f.venue === 'home' && <EmailModal fixture={f} />}
                  {canConfirm && (
                    <ConfirmToggle fixtureId={f.id} confirmed={f.confirmed} disabled={!f.confirmed && (needsTime || needsPitch)} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Pitch view ──────────────────────────────────────────────────────────────

function PitchView({ fixtures, canConfirm, dates }: { fixtures: Fixture[]; canConfirm: boolean; dates: string[] }) {
  const [selectedDate, setSelectedDate] = useState(dates[0] ?? '')
  const dayFixtures = fixtures.filter(f => f.date === selectedDate)

  const byVenue = new Map<string, Fixture[]>()
  for (const f of dayFixtures) {
    const key = venueGroupKey(f); const arr = byVenue.get(key) ?? []; arr.push(f); byVenue.set(key, arr)
  }
  const venueKeys = [...byVenue.keys()].sort(venueGroupSort)

  return (
    <div>
      <div className="mb-5">
        <DateSelect dates={dates} value={selectedDate} onChange={setSelectedDate} />
      </div>
      {dayFixtures.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No fixtures on this date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {venueKeys.map(venueKey => {
            const isHome = venueKey !== 'Away Games' && venueKey !== 'Pitch TBC'
            const byPitch = new Map<string, Fixture[]>()
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
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{pitchKey || 'Pitch TBC'}</span>
                          </div>
                        )}
                        {pitchFixtures.map(f => <FixtureRow key={f.id} f={f} canConfirm={canConfirm} />)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── View dropdown ───────────────────────────────────────────────────────────

function ViewDropdown({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const labels: Record<ViewMode, string> = { schedule: 'Schedule', team: 'Team', pitch: 'Pitch' }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 text-sm font-semibold px-3 py-2 rounded-lg hover:bg-gray-50 transition"
      >
        {labels[view]} view
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-10 bg-white shadow-xl rounded-xl border border-gray-100 w-44 overflow-hidden z-20">
          {(['schedule', 'team', 'pitch'] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => { onChange(v); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm transition ${view === v ? 'bg-red-50 text-red-800 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {labels[v]} view
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mobile filter panel ─────────────────────────────────────────────────────

function MobileFilters({
  dateRange, setDateRange,
  teamFilter, setTeamFilter,
  venueFilter, setVenueFilter,
}: {
  dateRange: DateRange; setDateRange: (v: DateRange) => void
  teamFilter: TeamFilter; setTeamFilter: (v: TeamFilter) => void
  venueFilter: VenueFilter; setVenueFilter: (v: VenueFilter) => void
}) {
  const [open, setOpen] = useState(false)
  const activeCount = (dateRange !== 14 ? 1 : 0) + (teamFilter !== 'all' ? 1 : 0) + (venueFilter !== 'all' ? 1 : 0)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 border text-sm font-semibold px-3 py-2 rounded-lg transition ${activeCount > 0 ? 'bg-red-800 text-white border-red-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 4h18M7 9h10M10 14h4M12 19h0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Filters{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>
      {open && (
        <div className="absolute left-0 top-11 bg-white shadow-xl rounded-xl border border-gray-100 z-20 p-4 space-y-4 w-64">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Period</p>
            <div className="flex gap-1.5 flex-wrap">
              <FilterButton active={dateRange === 14} onClick={() => setDateRange(14)}>14 days</FilterButton>
              <FilterButton active={dateRange === 30} onClick={() => setDateRange(30)}>30 days</FilterButton>
              <FilterButton active={dateRange === 'all'} onClick={() => setDateRange('all')}>All</FilterButton>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Team</p>
            <div className="flex gap-1.5 flex-wrap">
              <FilterButton active={teamFilter === 'all'} onClick={() => setTeamFilter('all')}>All</FilterButton>
              <FilterButton active={teamFilter === 'senior'} onClick={() => setTeamFilter('senior')}>Senior</FilterButton>
              <FilterButton active={teamFilter === 'junior'} onClick={() => setTeamFilter('junior')}>Junior</FilterButton>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Venue</p>
            <div className="flex gap-1.5 flex-wrap">
              <FilterButton active={venueFilter === 'all'} onClick={() => setVenueFilter('all')}>All</FilterButton>
              <FilterButton active={venueFilter === 'home'} onClick={() => setVenueFilter('home')}>Home</FilterButton>
              <FilterButton active={venueFilter === 'away'} onClick={() => setVenueFilter('away')}>Away</FilterButton>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full bg-gray-900 text-white text-sm font-semibold py-2 rounded-lg"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function FixturesList({
  fixtures,
  canConfirm,
}: {
  fixtures: Fixture[]
  canConfirm: boolean
}) {
  const [view, setView] = useState<ViewMode>('schedule')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange>(14)

  const cutoff = dateRange === 'all' ? null : (() => {
    const d = new Date()
    d.setDate(d.getDate() + dateRange)
    return d.toISOString().split('T')[0]
  })()

  const filtered = fixtures.filter(f => {
    if (cutoff && f.date > cutoff) return false
    if (teamFilter !== 'all' && f.teamType !== teamFilter) return false
    const isHome = f.venue === 'home'
    if (venueFilter === 'home' && !isHome) return false
    if (venueFilter === 'away' && isHome) return false
    return true
  })

  const fixtureDates = [...new Set(fixtures.map(f => f.date))].sort()

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {/* Desktop filters */}
        <div className="hidden sm:flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium mr-1">Period</span>
            <FilterButton active={dateRange === 14} onClick={() => setDateRange(14)}>14 days</FilterButton>
            <FilterButton active={dateRange === 30} onClick={() => setDateRange(30)}>30 days</FilterButton>
            <FilterButton active={dateRange === 'all'} onClick={() => setDateRange('all')}>All</FilterButton>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium mr-1">Team</span>
            <FilterButton active={teamFilter === 'all'} onClick={() => setTeamFilter('all')}>All</FilterButton>
            <FilterButton active={teamFilter === 'senior'} onClick={() => setTeamFilter('senior')}>Senior</FilterButton>
            <FilterButton active={teamFilter === 'junior'} onClick={() => setTeamFilter('junior')}>Junior</FilterButton>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium mr-1">Venue</span>
            <FilterButton active={venueFilter === 'all'} onClick={() => setVenueFilter('all')}>All</FilterButton>
            <FilterButton active={venueFilter === 'home'} onClick={() => setVenueFilter('home')}>Home</FilterButton>
            <FilterButton active={venueFilter === 'away'} onClick={() => setVenueFilter('away')}>Away</FilterButton>
          </div>
        </div>
        {/* Mobile filters */}
        <div className="sm:hidden">
          <MobileFilters
            dateRange={dateRange} setDateRange={setDateRange}
            teamFilter={teamFilter} setTeamFilter={setTeamFilter}
            venueFilter={venueFilter} setVenueFilter={setVenueFilter}
          />
        </div>
        <ViewDropdown view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No fixtures match the selected filters.</p>
        </div>
      ) : view === 'schedule' ? (
        <ScheduleView fixtures={filtered} canConfirm={canConfirm} />
      ) : view === 'team' ? (
        <TeamView fixtures={filtered} canConfirm={canConfirm} dates={fixtureDates} />
      ) : (
        <PitchView fixtures={filtered} canConfirm={canConfirm} dates={fixtureDates} />
      )}
    </div>
  )
}
