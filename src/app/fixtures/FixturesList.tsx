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
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
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

export default function FixturesList({ fixtures, canConfirm }: { fixtures: Fixture[]; canConfirm: boolean }) {
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [venueFilter, setVenueFilter] = useState<VenueFilter>('all')

  const filtered = fixtures.filter(f => {
    if (teamFilter !== 'all' && f.teamType !== teamFilter) return false
    // neutral counts as away
    const isHome = f.venue === 'home'
    if (venueFilter === 'home' && !isHome) return false
    if (venueFilter === 'away' && isHome) return false
    return true
  })

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-5">
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
        <div className="space-y-2">
          {filtered.map(f => {
            const needsTime = !f.kickoff_time
            const needsPitch = f.venue === 'home' && !f.pitch_id

            return (
              <div
                key={f.id}
                className={`bg-white rounded-xl border shadow-sm flex items-center justify-between gap-4 ${
                  f.confirmed ? 'border-green-200' : 'border-red-200'
                }`}
              >
                <Link
                  href={`/teams/${f.team_id}/fixtures/${f.id}/edit?from=/fixtures`}
                  className="flex items-center gap-4 min-w-0 flex-1 px-5 py-4 hover:bg-gray-50 rounded-l-xl transition"
                >
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${f.confirmed ? 'bg-green-500' : 'bg-red-500'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">{f.teamName}</p>
                    <p className="text-sm font-semibold text-gray-900 truncate">vs {f.opponentName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(f.date)} · {formatTime(f.kickoff_time)} ·{' '}
                      {f.venue === 'home' ? 'Home' : f.venue === 'away' ? 'Away' : 'Neutral'}
                      {f.venueName ? ` · ${f.venueName}` : ''}
                      {f.pitchName ? ` · ${f.pitchName}` : ''}
                    </p>
                    {needsTime && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">Kick off time TBC — cannot confirm</p>
                    )}
                    {!needsTime && needsPitch && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">No pitch assigned — cannot confirm</p>
                    )}
                  </div>
                </Link>

                {canConfirm && (
                  <div className="flex-shrink-0 pr-5">
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
      )}
    </div>
  )
}
