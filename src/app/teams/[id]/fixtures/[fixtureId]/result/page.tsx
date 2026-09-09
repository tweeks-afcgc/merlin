'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'
import { updateFixture, savePerformances, saveMatchNotes, type PlayerPerformance } from '../../actions'

type Player = { id: string; first_name: string; last_name: string; player_number: number | null }

export default function ResultPage() {
  const { id: teamId, fixtureId } = useParams<{ id: string; fixtureId: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [scoreSaving, setScoreSaving] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [scoreSaved, setScoreSaved] = useState(false)

  const [goalsFor, setGoalsFor] = useState<string>('')
  const [goalsAgainst, setGoalsAgainst] = useState<string>('')

  const [players, setPlayers] = useState<Player[]>([])
  const [perfs, setPerfs] = useState<Record<string, PlayerPerformance>>({})
  const [perfSaving, setPerfSaving] = useState(false)
  const [perfError, setPerfError] = useState<string | null>(null)
  const [perfSaved, setPerfSaved] = useState(false)

  const [matchNotes, setMatchNotes] = useState('')
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: fixture } = await supabase
        .from('fixtures')
        .select('goals_for, goals_against, notes, season_id')
        .eq('id', fixtureId)
        .single()

      if (!fixture) { setLoading(false); return }

      setGoalsFor(fixture.goals_for != null ? String(fixture.goals_for) : '')
      setGoalsAgainst(fixture.goals_against != null ? String(fixture.goals_against) : '')
      setMatchNotes((fixture as any).notes ?? '')
      setScoreSaved(fixture.goals_for != null && fixture.goals_against != null)

      if (fixture.season_id) {
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
        for (const p of loadedPlayers) {
          perfMap[p.id] = { player_id: p.id, played: false, goals: 0, assists: 0, motm: false, mins_played: 0 }
        }
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

  async function handleSaveScore(e: React.FormEvent) {
    e.preventDefault()
    setScoreSaving(true)
    setScoreError(null)
    const fd = new FormData()
    fd.set('goals_for', goalsFor)
    fd.set('goals_against', goalsAgainst)
    const result = await updateFixture(fixtureId, teamId, fd)
    if (result?.error) { setScoreError(result.error); setScoreSaving(false) }
    else { setScoreSaved(true); setScoreSaving(false) }
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

  const hasScore = goalsFor !== '' && goalsAgainst !== ''
  const gf = Number(goalsFor)
  const ga = Number(goalsAgainst)

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>
        <h1 className="text-xl font-bold text-gray-900 mb-6">Match result</h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <>
            {/* Score entry */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8">
              <form onSubmit={handleSaveScore} className="space-y-5">
                {scoreError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{scoreError}</div>
                )}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Our score</label>
                    <input
                      type="number"
                      min={0}
                      value={goalsFor}
                      onChange={e => { setGoalsFor(e.target.value); setScoreSaved(false) }}
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
                      onChange={e => { setGoalsAgainst(e.target.value); setScoreSaved(false) }}
                      placeholder="—"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                    />
                  </div>
                </div>

                {hasScore && (
                  <p className={`text-sm font-semibold ${gf > ga ? 'text-green-700' : gf < ga ? 'text-red-600' : 'text-amber-600'}`}>
                    {gf > ga ? '✓ Win' : gf < ga ? '✗ Loss' : '= Draw'} ({goalsFor}–{goalsAgainst})
                  </p>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  {scoreSaved && hasScore
                    ? <span className="text-xs text-green-700 font-medium">Score saved.</span>
                    : <span />
                  }
                  <div className="flex gap-3 ml-auto">
                    <button
                      type="button"
                      onClick={() => router.push(`/teams/${teamId}`)}
                      className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 px-4 rounded-lg text-sm transition"
                    >
                      Done
                    </button>
                    <button
                      type="submit"
                      disabled={scoreSaving || !hasScore}
                      className="bg-red-800 hover:bg-red-900 text-white font-semibold py-2 px-5 rounded-lg text-sm transition disabled:opacity-60"
                    >
                      {scoreSaving ? 'Saving…' : 'Save score'}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Player performances — shown once a result has been saved */}
            {hasScore && players.length > 0 && (
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
                        const maxGoals = gf
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
                  {perfSaved ? <span className="text-xs text-green-700 font-medium">Stats saved.</span> : <span />}
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

            {/* Match notes */}
            {hasScore && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-100 mt-6">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-700">Match notes</h2>
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
