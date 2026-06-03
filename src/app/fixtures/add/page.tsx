'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import { addFixture } from '@/app/teams/[id]/fixtures/actions'
import { buildOpponentOptions, type OpponentOption } from '@/lib/opponentUtils'

type Season = { id: string; name: string; start_date: string; is_current: boolean }
type Team = { id: string; name: string; type: string; founding_age_group: number | null; founding_season_id: string | null; age_group: number | null }

// Senior teams in the desired fixed order
const SENIOR_ORDER = ['First XI', 'Sunday XI', 'Vets XI', 'Women']
const SQUAD_ORDER = ['Knights', 'Dukes', 'Roses']

function computeAge(team: Team, seasons: Season[]): number {
  if (!team.founding_age_group || !team.founding_season_id) return team.age_group ?? 0
  const sorted = [...seasons].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  const foundingIdx = sorted.findIndex(s => s.id === team.founding_season_id)
  const currentIdx = sorted.findIndex(s => s.is_current)
  if (foundingIdx === -1 || currentIdx === -1) return team.founding_age_group
  return team.founding_age_group + (currentIdx - foundingIdx)
}

function teamDisplayName(team: Team, seasons: Season[]): string {
  if (team.type === 'senior') return team.name
  const age = computeAge(team, seasons)
  return `Under ${age} ${team.name}`
}

function sortedTeams(teams: Team[], seasons: Season[]): Team[] {
  const senior = teams
    .filter(t => t.type === 'senior')
    .sort((a, b) => {
      const ai = SENIOR_ORDER.indexOf(a.name)
      const bi = SENIOR_ORDER.indexOf(b.name)
      const av = ai === -1 ? 99 : ai
      const bv = bi === -1 ? 99 : bi
      return av !== bv ? av - bv : a.name.localeCompare(b.name)
    })

  const junior = teams
    .filter(t => t.type === 'junior')
    .sort((a, b) => {
      const ageA = computeAge(a, seasons)
      const ageB = computeAge(b, seasons)
      if (ageB !== ageA) return ageB - ageA // older age groups first
      const si = (name: string) => {
        const idx = SQUAD_ORDER.findIndex(s => name.includes(s))
        return idx === -1 ? 99 : idx
      }
      return si(a.name) - si(b.name)
    })

  return [...senior, ...junior]
}

function nextWeekday(dayOfWeek: number): string {
  // dayOfWeek: 0=Sun, 6=Sat
  const today = new Date()
  const diff = (dayOfWeek - today.getDay() + 7) % 7 || 7
  const result = new Date(today)
  result.setDate(today.getDate() + diff)
  return result.toISOString().split('T')[0]
}

export default function AddFixtureFromDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [opponents, setOpponents] = useState<OpponentOption[]>([])

  const [teamId, setTeamId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [date, setDate] = useState('')
  const [tbc, setTbc] = useState(false)
  const [kickoffTime, setKickoffTime] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [venue, setVenue] = useState('home')
  const [competition, setCompetition] = useState('friendly')

  useEffect(() => {
    async function load() {
      const [{ data: teamsData }, { data: seasonsData }, { data: clubsData }] = await Promise.all([
        supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group'),
        supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
        supabase.from('clubs').select('id, name, club_teams(id, name)').order('name'),
      ])
      const s = seasonsData ?? []
      setTeams(teamsData ?? [])
      setSeasons(s)
      setSeasonId(s.find(x => x.is_current)?.id ?? s[0]?.id ?? '')
      setOpponents(buildOpponentOptions((clubsData ?? []) as any))
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId) { setError('Please select a team.'); return }
    if (!opponentId) { setError('Please select an opponent.'); return }
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('season_id', seasonId)
    fd.set('date', date)
    fd.set('tbc', tbc ? 'true' : 'false')
    fd.set('kickoff_time', kickoffTime)
    fd.set('opponent_id', opponentId)
    fd.set('venue', venue)
    fd.set('competition', competition)
    const result = await addFixture(teamId, fd)
    if (result?.error) { setError(result.error); setSaving(false) }
    else router.push('/fixtures')
  }

  const orderedTeams = sortedTeams(teams, seasons)

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Add fixture</h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              {/* Team */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                <select
                  value={teamId}
                  onChange={e => setTeamId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                >
                  <option value="">Select team...</option>
                  {orderedTeams.map(t => (
                    <option key={t.id} value={t.id}>{teamDisplayName(t, seasons)}</option>
                  ))}
                </select>
              </div>

              {/* Season */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Season</label>
                <select
                  value={seasonId}
                  onChange={e => setSeasonId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                >
                  {seasons.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setDate(nextWeekday(6))}
                    className="flex-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg py-1.5 transition"
                  >
                    Next Saturday
                  </button>
                  <button
                    type="button"
                    onClick={() => setDate(nextWeekday(0))}
                    className="flex-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg py-1.5 transition"
                  >
                    Next Sunday
                  </button>
                </div>
              </div>

              {/* Kick off time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kick off time</label>
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tbc}
                    onChange={e => setTbc(e.target.checked)}
                    className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                  />
                  TBC
                </label>
                {!tbc && (
                  <input
                    type="time"
                    value={kickoffTime}
                    onChange={e => setKickoffTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                )}
              </div>

              {/* Opponent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
                {opponents.length === 0 ? (
                  <p className="text-sm text-gray-400">No opponents added yet. Add clubs in Admin first.</p>
                ) : (
                  <select
                    value={opponentId}
                    onChange={e => setOpponentId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    <option value="">Select opponent...</option>
                    {opponents.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue</label>
                <div className="flex gap-3">
                  {(['home', 'away', 'neutral'] as const).map(v => (
                    <label key={v} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        name="venue"
                        value={v}
                        checked={venue === v}
                        onChange={() => setVenue(v)}
                        // referee_required handled server-side based on venue
                        className="text-red-800 focus:ring-red-700"
                      />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Competition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competition</label>
                <select
                  value={competition}
                  onChange={e => setCompetition(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                >
                  <option value="friendly">Friendly</option>
                  <option value="league">League</option>
                  <option value="cup">Cup</option>
                </select>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => router.push('/fixtures')}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || opponents.length === 0}
                  className="flex-1 bg-red-800 hover:bg-red-900 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Add fixture'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
