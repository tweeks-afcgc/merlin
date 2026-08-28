'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteFixture } from './actions'

export default function DeleteFixtureButton({
  fixtureId,
  teamId,
  returnTo,
}: {
  fixtureId: string
  teamId: string
  returnTo: string
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
