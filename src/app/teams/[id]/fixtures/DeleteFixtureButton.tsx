'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteFixture } from './actions'

export default function DeleteFixtureButton({
  fixtureId,
  teamId,
  returnTo,
  compact = false,
}: {
  fixtureId: string
  teamId: string
  returnTo: string
  compact?: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    await deleteFixture(fixtureId, teamId)
    const dest = returnTo.includes('?') ? `${returnTo}&deleted=1` : `${returnTo}?deleted=1`
    router.push(dest)
  }

  if (confirming) {
    if (compact) {
      return (
        <div className="inline-flex items-center gap-2 border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg">
          <span className="text-xs text-red-700 font-medium">Delete?</span>
          <button type="button" onClick={handleDelete} disabled={loading}
            className="text-xs font-semibold px-2 py-0.5 bg-red-700 text-white rounded hover:bg-red-800 transition disabled:opacity-50">
            {loading ? '…' : 'Yes'}
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>
      )
    }
    return (
      <div className="w-full mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-4 space-y-3">
        <p className="text-sm font-semibold text-red-800 text-center">Delete this fixture?</p>
        <p className="text-xs text-red-700 text-center">This cannot be undone.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 rounded-lg text-sm transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-red-700 hover:bg-red-800 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <button type="button" onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-red-200 transition">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
        Delete
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full mt-2 border border-red-200 text-red-700 hover:bg-red-50 font-semibold py-2.5 rounded-lg text-sm transition"
    >
      Delete fixture
    </button>
  )
}
