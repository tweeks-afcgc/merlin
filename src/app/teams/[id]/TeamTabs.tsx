'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { quickAddPlayer } from './players/actions'
import { fixtureOpponentName, type Season } from '@/lib/teamUtils'

type Tab = 'fixtures' | 'stats' | 'playerstats' | 'players'
type PlayerStat = {
  player_id: string
  name: string
  player_number: number | null
  played: number
  goals: number
  assists: number
  motm: number
  total_mins: number
}
type Stats = { p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number }
type Fixture = {
  id: string
  date: string
  kickoff_time: string | null
  venue: string
  confirmed: boolean
  notes: string | null
  goals_for: number | null
  goals_against: number | null
  season_id: string
  club_teams: any
  venues: any
}
type Player = { id: string; first_name: string; last_name: string; date_of_birth: string | null; player_number: number | null }

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatTime(t: string | null) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

function NotesIcon({ notes }: { notes: string | null }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  if (!notes?.trim()) return null
  return (
    <span
      ref={ref}
      className="text-gray-300 hover:text-gray-500 cursor-default select-none text-base leading-none flex-shrink-0"
      onMouseEnter={() => {
        if (!ref.current) return
        const r = ref.current.getBoundingClientRect()
        setPos({ top: r.top + window.scrollY - 8, left: r.left + r.width / 2 + window.scrollX })
      }}
      onMouseLeave={() => setPos(null)}
    >
      📋
      {pos && typeof document !== 'undefined' && createPortal(
        <div className="pointer-events-none" style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, transform: 'translate(-50%, -100%)' }}>
          <div className="w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-pre-wrap mb-2">
            {notes}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>,
        document.body
      )}
    </span>
  )
}

