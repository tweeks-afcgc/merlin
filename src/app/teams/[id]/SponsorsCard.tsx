'use client'

import { useState } from 'react'
import { addTeamSponsor, deleteTeamSponsor } from './competitionActions'

type Sponsor = { id: string; season_id: string; name: string }
type Season = { id: string; name: string; is_current: boolean }

export default function SponsorsCard({
  teamId,
  seasons,
  initialSponsors,
  isAdmin,
}: {
  teamId: string
  seasons: Season[]
  initialSponsors: Sponsor[]
  isAdmin: boolean
}) {
  const currentSeason = seasons.find(s => s.is_current) ?? seasons[0]
  const [seasonId, setSeasonId] = useState(currentSeason?.id ?? '')
  const [sponsors, setSponsors] = useState<Sponsor[]>(initialSponsors)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = sponsors.filter(s => s.season_id === seasonId)

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    const result = await addTeamSponsor(teamId, seasonId, newName)
    if (result?.error) { setSaving(false); return }
    setSponsors(prev => [...prev, { id: crypto.randomUUID(), season_id: seasonId, name: newName.trim() }])
    setNewName('')
    setAdding(false)
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await deleteTeamSponsor(id, teamId)
    setSponsors(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Sponsors</span>
          {seasons.length > 1 && (
            <select
              value={seasonId}
              onChange={e => { setSeasonId(e.target.value); setAdding(false); setNewName('') }}
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
            title="Add sponsor"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 && !adding && (
        <p className="px-5 py-4 text-sm text-gray-400">No sponsors recorded for this season.</p>
      )}

      {filtered.length > 0 && (
        <ul className="divide-y divide-gray-50">
          {filtered.map(s => (
            <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-gray-800 truncate">{s.name}</span>
              {isAdmin && (
                <button type="button" onClick={() => handleDelete(s.id)}
                  className="text-xs text-gray-300 hover:text-red-500 transition flex-shrink-0">
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && adding && (
        <div className="px-5 py-4 border-t border-gray-100 space-y-2 bg-gray-50">
          <input
            type="text"
            autoFocus
            placeholder="Sponsor name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
          />
          <div className="flex gap-2">
            <button type="button" onClick={handleAdd} disabled={saving || !newName.trim()}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 disabled:opacity-50 transition">
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button type="button" onClick={() => { setAdding(false); setNewName('') }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
