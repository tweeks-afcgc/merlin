'use client'

import { useState } from 'react'
import { deleteTeam } from './actions'
import { useRouter } from 'next/navigation'

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const [error, setError] = useState<string | null>(null)

  async function handle() {
    if (!window.confirm('Delete this team?')) return
    setLoading(true)
    setError(null)
    const result = await deleteTeam(teamId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        onClick={handle}
        disabled={loading}
        className="text-sm text-red-500 hover:underline disabled:opacity-50"
      >
        {loading ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span className="text-xs text-red-600 max-w-xs text-right">{error}</span>}
    </span>
  )
}
