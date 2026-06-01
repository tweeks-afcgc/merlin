'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Profile = { id: string; full_name: string | null; email: string | null }

export default function EditTeamPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'senior' | 'junior'>('senior')
  const [name, setName] = useState('')
  const [foundingAgeGroup, setFoundingAgeGroup] = useState('')
  const [foundingSeasonName, setFoundingSeasonName] = useState('')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set())
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: team }, { data: users }, { data: managers }] = await Promise.all([
        supabase.from('teams').select('*').eq('id', id).single(),
        supabase.from('profiles').select('id, full_name, email').order('full_name'),
        supabase.from('team_managers').select('user_id').eq('team_id', id),
      ])

      if (!team) { router.push('/admin/teams'); return }

      setType(team.type)
      setName(team.name)
      setFoundingAgeGroup(team.founding_age_group?.toString() ?? '')
      setAllUsers(users ?? [])
      setManagerIds(new Set((managers ?? []).map((m: { user_id: string }) => m.user_id)))

      if (team.founding_season_id) {
        const { data: season } = await supabase
          .from('seasons').select('name').eq('id', team.founding_season_id).single()
        setFoundingSeasonName(season?.name ?? '')
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = { name }
    if (type === 'junior') updates.founding_age_group = parseInt(foundingAgeGroup)

    const { error } = await supabase.from('teams').update(updates).eq('id', id)

    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/admin/teams')
    }
  }

  async function toggleManager(userId: string) {
    setTogglingId(userId)
    if (managerIds.has(userId)) {
      await supabase.from('team_managers').delete().eq('team_id', id).eq('user_id', userId)
      setManagerIds(prev => { const next = new Set(prev); next.delete(userId); return next })
    } else {
      await supabase.from('team_managers').insert({ team_id: id, user_id: userId })
      setManagerIds(prev => new Set(prev).add(userId))
    }
    setTogglingId(null)
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-green-700">Merlin</h1>
          <Link href="/admin/teams" className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </Link>
        </div>

        {/* Team details */}
        <div className="bg-white shadow rounded-xl p-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Edit team</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {type === 'junior' ? 'Team nickname' : 'Team name'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {type === 'junior' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age group in {foundingSeasonName || 'founding season'}
                </label>
                <input
                  type="number"
                  min={5}
                  max={18}
                  required
                  value={foundingAgeGroup}
                  onChange={e => setFoundingAgeGroup(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Age group in the founding season — all other seasons are calculated from this.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>

        {/* Managers */}
        <div className="bg-white shadow rounded-xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Managers</h2>
          <p className="text-sm text-gray-400 mb-5">Select one or more managers for this team.</p>

          <ul className="divide-y divide-gray-50">
            {allUsers.map(user => {
              const isManager = managerIds.has(user.id)
              const isToggling = togglingId === user.id
              return (
                <li key={user.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.full_name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{user.email ?? ''}</p>
                  </div>
                  <button
                    onClick={() => toggleManager(user.id)}
                    disabled={isToggling}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full transition disabled:opacity-50 ${
                      isManager
                        ? 'bg-green-100 text-green-800 hover:bg-red-100 hover:text-red-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800'
                    }`}
                  >
                    {isToggling ? '…' : isManager ? 'Manager' : 'Add'}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </main>
  )
}
