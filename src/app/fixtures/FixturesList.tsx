'use client'

import { useState } from 'react'
import Link from 'next/link'
import ConfirmToggle from './ConfirmToggle'

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
  opponentName: string
  venueName: string | null
  pitchName: string | null
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

type TeamFilter = 'all' | 'senior' | 'junior'
type VenueFilter = 'all' | 'home' | 'away'

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
        active ? 'bg-red-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {children}
    </button>
  )
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

// Sort order for venue groups: Pitch TBC first (urgent), then named home venues (alpha), then Away Games
function venueGroupSort(a: string, b: string): number {
  const order = (s: string) => s === 'Pitch TBC' ? 0 : s === 'Away Games' ? 2 : 1
  const oa = order(a), ob = order(b)
  if (oa !== ob) return oa - ob
  return a.localeCompare(b)
}

export default function FixturesList({ fixtures, canConfirm }: { fixtures: Fixture[]; canConfirm: boolean }) {
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all')

  const filtered = fixtures.filter(f => {
    if (teamFilter !== 'all' && f.teamType !== teamFilter) return false
    const isHome = f.venue === 'home'
    if (venueFilter === 'home' && !isHome) return false
    if (venueFilter === 'away' && isHome) return false
    return true
  })

  // Group by date → venue group → pitch group, sorted by time within pitch
  const byDate = new Map<string, Fixture[]>()
  for (const f of filtered) {
    const existing = byDate.get(f.date) ?? []
    existing.push(f)
    byDate.set(f.date, existing)
  }

  // Dates already sorted ascending from server
  const dates = [...byDate.keys()]

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No fixtures match the selected filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {dates.map(date => {
            const dateFixtures = byDate.get(date)!

            // Group by venue
            const byVenue = new Map<string, Fixture[]>()
            for (const f of dateFixtures) {
              const key = venueGroupKey(f)
              const existing = byVenue.get(key) ?? []
              existing.push(f)
              byVenue.set(key, existing)
            }
            const venueKeys = [...byVenue.keys()].sort(venueGroupSort)

            return (
              <div key={date}>
                {/* Date heading */}
                <h2 className="text-base font-bold text-gray-900 mb-3 pb-2 border-b-2 border-red-800">
                  {formatDate(date)}
                </h2>

                <div className="space-y-4">
                  {venueKeys.map(venueKey => {
                    const venueFixtures = byVenue.get(venueKey)!
                    const isHome = venueKey !== 'Away Games' && venueKey !== 'Pitch TBC'

                    // For home venues, group by pitch; for away/tbc, one flat group
                    const byPitch = new Map<string, Fixture[]>()
                    for (const f of venueFixtures) {
                      const key = isHome ? pitchGroupKey(f) : ''
                      const existing = byPitch.get(key) ?? []
                      existing.push(f)
                      byPitch.set(key, existing)
                    }
                    // Sort pitches: named pitches alpha, then 'Pitch TBC'
                    const pitchKeys = [...byPitch.keys()].sort((a, b) => {
                      if (a === 'Pitch TBC') return 1
                      if (b === 'Pitch TBC') return -1
                      if (a === '') return 0
                      return a.localeCompare(b)
                    })

                    return (
                      <div key={venueKey} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Venue header */}
                        <div className={`px-4 py-2.5 ${isHome ? 'bg-red-800' : 'bg-gray-600'}`}>
                          <h3 className="text-sm font-semibold text-white">{venueKey}</h3>
                        </div>

                        <div className="divide-y divide-gray-50">
                          {pitchKeys.map(pitchKey => {
                            const pitchFixtures = byPitch.get(pitchKey)!
                              .slice()
                              .sort((a, b) => {
                                if (!a.kickoff_time) return 1
                                if (!b.kickoff_time) return -1
                                return a.kickoff_time.localeCompare(b.kickoff_time)
                              })

                            return (
                              <div key={pitchKey}>
                                {/* Pitch sub-header — only shown for home venues */}
                                {isHome && (
                                  <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      {pitchKey || 'Pitch TBC'}
                                    </span>
                                  </div>
                                )}

                                {pitchFixtures.map(f => {
                                  const needsTime = !f.kickoff_time
                                  const needsPitch = f.venue === 'home' && !f.pitch_id

                                  return (
                                    <div
                                      key={f.id}
                                      className={`flex items-center justify-between gap-4 ${
                                        f.confirmed ? '' : 'border-l-4 border-red-400'
                                      }`}
                                    >
                                      <Link
                                        href={`/teams/${f.team_id}/fixtures/${f.id}/edit?from=/fixtures`}
                                        className="flex items-center gap-3 min-w-0 flex-1 px-4 py-3 hover:bg-gray-50 transition"
                                      >
                                        {/* Time */}
                                        <span className={`text-sm font-bold w-12 flex-shrink-0 ${f.confirmed ? 'text-green-700' : 'text-red-600'}`}>
                                          {formatTime(f.kickoff_time)}
                                        </span>

                                        <div className="min-w-0">
                                          <p className="text-xs text-gray-400 truncate">{f.teamName}</p>
                                          <p className="text-sm font-semibold text-gray-900 truncate">
                                            vs {f.opponentName}
                                          </p>
                                          {needsTime && (
                                            <p className="text-xs text-amber-600 font-medium">Kick off time TBC — cannot confirm</p>
                                          )}
                                          {!needsTime && needsPitch && (
                                            <p className="text-xs text-amber-600 font-medium">No pitch assigned — cannot confirm</p>
                                          )}
                                        </div>
                                      </Link>

                                      {canConfirm && (
                                        <div className="flex-shrink-0 pr-4">
                                          <ConfirmToggle
                                            fixtureId={f.id}
                                            confirmed={f.confirmed}
                                            disabled={!f.confirmed && (needsTime || needsPitch)}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
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
    </div>
  )
}
