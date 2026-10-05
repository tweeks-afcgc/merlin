'use client'

import { useState } from 'react'
import { submitManagerReview } from '../../actions'

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
            className={`w-10 h-10 transition ${(hover || value) >= n ? 'text-amber-400' : 'text-gray-200'}`}
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

export default function ManagerReviewForm({ token, refName }: { token: string; refName: string }) {
  const [score, setScore] = useState(0)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!score) { setError('Please give a star rating.'); return }
    setSubmitting(true)
    setError(null)
    const result = await submitManagerReview(token, { score, comments })
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
        <p className="text-sm text-gray-500">Your review of {refName} has been submitted successfully.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-0.5">Overall performance</p>
        <p className="text-xs text-gray-400 mb-3">Rate <strong>{refName}</strong>'s overall performance today</p>
        <div className="flex items-center gap-3 flex-wrap">
          <StarRating value={score} onChange={setScore} />
          {score > 0 && (
            <span className="text-sm font-medium text-amber-600">{LABELS[score]}</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-900 mb-1">Comments <span className="font-normal text-gray-400">(optional)</span></label>
        <textarea
          value={comments}
          onChange={e => setComments(e.target.value)}
          rows={4}
          placeholder="Any comments about the referee's performance…"
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
