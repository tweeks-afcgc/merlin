'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function RoleSelect({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string
  currentRole: string
  isSelf: boolean
}) {
  const [role, setRole] = useState(currentRole)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleChange(newRole: string) {
    setSaving(true)
    setRole(newRole)
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    setSaving(false)
    router.refresh()
  }

  if (isSelf) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        {role}
      </span>
    )
  }

  return (
    <select
      value={role}
      onChange={e => handleChange(e.target.value)}
      disabled={saving}
      className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
    >
      <option value="standard">Standard</option>
      <option value="admin">Admin</option>
    </select>
  )
}
