'use client'

import { useState } from 'react'
import { requestFixture } from './actions'

export default function RequestButton({
  fixtureId,
  alreadyRequested,
  hasClash,
}: {
  fixtureId: string
  alreadyRequested: boolean
  hasClash: boolean
}) {
  const [requested, setRequested] = useState(alreadyRequested)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRequest() {
    setLoading(true)
    setError(null)
    const result = await requestFixture(fixtureId)
    if (result?.error) setError(result.error)
    else setRequested(true)
    setLoading(false)
  }

  if (requested) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 text-blue-700">
        ✓ Requested
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {hasClash && (
        <p className="text-xs text-amber-600 font-medium text-right">⚠ Timing clash with an assigned fixture</p>
      )}
      <button
        onClick={handleRequest}
        disabled={loading}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 transition disabled:opacity-50"
      >
        {loading ? '…' : 'Request'}
      </button>
      {error && <p className="text-xs text-red-600 text-right">{error}</p>}
    </div>
  )
}
