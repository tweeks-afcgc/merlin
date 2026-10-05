'use client'

import { useState } from 'react'
import { submitManagerReview } from '../../actions'

export default function ManagerReviewForm({ token, refName }: { token: string; refName: string }) {
  const [score, setScore] = useState(0)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!score) { setError('Please give a score out of 10.'); return }
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

  const scoreLabel = score === 0 ? '' : score <= 3 ? 'Poor' : score <= 5 ? 'Below average' : score <= 7 ? 'Good' : score <= 9 ? 'Very good' : 'Excellent'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">Please rate <strong>{refName}</strong>'s performance today.</p>

      {/* Score out of 10 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-3">Overall score out of 10</p>
        <div className="flex flex-wrap gap-2">
          {[1,2,3,4,5,6,7,8,9,10].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setScore(n)}
              className={`w-10 h-10 rounded-lg text-sm font-bold transition border ${
                score === n
                  ? 'bg-red-800 text-white border-red-800'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-red-300 hover:text-red-800'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {score > 0 && (
          <p className="text-sm font-medium text-red-800 mt-3">{score}/10 — {scoreLabel}</p>
        )}
      </div>

      {/* Comments */}
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
