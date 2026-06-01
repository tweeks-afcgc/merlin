'use client'

import { useState } from 'react'
import { addTeam } from './actions'
import { useRouter } from 'next/navigation'

export default function AddTeamForm() {
  const [type, setType] = useState<'senior' | 'junior'>('senior')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const formData = new FormData(e.currentTarget)
    const result = await addTeam(formData)
    if (result?.error) {
      setError(result.error)
    } else {
      (e.target as HTMLFormElement).reset()
      setType('senior')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white shadow rounded-xl p-6 mb-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Add team</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select
              name="type"
              value={type}
              onChange={e => setType(e.target.value as 'senior' | 'junior')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="senior">Senior</option>
              <option value="junior">Junior</option>
            </select>
          </div>

          {type === 'junior' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Current age group (e.g. 12 for U12)
                </label>
                <input
                  name="age_group"
                  type="number"
                  min={5}
                  max={18}
                  required
                  placeholder="12"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Team nickname (e.g. Knights)
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Knights"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Team name</label>
              <input
                name="name"
                type="text"
                required
                placeholder="First XI"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
        >
          {loading ? 'Adding…' : 'Add team'}
        </button>
      </form>
    </div>
  )
}
