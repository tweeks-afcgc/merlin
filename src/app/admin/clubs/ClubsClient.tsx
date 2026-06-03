'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addClub, addClubTeam, updateClub, deleteClub, deleteClubTeam } from './actions'

type ClubTeam = { id: string; name: string }
type Club = { id: string; name: string; club_teams: ClubTeam[] }

export default function ClubsClient({ clubs }: { clubs: Club[] }) {
  const router = useRouter()
  const [addingTeamFor, setAddingTeamFor] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingClubId, setEditingClubId] = useState<string | null>(null)
  const [editingClubName, setEditingClubName] = useState('')

  async function handleAddClub(formData: FormData) {
    await addClub(formData)
    router.refresh()
  }

  async function handleAddTeam(clubId: string) {
    if (!teamName.trim()) return
    setSaving(true)
    const fd = new FormData()
    fd.set('club_id', clubId)
    fd.set('name', teamName.trim())
    await addClubTeam(fd)
    setTeamName('')
    setAddingTeamFor(null)
    setSaving(false)
    router.refresh()
  }

  async function handleSaveClub(clubId: string) {
    if (!editingClubName.trim()) return
    setSaving(true)
    const fd = new FormData()
    fd.set('name', editingClubName.trim())
    await updateClub(clubId, fd)
    setEditingClubId(null)
    setSaving(false)
    router.refresh()
  }

  async function handleDeleteClub(clubId: string) {
    if (!window.confirm('Delete this club and all its teams?')) return
    await deleteClub(clubId)
    router.refresh()
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm('Delete this team?')) return
    await deleteClubTeam(teamId)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Add club */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add club</h2>
        <form action={handleAddClub} className="flex gap-3">
          <input
            name="name"
            required
            placeholder="e.g. Crayford Arrows"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
          />
          <button
            type="submit"
            className="bg-red-800 hover:bg-red-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            Add club
          </button>
        </form>
      </div>

      {/* Clubs list */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Clubs</h2>
        {clubs.length === 0 ? (
          <p className="text-sm text-gray-400">No clubs added yet.</p>
        ) : (
          <div className="space-y-6">
            {clubs.map(club => (
              <div key={club.id}>
                <div className="flex items-center justify-between mb-2">
                  {/* Club name — inline edit */}
                  {editingClubId === club.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-3">
                      <input
                        autoFocus
                        value={editingClubName}
                        onChange={e => setEditingClubName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveClub(club.id) } if (e.key === 'Escape') setEditingClubId(null) }}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      />
                      <button
                        onClick={() => handleSaveClub(club.id)}
                        disabled={saving}
                        className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingClubId(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-semibold text-gray-900">{club.name}</h3>
                  )}

                  {editingClubId !== club.id && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setEditingClubId(club.id); setEditingClubName(club.name) }}
                        className="text-xs text-gray-500 hover:text-gray-800 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => { setAddingTeamFor(club.id); setTeamName('') }}
                        className="text-xs text-red-800 hover:underline font-medium"
                      >
                        + Add team
                      </button>
                      <button
                        onClick={() => handleDeleteClub(club.id)}
                        className="text-xs text-gray-400 hover:text-red-600 transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {/* Add team inline form */}
                {addingTeamFor === club.id && (
                  <div className="flex gap-2 mb-3">
                    <input
                      autoFocus
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="e.g. U12 Black"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTeam(club.id) } }}
                    />
                    <button
                      onClick={() => handleAddTeam(club.id)}
                      disabled={saving}
                      className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 transition disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setAddingTeamFor(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Teams list */}
                {club.club_teams.length > 0 ? (
                  <ul className="divide-y divide-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                    {club.club_teams.map(team => (
                      <li key={team.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                        <span className="text-sm text-gray-700">{team.name}</span>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="text-xs text-gray-400 hover:text-red-600 transition"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-400 pl-1">No teams added — this club will appear as a single opponent option.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
