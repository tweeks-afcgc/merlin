'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import { updateFixture, assignRefereeFromRequest } from '../../actions'

type ClubTeam = { id: string; name: string; clubs: { name: string } }
type Venue = { id: string; name: string }
type Pitch = { id: string; name: string; venue_id: string }
type Referee = { id: string; full_name: string | null }
type RefRequest = { id: string; referee_id: string; refereeName: string; created_at: string }

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

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data: fixture }, { data: teamsData }, { data: venuesData }, { data: refereesData }, { data: requestsData }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('fixtures').select('*').eq('id', fixtureId).single(),
        supabase.from('club_teams').select('id, name, clubs(name)').order('name'),
        supabase.from('venues').select('id, name').order('name'),
        supabase.from('profiles').select('id, full_name').eq('is_referee', true).order('full_name'),
        supabase.from('referee_requests').select('id, referee_id, created_at, profiles(full_name)').eq('fixture_id', fixtureId).order('created_at'),
      ])

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(profile?.role === 'admin')
      }

      if (fixture) {
        setDate(fixture.date)
        setTbc(!fixture.kickoff_time)
        setKickoffTime(fixture.kickoff_time ?? '')
        setOpponentId(fixture.opponent_id ?? '')
        setVenue(fixture.venue)
        setCompetition(fixture.competition ?? 'friendly')
        setHomeVenueId(fixture.home_venue_id ?? '')
        setPitchId(fixture.pitch_id ?? '')
        setRefereeRequired(fixture.referee_required ?? true)
        setRefereeId(fixture.referee_id ?? '')

        if (fixture.home_venue_id) {
          const { data: pitchData } = await supabase
            .from('pitches').select('id, name, venue_id').eq('venue_id', fixture.home_venue_id)
          setPitches(pitchData ?? [])
        }
      }

      setClubTeams((teamsData ?? []) as any)
      setVenues(venuesData ?? [])
      setReferees(refereesData ?? [])
      setRefRequests((requestsData ?? []).map((r: any) => ({
        id: r.id,
        referee_id: r.referee_id,
        refereeName: r.profiles?.full_name ?? '—',
        created_at: r.created_at,
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function handleVenueChange(id: string) {
    setHomeVenueId(id)
    setPitchId('')
    if (id) {
      const { data } = await supabase.from('pitches').select('id, name, venue_id').eq('venue_id', id)
      setPitches(data ?? [])
    } else {
      setPitches([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!opponentId) { setError('Please select an opponent.'); return }
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
                  {clubTeams.map(t => (
                    <option key={t.id} value={t.id}>
                      {(t.clubs as any)?.name} {t.name}
                    </option>
                  ))}
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
                        onChange={() => setVenue(v)}
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
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}
