'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import { addFixture } from '../actions'

import { buildOpponentOptions, type OpponentOption } from '@/lib/opponentUtils'

type Season = { id: string; name: string; is_current: boolean }

export default function AddFixturePage() {
  const { id: teamId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [opponents, setOpponents] = useState<OpponentOption[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [date, setDate] = useState('')
  const [tbc, setTbc] = useState(false)
  const [kickoffTime, setKickoffTime] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [venue, setVenue] = useState('home')
  const [competition, setCompetition] = useState('friendly')

  useEffect(() => {
    async function load() {
      const [{ data: seasonsData }, { data: clubsData }] = await Promise.all([
        supabase.from('seasons').select('id, name, is_current').order('start_date', { ascending: false }),
        supabase.from('clubs').select('id, name, club_teams(id, name)').order('name'),
      ])
      const s = seasonsData ?? []
      setSeasons(s)
      setSeasonId(s.find(x => x.is_current)?.id ?? s[0]?.id ?? '')
      setOpponents(buildOpponentOptions((clubsData ?? []) as any))
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    else router.push(`/teams/${teamId}/fixtures`)
  }

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
                  onClick={() => router.back()}
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
