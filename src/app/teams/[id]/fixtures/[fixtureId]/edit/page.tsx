'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import { updateFixture, assignRefereeFromRequest, savePerformances, saveMatchNotes, type PlayerPerformance } from '../../actions'
import DeleteFixtureButton from '../../DeleteFixtureButton'
import { buildOpponentOptions, type OpponentOption } from '@/lib/opponentUtils'
import { sortedTeams, teamDisplayName } from '@/lib/teamSort'

type ClubTeam = { id: string; name: string; clubs: { name: string } }
type Venue = { id: string; name: string }
type Pitch = { id: string; name: string; venue_id: string }
type Referee = { id: string; full_name: string | null; isVolunteer?: boolean }
type RefRequest = { id: string; referee_id: string; refereeName: string; created_at: string }
type Player = { id: string; first_name: string; last_name: string; player_number: number | null }

export default function EditFixturePage() {
  const { id: teamId, fixtureId } = useParams<{ id: string; fixtureId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('from') ?? `/teams/${teamId}/fixtures`
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [clubTeams, setClubTeams] = useState<ClubTeam[]>([])
  const [opponents, setOpponents] = useState<OpponentOption[]>([])
  const [internalTeams, setInternalTeams] = useState<{ id: string; label: string }[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [referees, setReferees] = useState<Referee[]>([])
  const [refRequests, setRefRequests] = useState<RefRequest[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const [date, setDate] = useState('')
  const [tbc, setTbc] = useState(false)
  const [kickoffTime, setKickoffTime] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [venue, setVenue] = useState('home')
  const [competition, setCompetition] = useState('friendly')
  const [homeVenueId, setHomeVenueId] = useState('')
  const [pitchId, setPitchId] = useState('')
  const [refereeRequired, setRefereeRequired] = useState(true)
  const [refereeId, setRefereeId] = useState('')
  const [goalsFor, setGoalsFor] = useState<string>('')
  const [goalsAgainst, setGoalsAgainst] = useState<string>('')
  const [isPast, setIsPast] = useState(false)
  const [matchNotes, setMatchNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  // Player performances
  const [players, setPlayers] = useState<Player[]>([])
  const [perfs, setPerfs] = useState<Record<string, PlayerPerformance>>({})
  const [perfSaving, setPerfSaving] = useState(false)
  const [perfError, setPerfError] = useState<string | null>(null)
  const [perfSaved, setPerfSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data: fixture }, { data: clubsData }, { data: venuesData }, { data: refereesData }, { data: requestsData }, { data: volunteerRefsData }, { data: allTeamsData }, { data: seasonsData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('fixtures').select('*').eq('id', fixtureId).single(),
        supabase.from('clubs').select('id, name, club_teams(id, name)').order('name'),
        supabase.from('venues').select('id, name').order('name'),
        supabase.from('profiles').select('id, full_name').eq('is_referee', true).order('full_name'),
        supabase.from('referee_requests').select('id, referee_id, created_at, profiles(full_name)').eq('fixture_id', fixtureId).order('created_at'),
        supabase.from('volunteers').select('id, first_name, last_name, profile_id').eq('is_referee', true),
        supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group').order('name'),
        supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
      ])

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(profile?.role === 'admin')
      }

      if (fixture) {
        setDate(fixture.date)
        setTbc(!fixture.kickoff_time)
        setKickoffTime(fixture.kickoff_time ?? '')
        setOpponentId(fixture.opponent_id ?? 'tbc')
        setVenue(fixture.venue)
        setCompetition(fixture.competition ?? 'friendly')
        setHomeVenueId(fixture.home_venue_id ?? '')
        setPitchId(fixture.pitch_id ?? '')
        // Away/neutral fixtures default to no referee required
        const isHome = fixture.venue === 'home'
        setRefereeRequired(isHome ? (fixture.referee_required ?? true) : false)
        setRefereeId(
          fixture.referee_id
            ? fixture.referee_id
            : fixture.volunteer_referee_id
              ? `vol:${fixture.volunteer_referee_id}`
              : ''
        )
        setGoalsFor(fixture.goals_for != null ? String(fixture.goals_for) : '')
        setGoalsAgainst(fixture.goals_against != null ? String(fixture.goals_against) : '')
        setIsPast(fixture.date < new Date().toISOString().split('T')[0])
        setMatchNotes((fixture as any).notes ?? '')

        if (fixture.home_venue_id) {
          const { data: pitchData } = await supabase
            .from('pitches').select('id, name, venue_id').eq('venue_id', fixture.home_venue_id).eq('is_active', true)
          setPitches(pitchData ?? [])
        }
      }

      const opts = buildOpponentOptions((clubsData ?? []) as any)
      setOpponents(opts)
      setClubTeams((clubsData ?? []) as any) // keep for any legacy refs
      const allSeasons = seasonsData ?? []
      const ordered = sortedTeams(allTeamsData ?? [], allSeasons)
      setInternalTeams(ordered.map((t: any) => ({ id: `internal:${t.id}`, label: teamDisplayName(t, allSeasons) })))
      setVenues(venuesData ?? [])
      // Combine profile referees + volunteer referees (exclude volunteers already in profiles to avoid duplicates)
      const profileRefIds = new Set((refereesData ?? []).map((r: any) => r.id))
      const volRefs = (volunteerRefsData ?? [])
        .filter((v: any) => !v.profile_id || !profileRefIds.has(v.profile_id))
        .map((v: any) => ({ id: `vol:${v.id}`, full_name: `${v.first_name} ${v.last_name}`, isVolunteer: true }))
      const combined = [
        ...(refereesData ?? []),
        ...volRefs,
      ].sort((a: any, b: any) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))
      setReferees(combined)
      setRefRequests((requestsData ?? []).map((r: any) => ({
        id: r.id,
        referee_id: r.referee_id,
        refereeName: r.profiles?.full_name ?? '—',
        created_at: r.created_at,
      })))
      // Load players for this team+season and existing performances
      if (fixture?.season_id) {
        const [{ data: playerRows }, { data: existingPerfs }] = await Promise.all([
          supabase
            .from('player_team_seasons')
            .select('player_number, players(id, first_name, last_name)')
            .eq('team_id', teamId)
            .eq('season_id', fixture.season_id),
          supabase
            .from('fixture_player_performances')
            .select('*')
            .eq('fixture_id', fixtureId),
        ])

        const loadedPlayers = (playerRows ?? [])
          .map((r: any) => r.players ? { ...r.players, player_number: r.player_number ?? null } : null)
          .filter(Boolean)
          .sort((a: any, b: any) => {
            if (a.player_number != null && b.player_number != null) return a.player_number - b.player_number
            if (a.player_number != null) return -1
            if (b.player_number != null) return 1
            return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
          })

        setPlayers(loadedPlayers)

        const perfMap: Record<string, PlayerPerformance> = {}
        // Initialise all players with defaults
        for (const p of loadedPlayers) {
          perfMap[p.id] = { player_id: p.id, played: false, goals: 0, assists: 0, motm: false, mins_played: 0 }
        }
        // Overwrite with any saved values
        for (const ep of existingPerfs ?? []) {
          perfMap[ep.player_id] = {
            player_id: ep.player_id,
            played: ep.played,
            goals: ep.goals,
            assists: ep.assists,
            motm: ep.motm,
            mins_played: ep.mins_played,
          }
        }
        setPerfs(perfMap)
      }

      setLoading(false)
    }
    load()
  }, [])

  function updatePerf(playerId: string, field: keyof Omit<PlayerPerformance, 'player_id'>, value: boolean | number) {
    setPerfs(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }))
    setPerfSaved(false)
  }

  async function handleSavePerformances() {
    setPerfSaving(true)
    setPerfError(null)
    const result = await savePerformances(fixtureId, teamId, Object.values(perfs))
    if (result?.error) { setPerfError(result.error); setPerfSaving(false) }
    else { setPerfSaved(true); setPerfSaving(false) }
  }

  async function handleSaveNotes() {
    setNotesSaving(true)
    await saveMatchNotes(fixtureId, teamId, matchNotes)
    setNotesSaved(true)
    setNotesSaving(false)
  }

  async function handleVenueChange(id: string) {
    setHomeVenueId(id)
    setPitchId('')
    if (id) {
      const { data } = await supabase.from('pitches').select('id, name, venue_id').eq('venue_id', id).eq('is_active', true)
      setPitches(data ?? [])
    } else {
      setPitches([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!opponentId && opponentId !== 'tbc') { setError('Please select an opponent.'); return }
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('date', date)
    fd.set('tbc', tbc ? 'true' : 'false')
    fd.set('kickoff_time', kickoffTime)
    fd.set('opponent_id', opponentId)
    fd.set('venue', venue)
    fd.set('competition', competition)
    fd.set('home_venue_id', venue === 'home' ? homeVenueId : '')
    fd.set('pitch_id', venue === 'home' ? pitchId : '')
    fd.set('referee_required', refereeRequired ? 'true' : 'false')
    fd.set('referee_id', refereeRequired ? refereeId : '')
    // volunteer_referee_id is derived server-side from vol: prefix
    fd.set('goals_for', goalsFor)
    fd.set('goals_against', goalsAgainst)
    const result = await updateFixture(fixtureId, teamId, fd)
    if (result?.error) { setError(result.error); setSaving(false) }
    else router.push(returnTo)
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit fixture</h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <>
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>

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
                        onChange={() => { setVenue(v); if (v !== 'home') setRefereeRequired(false) }}
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
                  <option value="shield">Shield</option>
                </select>
              </div>

              {/* Pitch assignment — admin only, home fixtures only */}
              {isAdmin && venue === 'home' && (
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pitch assignment</p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Home venue</label>
                    <select
                      value={homeVenueId}
                      onChange={e => handleVenueChange(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                    >
                      <option value="">Not assigned</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  {homeVenueId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pitch</label>
                      {pitches.length === 0 ? (
                        <p className="text-sm text-gray-400">No pitches added for this venue yet.</p>
                      ) : (
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
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Referee requests — admin only, shown when requests exist */}
              {isAdmin && refRequests.length > 0 && (
                <div className="border-t border-gray-100 pt-5 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Referee requests</p>
                  <p className="text-xs text-gray-500">Select a request to assign that referee to this fixture.</p>
                  <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                    {refRequests.map(r => (
                      <li key={r.id} className="flex items-center justify-between px-4 py-3 bg-white">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{r.refereeName}</p>
                          <p className="text-xs text-gray-400">
                            Requested {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={assigningId === r.referee_id}
                          onClick={async () => {
                            setAssigningId(r.referee_id)
                            const result = await assignRefereeFromRequest(fixtureId, r.referee_id, teamId)
                            if (result?.error) setError(result.error)
                            else setRefereeId(r.referee_id)
                            setAssigningId(null)
                          }}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 transition disabled:opacity-50"
                        >
                          {assigningId === r.referee_id ? '…' : 'Assign'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Referee — admin only */}
              {isAdmin && (
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Referee</p>

                  <div>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={refereeRequired}
                        onChange={e => setRefereeRequired(e.target.checked)}
                        className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                      />
                      Referee required
                    </label>
                  </div>

                  {refereeRequired && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned referee</label>
                      {referees.length === 0 ? (
                        <p className="text-sm text-gray-400">No qualified referees on record.</p>
                      ) : (
                        <select
                          value={refereeId}
                          onChange={e => setRefereeId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                        >
                          <option value="">Not assigned</option>
                          {referees.map(r => (
                            <option key={r.id} value={r.id}>{r.full_name ?? '—'}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Result — shown for past fixtures */}
              {isPast && (
                <div className="border-t border-gray-100 pt-5 space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Result</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Our score</label>
                      <input
                        type="number"
                        min={0}
                        value={goalsFor}
                        onChange={e => setGoalsFor(e.target.value)}
                        placeholder="—"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      />
                    </div>
                    <div className="pt-5 text-gray-400 font-bold text-lg">–</div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Their score</label>
                      <input
                        type="number"
                        min={0}
                        value={goalsAgainst}
                        onChange={e => setGoalsAgainst(e.target.value)}
                        placeholder="—"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      />
                    </div>
                  </div>
                  {goalsFor !== '' && goalsAgainst !== '' && (
                    <p className={`text-sm font-semibold ${
                      Number(goalsFor) > Number(goalsAgainst) ? 'text-green-700'
                      : Number(goalsFor) < Number(goalsAgainst) ? 'text-red-600'
                      : 'text-amber-600'
                    }`}>
                      {Number(goalsFor) > Number(goalsAgainst) ? '✓ Win'
                        : Number(goalsFor) < Number(goalsAgainst) ? '✗ Loss'
                        : '= Draw'}
                      {' '}({goalsFor}–{goalsAgainst})
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => router.push(returnTo)}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-red-800 hover:bg-red-900 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
              {!refereeId && (
                <div className="flex justify-center pt-2">
                  <DeleteFixtureButton fixtureId={fixtureId} teamId={teamId} returnTo={returnTo} />
                </div>
              )}
            </form>
          </div>

          {/* Player performances — shown once a result has been entered */}
          {isPast && goalsFor !== '' && goalsAgainst !== '' && players.length > 0 && (
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 mt-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Player stats</h2>
                <p className="text-xs text-gray-400 mt-0.5">Total goals must not exceed {goalsFor}.</p>
              </div>

              {perfError && (
                <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{perfError}</div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Player</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">Played</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">Goals</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">Assists</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">MOTM</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-20">Mins</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {players.map(p => {
                      const perf = perfs[p.id] ?? { player_id: p.id, played: false, goals: 0, assists: 0, motm: false, mins_played: 0 }
                      const totalGoals = Object.values(perfs).reduce((s, x) => s + (x.goals ?? 0), 0)
                      const maxGoals = Number(goalsFor)
                      return (
                        <tr key={p.id} className={perf.played ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-6 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              {p.player_number != null && (
                                <span className="text-xs font-semibold text-gray-400 w-6 text-right">#{p.player_number}</span>
                              )}
                              {p.first_name} {p.last_name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={perf.played}
                              onChange={e => updatePerf(p.id, 'played', e.target.checked)}
                              className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={maxGoals}
                              value={perf.goals}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0)
                                const otherGoals = totalGoals - perf.goals
                                updatePerf(p.id, 'goals', Math.min(val, maxGoals - otherGoals))
                              }}
                              className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              value={perf.assists}
                              onChange={e => updatePerf(p.id, 'assists', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={perf.motm}
                              onChange={e => updatePerf(p.id, 'motm', e.target.checked)}
                              className="rounded border-gray-300 text-red-800 focus:ring-red-700"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input
                              type="number"
                              min={0}
                              value={perf.mins_played}
                              onChange={e => updatePerf(p.id, 'mins_played', Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-100 bg-gray-50">
                      <td className="px-6 py-2.5 text-xs text-gray-400">
                        {Object.values(perfs).filter(p => p.played).length} played ·{' '}
                        {Object.values(perfs).filter(p => p.motm).length} MOTM
                      </td>
                      <td />
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">
                        {Object.values(perfs).reduce((s, p) => s + p.goals, 0)}/{goalsFor}
                      </td>
                      <td className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600">
                        {Object.values(perfs).reduce((s, p) => s + p.assists, 0)}
                      </td>
                      <td />
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                {perfSaved && <span className="text-xs text-green-700 font-medium">Stats saved.</span>}
                {!perfSaved && <span />}
                <button
                  type="button"
                  onClick={handleSavePerformances}
                  disabled={perfSaving}
                  className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-60"
                >
                  {perfSaving ? 'Saving…' : 'Save player stats'}
                </button>
              </div>
            </div>
          )}

          {/* Match notes — shown once a result has been entered */}
          {isPast && goalsFor !== '' && goalsAgainst !== '' && (
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 mt-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">Match notes</h2>
                <p className="text-xs text-gray-400 mt-0.5">Any notes about the game.</p>
              </div>
              <div className="px-6 py-4">
                <textarea
                  value={matchNotes}
                  onChange={e => { setMatchNotes(e.target.value); setNotesSaved(false) }}
                  rows={4}
                  placeholder="Enter any notes about the match…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 resize-y"
                />
              </div>
              <div className="px-6 pb-4 flex items-center justify-between gap-3">
                {notesSaved ? <span className="text-xs text-green-700 font-medium">Notes saved.</span> : <span />}
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-5 py-2 rounded-lg transition disabled:opacity-60"
                >
                  {notesSaving ? 'Saving…' : 'Save notes'}
                </button>
              </div>
            </div>
          )}

          </>
        )}
      </div>
    </AppShell>
  )
}
