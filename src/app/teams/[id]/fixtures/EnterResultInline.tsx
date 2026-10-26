'use client'

import { useState } from 'react'
import { saveResult } from './actions'

export default function EnterResultInline({ fixtureId, teamId }: { fixtureId: string; teamId: string }) {
  const [open, setOpen] = useState(false)
  const [goalsFor, setGoalsFor] = useState('')
  const [goalsAgainst, setGoalsAgainst] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const gf = parseInt(goalsFor)
    const ga = parseInt(goalsAgainst)
    if (isNaN(gf) || isNaN(ga) || gf < 0 || ga < 0) {
      setError('Enter valid scores')
      return
    }
    setSaving(true)
    setError(null)
    const res = await saveResult(fixtureId, teamId, gf, ga)
    setSaving(false)
    if (res?.error) {
      setError(res.error)
    } else {
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded-md border border-red-200 transition whitespace-nowrap"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Enter result
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <input
        type="number"
        min="0"
        max="99"
        value={goalsFor}
        onChange={e => setGoalsFor(e.target.value)}
        placeholder="0"
        className="w-10 text-center text-sm font-bold border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-400"
        autoFocus
      />
      <span className="text-gray-400 text-xs font-bold">–</span>
      <input
        type="number"
        min="0"
        max="99"
        value={goalsAgainst}
        onChange={e => setGoalsAgainst(e.target.value)}
        placeholder="0"
        className="w-10 text-center text-sm font-bold border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-red-400"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="text-xs font-semibold px-2 py-0.5 bg-red-700 text-white rounded hover:bg-red-800 transition disabled:opacity-50"
      >
        {saving ? '…' : 'Save'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setError(null) }}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