export default function TeamTabs({
  teamId,
  isAdmin,
  currentSeasonId,
  allFixtures,
  today,
  seasons,
  isAllTime,
  allStats,
  exclFriendliesStats,
  leagueStats,
  selectedSeasonName,
  players: initialPlayers,
  playerStats,
  currentSeasonName,
}: {
  teamId: string
  isAdmin: boolean
  currentSeasonId: string | null
  allFixtures: Fixture[]
  today: string
  seasons: Season[]
  isAllTime: boolean
  allStats: Stats
  exclFriendliesStats: Stats
  leagueStats: Stats
  selectedSeasonName: string | null
  players: Player[]
  playerStats: PlayerStat[]
  currentSeasonName: string | null
}) {
  const [tab, setTab] = useState<Tab>('stats')
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [playerSort, setPlayerSort] = useState<'number' | 'alpha' | 'age'>('number')
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [addSaving, setAddSaving] = useState(false)

  function formatDob(dob: string | null) {
    if (!dob) return null
    return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const sortedPlayers = [...players].sort((a, b) => {
    if (playerSort === 'number') {
      if (a.player_number != null && b.player_number != null) return a.player_number - b.player_number
      if (a.player_number != null) return -1
      if (b.player_number != null) return 1
      return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
    }
    if (playerSort === 'age') {
      if (!a.date_of_birth && !b.date_of_birth) return 0
      if (!a.date_of_birth) return 1
      if (!b.date_of_birth) return -1
      return a.date_of_birth.localeCompare(b.date_of_birth)
    }
    return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
  })

  const TABS: { key: Tab; label: string }[] = [
    { key: 'stats', label: 'Season Stats' },
    { key: 'fixtures', label: 'Fixtures' },
    { key: 'playerstats', label: 'Player Stats' },
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
            {!isAllTime && (
              <Link
                href={`/teams/${teamId}/fixtures/add`}
                className="flex items-center gap-1 text-xs font-semibold text-red-800 hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
                Add fixture
              </Link>
            )}
          </div>

          {allFixtures.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No fixtures recorded yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {allFixtures.map((fx: any) => {
                const oppName = fixtureOpponentName(fx.club_teams, seasons, fx.season_id)
                const isUpcoming = fx.date >= today
                const hasResult = fx.goals_for !== null && fx.goals_against !== null
                const won = hasResult && fx.goals_for > fx.goals_against
                const drew = hasResult && fx.goals_for === fx.goals_against
                return (
                  <li key={fx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {isUpcoming && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">NEXT</span>
                        )}
                        <span className="text-xs text-gray-400">{formatDate(fx.date)} · {formatTime(fx.kickoff_time)}</span>
                        <span className={`text-xs font-medium ${fx.venue === 'home' ? 'text-green-700' : 'text-gray-400'}`}>
                          {fx.venue === 'home' ? 'H' : fx.venue === 'away' ? 'A' : 'N'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 truncate">{oppName}</p>
                    </div>
                    {hasResult ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-900">{fx.goals_for}–{fx.goals_against}</span>
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          won ? 'bg-green-500 text-white' : drew ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {won ? 'W' : drew ? 'D' : 'L'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300 flex-shrink-0">—</span>
                    )}
                    <NotesIcon notes={fx.notes ?? null} />
                    <Link
                      href={`/teams/${teamId}/fixtures/${fx.id}/edit`}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-800 hover:bg-red-50 transition flex-shrink-0"
                      title="Edit fixture"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
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
              {([
                { label: 'All (inc friendlies)', s: allStats, bold: true },
                { label: 'All (exc friendlies)', s: exclFriendliesStats, bold: false },
                { label: 'League', s: leagueStats, bold: false },
              ] as const).map(({ label, s, bold }) => (
                <div key={label} className="grid grid-cols-[1fr_repeat(7,_minmax(0,_2.5rem))] gap-x-2 py-2.5 border-b border-gray-50 last:border-b-0">
                  <span className={`text-sm ${bold ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>{label}</span>
                  {[s.p, s.w, s.d, s.l, s.gf, s.ga].map((v, i) => (
                    <span key={i} className={`text-sm text-center ${bold ? 'text-gray-900' : 'text-gray-700'}`}>{v}</span>
                  ))}
                  <span className={`text-sm font-medium text-center ${s.gd > 0 ? 'text-green-700' : s.gd < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {s.p > 0 ? (s.gd > 0 ? `+${s.gd}` : s.gd) : '—'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Player Stats tab */}
      {tab === 'playerstats' && (() => {
        const scorers = [...playerStats].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
        const assisters = [...playerStats].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists || a.name.localeCompare(b.name))
        const avgMinsRows = [...playerStats].filter(p => p.played > 0).map(p => ({ ...p, avgMins: Math.round(p.total_mins / p.played) })).filter(p => p.avgMins > 0).sort((a, b) => b.avgMins - a.avgMins || a.name.localeCompare(b.name))
        const allRows = [...playerStats].sort((a, b) => {
          if (a.player_number != null && b.player_number != null) return a.player_number - b.player_number
          if (a.player_number != null) return -1
          if (b.player_number != null) return 1
          return a.name.localeCompare(b.name)
        })
        const hasAnyData = playerStats.some(p => p.played > 0 || p.goals > 0 || p.assists > 0)
        if (!hasAnyData) return (
          <p className="px-5 py-4 text-sm text-gray-400">No player stats recorded for this season yet.</p>
        )

        function BarRow({ rank, playerNumber, name, value, max, barColour, label }: {
          rank: number; playerNumber: number | null; name: string; value: number; max: number; barColour: string; label: string
        }) {
          const pct = max > 0 ? Math.round((value / max) * 100) : 0
          return (
            <li className="px-5 py-2.5">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-4 text-xs font-bold text-gray-300 flex-shrink-0 text-right">{rank}</span>
                <span className="w-6 text-right text-xs font-semibold text-gray-400 flex-shrink-0">
                  {playerNumber != null ? `#${playerNumber}` : ''}
                </span>
                <span className="text-sm font-medium text-gray-800 flex-1 truncate">{name}</span>
                <span className={`text-sm font-bold flex-shrink-0 ${label}`}>{value}</span>
              </div>
              <div className="ml-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColour}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        }

        return (
          <div className="divide-y divide-gray-100">
            {/* Top Scorers */}
            {scorers.length > 0 && (
              <div>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Scorers</h3>
                </div>
                <ul className="divide-y divide-gray-50 py-1">
                  {scorers.map((p, i) => (
                    <BarRow key={p.player_id} rank={i + 1} playerNumber={p.player_number} name={p.name} value={p.goals} max={scorers[0].goals} barColour="bg-red-700" label="text-red-800" />
                  ))}
                </ul>
              </div>
            )}

            {/* Top Assisters */}
            {assisters.length > 0 && (
              <div>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Assisters</h3>
                </div>
                <ul className="divide-y divide-gray-50 py-1">
                  {assisters.map((p, i) => (
                    <BarRow key={p.player_id} rank={i + 1} playerNumber={p.player_number} name={p.name} value={p.assists} max={assisters[0].assists} barColour="bg-blue-500" label="text-blue-700" />
                  ))}
                </ul>
              </div>
            )}

            {/* Average Minutes */}
            {avgMinsRows.length > 0 && (
              <div>
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Average Minutes</h3>
                </div>
                <ul className="divide-y divide-gray-50 py-1">
                  {avgMinsRows.map((p, i) => (
                    <BarRow key={p.player_id} rank={i + 1} playerNumber={p.player_number} name={p.name} value={p.avgMins} max={avgMinsRows[0].avgMins} barColour="bg-emerald-500" label="text-emerald-700" />
                  ))}
                </ul>
              </div>
            )}

            {/* Full player stats table */}
            <div>
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Players</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Player</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-12">Apps</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-12">Goals</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-12">Asst</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">MOTM</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">Mins</th>
                      <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">Avg Mins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {allRows.map(p => {
                      const avg = p.played > 0 ? Math.round(p.total_mins / p.played) : 0
                      return (
                        <tr key={p.player_id} className="hover:bg-gray-50/50">
                          <td className="px-5 py-2 text-gray-900 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              {p.player_number != null && (
                                <span className="text-xs font-semibold text-gray-400 w-6 text-right">#{p.player_number}</span>
                              )}
                              {p.name}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center text-gray-700">{p.played || '—'}</td>
                          <td className="px-2 py-2 text-center font-medium text-gray-900">{p.goals || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-700">{p.assists || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-700">{p.motm || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-500">{p.total_mins || '—'}</td>
                          <td className="px-2 py-2 text-center text-gray-500">{p.played > 0 ? avg : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Players tab */}
      {tab === 'players' && (
        <div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {currentSeasonName ?? ''}
            </span>
            <div className="flex items-center gap-3">
              <select
                value={playerSort}
                onChange={e => setPlayerSort(e.target.value as 'number' | 'alpha' | 'age')}
                className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-red-700 bg-white"
              >
                <option value="number">By number</option>
                <option value="alpha">A–Z</option>
                <option value="age">By age</option>
              </select>
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
                const dob = (fd.get('date_of_birth') as string) || null
                const numRaw = (fd.get('player_number') as string).trim()
                const num = numRaw ? parseInt(numRaw) : null
                setPlayers(prev => [...prev, { id: crypto.randomUUID(), first_name: first, last_name: last, date_of_birth: dob, player_number: num }]
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date of birth <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    name="date_of_birth" type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Shirt number <span className="font-normal text-gray-400">(optional)</span></label>
                  <input
                    name="player_number" type="number" min={1} max={99}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
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

          {sortedPlayers.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No players registered for this season.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {sortedPlayers.map(p => (
                <li key={p.id} className="px-5 py-2.5 flex items-center gap-3">
                  <span className="w-7 text-right text-xs font-semibold text-gray-400 flex-shrink-0">
                    {p.player_number != null ? `#${p.player_number}` : ''}
                  </span>
                  <span className="text-sm text-gray-900 flex-1">{p.first_name} {p.last_name}</span>
                  {playerSort === 'age' && p.date_of_birth && (
                    <span className="text-xs text-gray-400">{formatDob(p.date_of_birth)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
