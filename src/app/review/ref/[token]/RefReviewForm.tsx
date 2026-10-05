'use client'

import { useState } from 'react'
import { submitRefReview } from '../../actions'

const CATEGORIES = [
  { key: 'coaches' as const, label: 'Coaches / Team Officials', desc: 'Behaviour and conduct of coaches and team officials on the touchline' },
  { key: 'spectators' as const, label: 'Spectators', desc: 'Behaviour of supporters and parents watching the game' },
  { key: 'players' as const, label: 'Players', desc: 'Conduct and attitude of players during the match' },
  { key: 'experience' as const, label: 'Overall Club Experience', desc: 'Your overall experience dealing with the club (communication, facilities, hospitality)' },
]

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 transition"
        >
          <svg
            className={`w-8 h-8 transition ${(hover || value) >= n ? 'text-amber-400' : 'text-gray-200'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

const LABELS = ['', 'Poor', 'Below average', 'Average', 'Good', 'Excellent']

export default function RefReviewForm({ token, teamName }: { token: string; teamName: string }) {
  const [scores, setScores] = useState({ coaches: 0, spectators: 0, players: 0, experience: 0 })
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const missing = CATEGORIES.filter(c => !scores[c.key])
    if (missing.length) { setError(`Please rate: ${missing.map(c => c.label).join(', ')}`); return }
    setSubmitting(true)
    setError(null)
    const result = await submitRefReview(token, { ...scores, comments })
    if (result?.error) { setError(result.error); setSubmitting(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Thank you!</h2>
        <p className="text-sm text-gray-500">Your review of {teamName} has been submitted successfully.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Please rate each area of your experience with <strong>{teamName}</strong> on a scale of 1–5.</p>

      {CATEGORIES.map(cat => (
        <div key={cat.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-0.5">{cat.label}</p>
          <p className="text-xs text-gray-400 mb-3">{cat.desc}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <StarRating value={scores[cat.key]} onChange={v => setScores(s => ({ ...s, [cat.key]: v }))} />
            {scores[cat.key] > 0 && (
              <span className="text-sm font-medium text-amber-600">{LABELS[scores[cat.key]]}</span>
            )}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-1">Additional comments <span className="font-normal text-gray-400">(optional)</span></label>
        <textarea
          value={comments}
          onChange={e => setComments(e.target.value)}
          rows={4}
          placeholder="Any further comments about the match or club…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y"
        />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-800 hover:bg-red-900 text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit review'}
      </button>
    </form>
  )
}
