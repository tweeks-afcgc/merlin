'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addClub, addClubTeam, updateClub, updateClubTeam, deleteClub, deleteClubTeam } from './actions'

type ClubTeam = { id: string; name: string }
type Club = { id: string; name: string; club_teams: ClubTeam[] }

function ConfirmDeleteModal({ message, onConfirm, onCancel, loading, error }: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Confirm delete</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClubRow({ club, defaultOpen }: { club: Club; defaultOpen: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)
  const [addingTeam, setAddingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [editingClub, setEditingClub] = useState(false)
  const [clubName, setClubName] = useState(club.name)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteClubTarget, setDeleteClubTarget] = useState(false)
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<ClubTeam | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  function refresh() { router.push('/admin/clubs') }

  async function handleSaveClub() {
    if (!clubName.trim()) return
    setSaving(true)
    const fd = new FormData(); fd.set('name', clubName.trim())
    await updateClub(club.id, fd)
    setEditingClub(false)
    setSaving(false)
    refresh()
  }

  async function handleAddTeam() {
    if (!newTeamName.trim()) return
    setSaving(true)
    const fd = new FormData(); fd.set('club_id', club.id); fd.set('name', newTeamName.trim())
    await addClubTeam(fd)
    setNewTeamName('')
    setAddingTeam(false)
    setSaving(false)
    refresh()
  }

  async function handleSaveTeam() {
    if (!editingTeamName.trim()) return
    setSaving(true)
    const fd = new FormData(); fd.set('name', editingTeamName.trim())
    await updateClubTeam(editingTeamId!, fd)
    setEditingTeamId(null)
    setSaving(false)
    refresh()
  }

  async function confirmDeleteClub() {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteClub(club.id)
    if (result?.error) { setDeleteError(result.error); setDeleting(false); return }
    setDeleteClubTarget(false)
    setDeleting(false)
    refresh()
  }

  async function confirmDeleteTeam() {
    if (!deleteTeamTarget) return
    setDeleting(true)
    setDeleteError(null)
    await deleteClubTeam(deleteTeamTarget.id)
    setDeleteTeamTarget(null)
    setDeleting(false)
    refresh()
  }

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      {/* Club header row */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50">
        {editingClub ? (
          <div className="flex items-center gap-2 flex-1 mr-3">
            <input
              autoFocus
              value={clubName}
              onChange={e => setClubName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveClub() } if (e.key === 'Escape') { setEditingClub(false); setClubName(club.name) } }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            />
            <button onClick={handleSaveClub} disabled={saving}
              className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 transition disabled:opacity-50">
              Save
            </button>
            <button onClick={() => { setEditingClub(false); setClubName(club.name) }}
              className="text-xs text-gray-400 hover:text-gray-600 px-1">
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 flex-1 text-left min-w-0">
            <span className="font-semibold text-gray-800 text-sm truncate">{club.name}</span>
            <span className="text-xs text-gray-400 shrink-0">
              {club.club_teams.length} team{club.club_teams.length !== 1 ? 's' : ''}
            </span>
            <span className="text-gray-400 text-xs shrink-0">{open ? '▲' : '▼'}</span>
          </button>
        )}

        {!editingClub && (
          <div className="flex items-center gap-3 ml-3 shrink-0">
            <button onClick={() => { setEditingClub(true); setOpen(true) }}
              className="text-xs text-gray-500 hover:text-gray-800 transition">
              Edit
            </button>
            <button onClick={() => { setAddingTeam(true); setOpen(true) }}
              className="text-xs text-red-800 hover:underline font-medium">
              + Team
            </button>
            <button onClick={() => { setDeleteClubTarget(true); setDeleteError(null) }}
              className="text-xs text-gray-400 hover:text-red-600 transition">
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {open && (
        <div className="bg-white divide-y divide-gray-50">
          {/* Add team inline */}
          {addingTeam && (
            <div className="flex gap-2 px-5 py-3">
              <input
                autoFocus
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="e.g. U12 Black"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTeam() } if (e.key === 'Escape') setAddingTeam(false) }}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
              <button onClick={handleAddTeam} disabled={saving}
                className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 transition disabled:opacity-50">
                Save
              </button>
              <button onClick={() => { setAddingTeam(false); setNewTeamName('') }}
                className="text-xs text-gray-400 hover:text-gray-600 px-1">
                Cancel
              </button>
            </div>
          )}

          {/* Team rows */}
          {club.club_teams.length === 0 && !addingTeam ? (
            <p className="px-5 py-3 text-xs text-gray-400">No teams — this club appears as a single opponent.</p>
          ) : (
            club.club_teams.map(team => (
              <div key={team.id} className="flex items-center justify-between px-5 py-2.5">
                {editingTeamId === team.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      value={editingTeamName}
                      onChange={e => setEditingTeamName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveTeam() } if (e.key === 'Escape') setEditingTeamId(null) }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                    />
                    <button onClick={handleSaveTeam} disabled={saving}
                      className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 transition disabled:opacity-50">
                      Save
                    </button>
                    <button onClick={() => setEditingTeamId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-1">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-gray-700">{team.name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setEditingTeamId(team.id); setEditingTeamName(team.name) }}
                        className="text-xs text-gray-500 hover:text-gray-800 transition">
                        Edit
                      </button>
                      <button onClick={() => { setDeleteTeamTarget(team); setDeleteError(null) }}
                        className="text-xs text-gray-400 hover:text-red-600 transition">
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {deleteClubTarget && (
        <ConfirmDeleteModal
          message={`Permanently delete "${club.name}" and all its teams? This cannot be undone.`}
          onConfirm={confirmDeleteClub}
          onCancel={() => { setDeleteClubTarget(false); setDeleteError(null) }}
          loading={deleting}
          error={deleteError}
        />
      )}
      {deleteTeamTarget && (
        <ConfirmDeleteModal
          message={`Remove "${deleteTeamTarget.name}" from ${club.name}?`}
          onConfirm={confirmDeleteTeam}
          onCancel={() => { setDeleteTeamTarget(null); setDeleteError(null) }}
          loading={deleting}
          error={deleteError}
        />
      )}
    </div>
  )
}

export default function ClubsClient({ clubs }: { clubs: Club[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [addClubOpen, setAddClubOpen] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const [addingClub, setAddingClub] = useState(false)
  const [addClubError, setAddClubError] = useState<string | null>(null)

  async function handleAddClub(e: React.FormEvent) {
    e.preventDefault()
    if (!newClubName.trim()) return
    setAddingClub(true)
    setAddClubError(null)
    const fd = new FormData(); fd.set('name', newClubName.trim())
    const result = await addClub(fd)
    if (result?.error) { setAddClubError(result.error); setAddingClub(false); return }
    setNewClubName('')
    setAddClubOpen(false)
    setAddingClub(false)
    router.push('/admin/clubs')
  }

  const q = query.toLowerCase().trim()
  const filtered = q
    ? clubs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.club_teams.some(t => t.name.toLowerCase().includes(q))
      )
    : clubs

  return (
    <div className="space-y-4">
      {/* Add club collapsible */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100">
        <button type="button" onClick={() => setAddClubOpen(o => !o)}
          className="w-full flex items-center justify-between px-6 py-4 text-left">
          <span className="text-base font-semibold text-gray-900">Add club</span>
          <span className="text-gray-400 text-lg leading-none">{addClubOpen ? '−' : '+'}</span>
        </button>
        {addClubOpen && (
          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
            {addClubError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-3">{addClubError}</div>
            )}
            <form onSubmit={handleAddClub} className="flex gap-3">
              <input
                autoFocus
                value={newClubName}
                onChange={e => setNewClubName(e.target.value)}
                required
                placeholder="e.g. Crayford Arrows"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
              <button type="button" onClick={() => { setAddClubOpen(false); setNewClubName(''); setAddClubError(null) }}
                className="border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                Cancel
              </button>
              <button type="submit" disabled={addingClub}
                className="bg-red-800 hover:bg-red-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60">
                {addingClub ? 'Adding…' : 'Add club'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search clubs and teams…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 bg-white shadow-sm"
      />

      {/* Club list */}
      {clubs.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No clubs added yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No clubs or teams match your search.</p>
      ) : (
        filtered.map(club => (
          <ClubRow key={club.id} club={club} defaultOpen={!!q} />
        ))
      )}
    </div>
  )
}
