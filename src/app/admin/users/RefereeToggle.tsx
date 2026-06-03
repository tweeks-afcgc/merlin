'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RefereeToggle({
  userId,
  isReferee,
}: {
  userId: string
  isReferee: boolean
}) {
  const [value, setValue] = useState(isReferee)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleToggle() {
    setSaving(true)
    const next = !value
    setValue(next)
    await supabase.from('profiles').update({ is_referee: next }).eq('id', userId)
    setSaving(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleToggle}
      disabled={saving}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition disabled:opacity-50 ${
        value
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {saving ? '…' : value ? 'Yes' : 'No'}
    </button>
  )
}
