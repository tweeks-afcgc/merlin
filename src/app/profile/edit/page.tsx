'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signin'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, dob').eq('id', user.id).single()

      if (profile) {
        setFullName(profile.full_name ?? '')
        setDob(profile.dob ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signin'); return }

    const { error } = await supabase
      .from('profiles').update({ full_name: fullName, dob: dob || null }).eq('id', user.id)

    if (error) { setError(error.message); setSaving(false) }
    else router.push('/profile')
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit profile</h1>

        {loading ? (
          <p className="text-sm text-gray-400">Loadingâ€¦</p>
        ) : (
          <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
              )}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  id="full_name" type="text" required
                  value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
              <div>
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                <input
                  id="dob" type="date"
                  value={dob} onChange={e => setDob(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={() => router.push('/profile')}
                  className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 bg-red-800 hover:bg-red-900 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
                >
                  {saving ? 'Savingâ€¦' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  )
}

