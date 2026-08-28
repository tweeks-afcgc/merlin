'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm() {
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      setNewPassword('')
      setConfirm('')
    }
  }

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6 mt-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Change password</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">Password updated successfully.</div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Confirm new password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            placeholder="Repeat password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-800 hover:bg-red-900 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
