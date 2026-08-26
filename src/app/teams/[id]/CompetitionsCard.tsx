'use client'

import { useState } from 'react'
import { addTeamCompetition, deleteTeamCompetition } from './competitionActions'

type Competition = {
  id: string; season_id: string; type: 'league' | 'cup'
  name: string; abbr_name: string | null; division: string | null
}
type Season = { id: string; name: string; is_current: boolean }

export default function CompetitionsCard({
  teamId,
  seasons,
  initialCompetitions,
  isAdmin,
}: {
  teamId: string
  seasons: Season[]
  initialCompetitions: Competition[]
  isAdmin: boolean
}) {
  const currentSeason = seasons.find(s => s.is_current) ?? seasons[0]
  const [seasonId, setSeasonId] = useState(currentSeason?.id ?? '')
  const [competitions, setCompetitions] = useState<Competition[]>(initialCompetitions)
  const [adding, setAdding] = useState(false)
  const [newType, setNewType] = useState<'league' | 'cup'>('league')
  const [newName, setNewName] = useState('')
  const [newAbbr, setNewAbbr] = useState('')
  const [newDivision, setNewDivision] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = competitions.filter(c => c.season_id === seasonId)
  const hasLeague = filtered.some(c => c.type === 'league')

  function resetForm() {
    setNewName(''); setNewAbbr(''); setNewDivision(''); setNewType('league'); setError(null)
  }

  async function handleAdd() {
    if (!newName.trim()) return
    if (newType === 'league' && hasLeague) { setError('Only one league competition per season.'); return }
    setSaving(true)
    setError(null)
    const result = await addTeamCompetition(
      teamId, seasonId, newType, newName,
      newType === 'league' ? newAbbr : '',
      newType === 'league' ? newDivision : '',
    )
    if (result?.error) { setError(result.error); setSaving(false); return }
    setCompetitions(prev => [...prev, {
      id: crypto.randomUUID(), season_id: seasonId, type: newType,
      name: newName.trim(),
      abbr_name: newType === 'league' ? (newAbbr.trim() || null) : null,
      division: newType === 'league' ? (newDivision.trim() || null) : null,
    }])
    resetForm()
    setAdding(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await deleteTeamCompetition(id, teamId)
    setCompetitions(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Competitions</span>
          {seasons.length > 1 && (
            <select
              value={seasonId}
              onChange={e => { setSeasonId(e.target.value); setAdding(false); resetForm() }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-red-700 text-gray-600"
            >
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
              ))}
            </select>
          )}
        </div>
        {isAdmin && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-red-800 hover:text-red-900 transition"
            title="Add competition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 && !adding && (
        <p className="px-5 py-4 text-sm text-gray-400">No competitions recorded for this season.</p>
      )}

      {filtered.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {filtered.map(c => (
            <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  c.type === 'league' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {c.type === 'league' ? 'League' : 'Cup'}
                </span>
                <div className="min-w-0">
                  <span className="text-sm text-gray-800 truncate block">
                    {c.name}{c.abbr_name ? ` (${c.abbr_name})` : ''}
                  </span>
                  {c.division && (
                    <span className="text-xs text-gray-400">Division {c.division}</span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition flex-shrink-0"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && adding && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-3 bg-gray-50">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value as 'league' | 'cup')}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            >
              <option value="league" disabled={hasLeague}>League{hasLeague ? ' (already added)' : ''}</option>
              <option value="cup">Cup</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {newType === 'league' ? 'League name' : 'Cup name'}
            </label>
            <input
              type="text"
              autoFocus
              placeholder={newType === 'league' ? 'e.g. Sevenoaks and District Football League' : 'e.g. FA Cup'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>
          {newType === 'league' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Abbreviation <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. SADFL"
                  value={newAbbr}
                  onChange={e => setNewAbbr(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Division <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  placeholder="e.g. 1"
                  value={newDivision}
                  onChange={e => setNewDivision(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving || !newName.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button type="button" onClick={() => { setAdding(false); resetForm() }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
