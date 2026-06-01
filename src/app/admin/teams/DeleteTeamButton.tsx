'use client'

import { useState } from 'react'
import { deleteTeam } from './actions'
import { useRouter } from 'next/navigation'

export function DeleteTeamButton({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handle() {
    if (!window.confirm('Delete this team?')) return
    setLoading(true)
    await deleteTeam(teamId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-sm text-red-500 hover:underline disabled:opacity-50"
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
