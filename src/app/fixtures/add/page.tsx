'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import { addFixture } from '@/app/teams/[id]/fixtures/actions'
import { buildOpponentOptions, type OpponentOption } from '@/lib/opponentUtils'
import { sortedTeams, teamDisplayName } from '@/lib/teamSort'

type Season = { id: string; name: string; start_date: string; is_current: boolean }
type Team = { id: string; name: string; type: string; founding_age_group: number | null; founding_season_id: string | null; age_group: number | null; default_venue_id: string | null; default_pitch_id: string | null }

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
  const [internalTeams, setInternalTeams] = useState<{ id: string; label: string }[]>([])

  const [teamId, setTeamId] = useState('')
  const [seasonId, setSeasonId] = useState('')
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [date, setDate] = useState('')
  const [tbc, setTbc] = useState(false)
  const [kickoffTime, setKickoffTime] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [venue, setVenue] = useState('home')
  const [competition, setCompetition] = useState('friendly')
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])
  const [homeVenueId, setHomeVenueId] = useState('')
  const [pitches, setPitches] = useState<{ id: string; name: string }[]>([])
  const [pitchId, setPitchId] = useState('')
  const [teamCompetitions, setTeamCompetitions] = useState<{ id: string; type: 'league' | 'cup'; name: string; abbr_name: string | null; division: string | null }[]>([])

  useEffect(() => {
    async function load() {
      const [{ data: teamsData }, { data: seasonsData }, { data: clubsData }, { data: venuesData }] = await Promise.all([
        supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group, default_venue_id, default_pitch_id'),
        supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
        supabase.from('clubs').select('id, name, club_teams(id, name)').order('name'),
        supabase.from('venues').select('id, name').order('name'),
      ])
      const s = seasonsData ?? []
      const t = teamsData ?? []
      setTeams(t)
      setSeasons(s)
      setSeasonId(s.find(x => x.is_current)?.id ?? s[0]?.id ?? '')
      setOpponents(buildOpponentOptions((clubsData ?? []) as any))
      setVenues(venuesData ?? [])
      // Internal teams for friendly fixtures — sorted same way as team picker
      const sorted = sortedTeams(t, s)
      setInternalTeams(sorted.map(tm => ({ id: `internal:${tm.id}`, label: teamDisplayName(tm, s) })))
      setLoading(false)
    }
    load()
  }, [])

  // Auto-set home venue + pitch from team defaults when team or venue changes
  useEffect(() => {
    if (venue !== 'home') return
    const selectedTeam = teams.find(t => t.id === teamId)
    if (selectedTeam?.default_venue_id) {
      setHomeVenueId(selectedTeam.default_venue_id)
      if (selectedTeam.default_pitch_id) setPitchId(selectedTeam.default_pitch_id)
    }
  }, [teamId, venue])

  // Fetch pitches when home venue changes
  useEffect(() => {
    if (!homeVenueId) { setPitches([]); setPitchId(''); return }
    supabase.from('pitches').select('id, name').eq('venue_id', homeVenueId).eq('is_active', true).order('name')
      .then(({ data }) => setPitches(data ?? []))
  }, [homeVenueId])

  // Fetch team competitions when team or season changes; reset competition selection
  useEffect(() => {
    setCompetition('friendly')
    if (!teamId || !seasonId) { setTeamCompetitions([]); return }
    supabase.from('team_competitions').select('id, type, name, abbr_name, division').eq('team_id', teamId).eq('season_id', seasonId).order('created_at')
      .then(({ data }) => setTeamCompetitions((data ?? []) as any))
  }, [teamId, seasonId])

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
    fd.set('home_venue_id', venue === 'home' ? homeVenueId : '')
    fd.set('pitch_id', venue === 'home' ? pitchId : '')
    fd.set('competition', competition)
    const result = await addFixture(teamId, fd)
    if (result?.error) { setError(result.error); setSaving(false) }
    else {
      const today = new Date().toISOString().split('T')[0]
      if (date < today && result.id) {
        router.push(`/teams/${teamId}/fixtures/${result.id}/edit?from=/fixtures`)
      } else {
        router.push('/fixtures')
      }
    }
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

              {/* Season — collapsed by default, click to change */}
              <div className="flex items-center justify-between text-sm pb-1 border-b border-gray-100">
                <span className="text-gray-400 text-xs font-medium uppercase tracking-wide">Season</span>
                {seasonOpen ? (
                  <select
                    autoFocus
                    value={seasonId}
                    onChange={e => { setSeasonId(e.target.value); setSeasonOpen(false) }}
                    onBlur={() => setSeasonOpen(false)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    {seasons.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSeasonOpen(true)}
                    className="text-gray-500 hover:text-red-800 font-medium transition"
                  >
                    {seasons.find(s => s.id === seasonId)?.name ?? '—'}
                    <span className="ml-1.5 text-xs text-gray-300 font-normal">change</span>
                  </button>
                )}
              </div>

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
                <div className="flex items-center gap-3">
                  {!tbc && (
                    <input
                      type="time"
                      value={kickoffTime}
                      onChange={e => setKickoffTime(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                    />
                  )}
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tbc}
                      onChange={e => setTbc(e.target.checked)}
                      className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                    />
                    TBC
                  </label>
                </div>
              </div>

              {/* Opponent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opponent</label>
                <select
                  value={opponentId}
                  onChange={e => setOpponentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                >
                  <option value="">Select opponent...</option>
                  <option value="tbc">TBC</option>
                  {opponents.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                  {internalTeams.length > 0 && (
                    <optgroup label="── Internal Teams ──">
                      {internalTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
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
                        onChange={() => { setVenue(v); if (v !== 'home') setHomeVenueId('') }}
                        className="text-red-800 focus:ring-red-700"
                      />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </label>
                  ))}
                </div>
                {venue === 'home' && (
                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Home venue</label>
                      <select
                        value={homeVenueId}
                        onChange={e => { setHomeVenueId(e.target.value); setPitchId('') }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      >
                        <option value="">Not assigned</option>
                        {venues.map(v => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                    {pitches.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pitch</label>
                        <select
                          value={pitchId}
                          onChange={e => setPitchId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                        >
                          <option value="">Not assigned</option>
                          {pitches.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
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
                  {(() => {
                    const league = teamCompetitions.find(c => c.type === 'league')
                    const cups = teamCompetitions.filter(c => c.type === 'cup')
                    const leagueLabel = league
                      ? `League (${league.abbr_name ?? league.name}${league.division ? ` Division ${league.division}` : ''})`
                      : 'League'
                    return (
                      <>
                        <option value="league">{leagueLabel}</option>
                        {cups.length > 0
                          ? cups.map(c => <option key={c.id} value={`cup:${c.id}`}>{`Cup (${c.name})`}</option>)
                          : <option value="cup">Cup</option>
                        }
                      </>
                    )
                  })()}
                  <option value="shield">Shield</option>
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
                  disabled={saving}
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
