'use client'

import { useState } from 'react'
import { setCurrentSeason } from './actions'
import { useRouter } from 'next/navigation'

export function SetCurrentButton({ seasonId, isCurrent }: { seasonId: string; isCurrent: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (isCurrent) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-900">
        Current
      </span>
    )
  }

  async function handle() {
    const confirmed = window.confirm(
      'Setting this as the current season will increment the age group of all junior teams by 1. Continue?'
    )
    if (!confirmed) return
    setLoading(true)
    await setCurrentSeason(seasonId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="text-sm text-red-800 hover:underline disabled:opacity-50"
    >
      {loading ? 'Settingâ€¦' : 'Set as current'}
    </button>
  )
}

