'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteReview } from './actions'

export default function DeleteReviewButton({ reviewId, type }: { reviewId: string; type: 'referee' | 'manager' }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteReview(reviewId, type)
    if (result?.error) {
      setDeleting(false)
      setConfirming(false)
      alert(result.error)
      return
    }
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-700 text-white hover:bg-red-800 transition disabled:opacity-50"
        >
          {deleting ? '…' : 'Delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:text-gray-600 px-1"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-700 transition flex-shrink-0"
    >
      Delete
    </button>
  )
}
