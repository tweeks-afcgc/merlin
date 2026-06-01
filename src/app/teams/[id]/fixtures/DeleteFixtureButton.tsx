'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteFixture } from './actions'

export default function DeleteFixtureButton({ fixtureId, teamId }: { fixtureId: string; teamId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    if (!window.confirm('Delete this fixture?')) return
    setLoading(true)
    await deleteFixture(fixtureId, teamId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-xs text-gray-400 hover:text-red-600 transition disabled:opacity-50"
    >
      {loading ? '...' : 'Delete'}
    </button>
  )
}
