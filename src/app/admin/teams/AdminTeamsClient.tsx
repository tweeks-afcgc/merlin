'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addTeam, deleteTeam } from './actions'

type Season = { id: string; name: string; start_date: string; is_current: boolean }
type Team = {
  id: string
  name: string
  type: string
  founding_age_group: number | null
  founding_season_id: string | null
  age_group: number | null
  display_name: string
}

type Props = {
  teams: Team[]
  seasons: Season[]
  currentSeason: Season | null
}

function ConfirmDeleteModal({ teamName, onConfirm, onCancel, loading, error }: {
  teamName: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete team?</h3>
        <p className="text-sm text-gray-600 mb-4">
          This will permanently delete <strong>{teamName}</strong> along with all their fixtures, player records, and competition data. This cannot be undone.
        </p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTeamForm({ currentSeason, seasons, onAdded }: { currentSeason: Season | null; seasons: Season[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<'senior' | 'junior'>('senior')
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData()
    fd.set('type', type)
    fd.set('name', name.trim())
    fd.set('gender', gender)
    if (type === 'junior') {
      fd.set('age_group', ageGroup)
      fd.set('founding_season_id', currentSeason?.id ?? '')
    }
    const result = await addTeam(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    // Reset all fields
    setName('')
    setAgeGroup('')
    setGender('')
    setType('senior')
    setError(null)
    setLoading(false)
    setOpen(false)
    onAdded()
  }

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 mb-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-base font-semibold text-gray-900">Add team</span>
        <span className="text-gray-400 text-lg leading-none">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 pt-4">
          {!currentSeason && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-3 mb-4">
              No current season set. Please set a current season before adding junior teams.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={type}
                  onChange={e => { setType(e.target.value as 'senior' | 'junior'); setName(''); setAgeGroup('') }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                >
                  <option value="senior">Senior</option>
                  <option value="junior">Junior</option>
                </select>
              </div>
              {type === 'junior' ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Age in {currentSeason?.name ?? 'current season'} (e.g. 12 for U12)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={18}
                    required
                    value={ageGroup}
                    onChange={e => setAgeGroup(e.target.value)}
                    placeholder="12"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Team name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="First XI"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
              )}
              {type === 'junior' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Team nickname (e.g. Knights)</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Knights"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              >
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null) }}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (type === 'junior' && !currentSeason)}
                className="flex-1 bg-red-800 hover:bg-red-900 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
              >
                {loading ? 'Adding…' : 'Add team'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function TeamGroup({ label, teams, expanded, onToggle }: {
  label: string
  teams: Team[]
  expanded: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteTeam(deleteTarget.id)
    if (result?.error) {
      setDeleteError(result.error)
      setDeleting(false)
      return
    }
    setDeleteTarget(null)
    setDeleting(false)
    router.push('/admin/teams')
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition text-left"
      >
        <span className="font-semibold text-gray-800 text-sm">{label}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{teams.length} team{teams.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
        </span>
      </button>

      {expanded && (
        <div className="divide-y divide-gray-50 bg-white">
          {teams.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">No teams.</p>
          ) : (
            teams.map(team => (
              <div key={team.id} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-gray-900">{team.display_name}</span>
                <div className="flex items-center gap-4">
                  <Link href={`/teams/${team.id}/fixtures`} className="text-xs text-gray-400 hover:text-gray-700 hover:underline">Fixtures</Link>
                  <Link href={`/admin/teams/${team.id}/edit`} className="text-xs text-red-800 hover:underline">Edit</Link>
                  <button
                    type="button"
                    onClick={() => { setDeleteTarget(team); setDeleteError(null) }}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          teamName={deleteTarget.display_name}
          onConfirm={confirmDelete}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null) }}
          loading={deleting}
          error={deleteError}
        />
      )}
    </div>
  )
}

export default function AdminTeamsClient({ teams, seasons, currentSeason }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Senior: true, Junior: true })

  function toggleGroup(label: string) {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const q = query.toLowerCase().trim()
  const filtered = q ? teams.filter(t => t.display_name.toLowerCase().includes(q)) : teams

  const seniors = filtered.filter(t => t.type === 'senior')
  const juniors = filtered.filter(t => t.type === 'junior')

  // When search active, auto-expand groups that have results
  const seniorExpanded = q ? seniors.length > 0 : (expandedGroups['Senior'] ?? true)
  const juniorExpanded = q ? juniors.length > 0 : (expandedGroups['Junior'] ?? true)

  return (
    <>
      <AddTeamForm
        currentSeason={currentSeason}
        seasons={seasons}
        onAdded={() => router.push('/admin/teams')}
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search teams…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 bg-white shadow-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No teams match your search.</p>
      ) : (
        <>
          <TeamGroup
            label="Senior"
            teams={seniors}
            expanded={seniorExpanded}
            onToggle={() => toggleGroup('Senior')}
          />
          <TeamGroup
            label="Junior"
            teams={juniors}
            expanded={juniorExpanded}
            onToggle={() => toggleGroup('Junior')}
          />
        </>
      )}
    </>
  )
}
