'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { confirmFixture, unconfirmFixture } from './actions'

export default function ConfirmToggle({
  fixtureId,
  confirmed,
  disabled,
}: {
  fixtureId: string
  confirmed: boolean
  disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handle() {
    setLoading(true)
    setError(null)
    const result = confirmed
      ? await unconfirmFixture(fixtureId)
      : await confirmFixture(fixtureId)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="text-right">
      <button
        onClick={handle}
        disabled={loading || disabled}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-40 ${
          confirmed
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-red-100 text-red-800 hover:bg-red-200'
        }`}
      >
        {loading ? '...' : confirmed ? 'Confirmed' : 'Confirm'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-48">{error}</p>}
    </div>
  )
}
