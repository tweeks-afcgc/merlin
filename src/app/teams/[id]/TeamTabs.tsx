'use client'

import { useState } from 'react'
import Link from 'next/link'
import { quickAddPlayer } from './players/actions'

type Tab = 'fixtures' | 'stats' | 'players'
type Stats = { p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number }
type Fixture = {
  id: string
  date: string
  kickoff_time: string | null
  venue: string
  referee_required: boolean
  goals_for: number | null
  goals_against: number | null
  club_teams: any
  venues: any
  pitches: any
}
type Player = { id: string; first_name: string; last_name: string }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

export default function TeamTabs({
  teamId,
  isAdmin,
  currentSeasonId,
  nextFixture,
  recentFixtures,
  refereeName,
  allStats,
  leagueStats,
  selectedSeasonName,
  players: initialPlayers,
  currentSeasonName,
}: {
  teamId: string
  isAdmin: boolean
  currentSeasonId: string | null
  nextFixture: Fixture | null
  recentFixtures: Fixture[]
  refereeName: string | null
  allStats: Stats
  leagueStats: Stats
  selectedSeasonName: string | null
  players: Player[]
  currentSeasonName: string | null
}) {
  const [tab, setTab] = useState<Tab>('fixtures')
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'fixtures', label: 'Fixtures' },
    { key: 'stats', label: 'Season Stats' },
    { key: 'players', label: 'Players' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-3 text-sm font-medium transition border-b-2 ${
              tab === t.key
                ? 'border-red-800 text-red-800'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Fixtures tab */}
      {tab === 'fixtures' && (
        <div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {selectedSeasonName ?? ''}
            </span>
            <Link href={`/teams/${teamId}/fixtures`} className="text-xs font-semibold text-red-800 hover:underline">
              All fixtures →
            </Link>
          </div>

          {nextFixture === null && recentFixtures.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No fixtures recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {nextFixture && (() => {
                const opp = nextFixture.club_teams as any
                const oppName = opp
                  ? [opp.clubs?.name, opp.name].filter((s: any) => s && s.trim()).join(' ') || 'Unknown'
                  : 'Unknown'
                return (
                  <li>
                    <Link
                      href={`/teams/${teamId}/fixtures/${nextFixture.id}/edit`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">NEXT</span>
                          <span className="text-xs text-gray-400">{formatDate(nextFixture.date)} · {formatTime(nextFixture.kickoff_time)}</span>
                          <span className={`text-xs font-medium ${nextFixture.venue === 'home' ? 'text-green-700' : 'text-gray-400'}`}>
                            {nextFixture.venue === 'home' ? 'H' : nextFixture.venue === 'away' ? 'A' : 'N'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition truncate">{oppName}</p>
                        <p className={`text-xs mt-0.5 ${refereeName ? 'text-gray-400' : nextFixture.referee_required ? 'text-amber-600 font-medium' : 'text-gray-300'}`}>
                          {refereeName
                            ? `Ref: ${refereeName}`
                            : nextFixture.referee_required
                              ? 'No referee assigned'
                              : 'No referee requested'}
                        </p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-red-800 flex-shrink-0 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Link>
                  </li>
                )
              })()}

              {recentFixtures.map((fx: any) => {
                const opp = fx.club_teams as any
                const oppName = opp
                  ? [opp.clubs?.name, opp.name].filter((s: any) => s && s.trim()).join(' ') || 'Unknown'
                  : 'Unknown'
                const hasResult = fx.goals_for !== null && fx.goals_against !== null
                const won = hasResult && fx.goals_for > fx.goals_against
                const drew = hasResult && fx.goals_for === fx.goals_against
                return (
                  <li key={fx.id}>
                    <Link
                      href={`/teams/${teamId}/fixtures/${fx.id}/edit`}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-gray-400">{formatDate(fx.date)}</span>
                          <span className={`text-xs font-medium ${fx.venue === 'home' ? 'text-green-700' : 'text-gray-400'}`}>
                            {fx.venue === 'home' ? 'H' : fx.venue === 'away' ? 'A' : 'N'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 group-hover:text-red-800 transition truncate">{oppName}</p>
                      </div>
                      {hasResult ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-900">{fx.goals_for}–{fx.goals_against}</span>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                            won ? 'bg-green-100 text-green-700' : drew ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'
                          }`}>
                            {won ? 'W' : drew ? 'D' : 'L'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 flex-shrink-0">No result</span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Season Stats tab */}
      {tab === 'stats' && (
        <div className="px-5 py-4">
          {allStats.p === 0 ? (
            <p className="text-sm text-gray-400">No results recorded for this season.</p>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2 border-b border-gray-100">
                <span />
                {['P','W','D','L','GF','GA','GD'].map(h => (
                  <span key={h} className="text-xs font-medium text-gray-400 uppercase tracking-wide text-center">{h}</span>
                ))}
              </div>
              <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2.5 border-b border-gray-50">
                <span className="text-sm text-gray-700 font-medium">All</span>
                {[allStats.p, allStats.w, allStats.d, allStats.l, allStats.gf, allStats.ga].map((v, i) => (
                  <span key={i} className="text-sm text-gray-900 text-center">{v}</span>
                ))}
                <span className={`text-sm font-semibold text-center ${allStats.gd > 0 ? 'text-green-700' : allStats.gd < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {allStats.gd > 0 ? `+${allStats.gd}` : allStats.gd}
                </span>
              </div>
              <div className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2.5">
                <span className="text-sm text-gray-500">League</span>
                {[leagueStats.p, leagueStats.w, leagueStats.d, leagueStats.l, leagueStats.gf, leagueStats.ga].map((v, i) => (
                  <span key={i} className="text-sm text-gray-700 text-center">{v}</span>
                ))}
                <span className={`text-sm font-medium text-center ${leagueStats.gd > 0 ? 'text-green-700' : leagueStats.gd < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {leagueStats.p > 0 ? (leagueStats.gd > 0 ? `+${leagueStats.gd}` : leagueStats.gd) : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Players tab */}
      {tab === 'players' && (
        <div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {currentSeasonName ?? ''}
            </span>
            <div className="flex items-center gap-3">
              {isAdmin && currentSeasonId && !showAddPlayer && (
                <button
                  onClick={() => { setShowAddPlayer(true); setAddError(null) }}
                  className="text-xs font-semibold text-red-800 hover:underline flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                  </svg>
                  Add player
                </button>
              )}
            </div>
          </div>

          {/* Add player form */}
          {showAddPlayer && currentSeasonId && (
            <form
              onSubmit={async e => {
                e.preventDefault()
                setAddSaving(true)
                setAddError(null)
                const fd = new FormData(e.currentTarget)
                const result = await quickAddPlayer(teamId, currentSeasonId, fd)
                setAddSaving(false)
                if (result?.error) { setAddError(result.error); return }
                // Optimistically add to list and close form
                const first = (fd.get('first_name') as string).trim()
                const last = (fd.get('last_name') as string).trim()
                setPlayers(prev => [...prev, { id: crypto.randomUUID(), first_name: first, last_name: last }]
                  .sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)))
                setShowAddPlayer(false)
                ;(e.target as HTMLFormElement).reset()
              }}
              className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3"
            >
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">First name</label>
                  <input
                    name="first_name" required autoFocus
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Last name</label>
                  <input
                    name="last_name" required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Date of birth <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  name="date_of_birth" type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit" disabled={addSaving}
                  className="bg-red-800 hover:bg-red-900 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60"
                >
                  {addSaving ? 'Adding…' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddPlayer(false); setAddError(null) }}
                  className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {players.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No players registered for this season.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {players.map(p => (
                <li key={p.id} className="px-5 py-2.5">
                  <span className="text-sm text-gray-900">{p.first_name} {p.last_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
