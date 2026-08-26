'use client'

import { useState } from 'react'
import { addPlayer, updatePlayer, deletePlayer, addPlayerTeamSeason, updatePlayerTeamSeason, removePlayerTeamSeason } from './actions'

type TeamSeason = {
  id: string
  team_id: string
  season_id: string
  teamName: string
  seasonName: string
  player_number: number | null
}
type Player = { id: string; first_name: string; last_name: string; date_of_birth: string | null; teamSeasons: TeamSeason[] }
type Team = { id: string; displayName: string }
type Season = { id: string; name: string; is_current: boolean }

export default function PlayersClient({
  players: initial,
  teams,
  seasons,
}: {
  players: Player[]
  teams: Team[]
  seasons: Season[]
}) {
  const [players, setPlayers] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add player form
  const [addFirst, setAddFirst] = useState('')
  const [addLast, setAddLast] = useState('')
  const [addDob, setAddDob] = useState('')

  // Expanded player (shows team-season assignments)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Edit player
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFirst, setEditFirst] = useState('')
  const [editLast, setEditLast] = useState('')
  const [editDob, setEditDob] = useState('')

  // Inline edit assignment: key = assignment id
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editLinkTeamId, setEditLinkTeamId] = useState('')
  const [editLinkSeasonId, setEditLinkSeasonId] = useState('')
  const [editLinkNumber, setEditLinkNumber] = useState('')
  const [editLinkError, setEditLinkError] = useState<string | null>(null)
  const [editLinkSaving, setEditLinkSaving] = useState(false)

  // Add team-season link
  const currentSeason = seasons.find(s => s.is_current) ?? seasons[0]
  const [linkTeamId, setLinkTeamId] = useState<Record<string, string>>({})
  const [linkSeasonId, setLinkSeasonId] = useState<Record<string, string>>({})
  const [linkNumber, setLinkNumber] = useState<Record<string, string>>({})
  const [linkError, setLinkError] = useState<Record<string, string>>({})

  function initLink(playerId: string) {
    if (!linkTeamId[playerId]) setLinkTeamId(p => ({ ...p, [playerId]: teams[0]?.id ?? '' }))
    if (!linkSeasonId[playerId]) setLinkSeasonId(p => ({ ...p, [playerId]: currentSeason?.id ?? '' }))
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('first_name', addFirst)
    fd.set('last_name', addLast)
    fd.set('date_of_birth', addDob)
    const result = await addPlayer(fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    setAddFirst(''); setAddLast(''); setAddDob('')
    setSaving(false)
    window.location.reload()
  }

  async function handleUpdatePlayer(playerId: string) {
    setSaving(true)
    const fd = new FormData()
    fd.set('first_name', editFirst)
    fd.set('last_name', editLast)
    fd.set('date_of_birth', editDob)
    const result = await updatePlayer(playerId, fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    setPlayers(ps => ps.map(p => p.id === playerId ? { ...p, first_name: editFirst, last_name: editLast, date_of_birth: editDob || null } : p))
    setEditingId(null)
    setSaving(false)
  }

  async function handleDeletePlayer(playerId: string, name: string) {
    if (!window.confirm(`Delete ${name}? This will remove all their team assignments too.`)) return
    await deletePlayer(playerId)
    setPlayers(ps => ps.filter(p => p.id !== playerId))
  }

  async function handleAddLink(playerId: string) {
    const teamId = linkTeamId[playerId]
    const seasonId = linkSeasonId[playerId]
    if (!teamId || !seasonId) return
    const fd = new FormData()
    fd.set('team_id', teamId)
    fd.set('season_id', seasonId)
    fd.set('player_number', linkNumber[playerId] ?? '')
    const result = await addPlayerTeamSeason(playerId, fd)
    if (result?.error) { setLinkError(e => ({ ...e, [playerId]: result.error! })); return }
    setLinkError(e => ({ ...e, [playerId]: '' }))
    const team = teams.find(t => t.id === teamId)
    const season = seasons.find(s => s.id === seasonId)
    const numRaw = (linkNumber[playerId] ?? '').trim()
    const newLink: TeamSeason = {
      id: crypto.randomUUID(),
      team_id: teamId,
      season_id: seasonId,
      teamName: team?.displayName ?? '—',
      seasonName: season?.name ?? '—',
      player_number: numRaw ? parseInt(numRaw) : null,
    }
    setPlayers(ps => ps.map(p => p.id === playerId ? { ...p, teamSeasons: [...p.teamSeasons, newLink] } : p))
    setLinkNumber(n => ({ ...n, [playerId]: '' }))
  }

  function startEditLink(ts: TeamSeason) {
    setEditingLinkId(ts.id)
    setEditLinkTeamId(ts.team_id)
    setEditLinkSeasonId(ts.season_id)
    setEditLinkNumber(ts.player_number != null ? String(ts.player_number) : '')
    setEditLinkError(null)
  }

  async function handleUpdateLink(playerId: string) {
    if (!editingLinkId) return
    setEditLinkSaving(true)
    setEditLinkError(null)
    const fd = new FormData()
    fd.set('team_id', editLinkTeamId)
    fd.set('season_id', editLinkSeasonId)
    fd.set('player_number', editLinkNumber)
    const result = await updatePlayerTeamSeason(editingLinkId, fd)
    if (result?.error) { setEditLinkError(result.error); setEditLinkSaving(false); return }
    const team = teams.find(t => t.id === editLinkTeamId)
    const season = seasons.find(s => s.id === editLinkSeasonId)
    const num = editLinkNumber.trim() ? parseInt(editLinkNumber) : null
    setPlayers(ps => ps.map(p => p.id === playerId ? {
      ...p,
      teamSeasons: p.teamSeasons.map(ts => ts.id === editingLinkId ? {
        ...ts,
        team_id: editLinkTeamId,
        season_id: editLinkSeasonId,
        teamName: team?.displayName ?? ts.teamName,
        seasonName: season?.name ?? ts.seasonName,
        player_number: num,
      } : ts),
    } : p))
    setEditingLinkId(null)
    setEditLinkSaving(false)
  }

  async function handleRemoveLink(playerId: string, linkId: string) {
    await removePlayerTeamSeason(linkId)
    setPlayers(ps => ps.map(p => p.id === playerId ? { ...p, teamSeasons: p.teamSeasons.filter(ts => ts.id !== linkId) } : p))
    if (editingLinkId === linkId) setEditingLinkId(null)
  }

  const sortedPlayers = [...players].sort((a, b) =>
    `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
  )

  function formatDob(dob: string | null) {
    if (!dob) return null
    return new Date(dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Add player */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add player</h2>
        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
        <form onSubmit={handleAddPlayer} className="space-y-3">
          <div className="flex gap-3">
            <input
              value={addFirst} onChange={e => setAddFirst(e.target.value)}
              placeholder="First name" required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            />
            <input
              value={addLast} onChange={e => setAddLast(e.target.value)}
              placeholder="Last name" required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Date of birth</label>
              <input
                type="date" value={addDob} onChange={e => setAddDob(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving}
                className="bg-red-800 hover:bg-red-900 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60">
                Add player
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Players list */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Players ({players.length})</h2>
        {sortedPlayers.length === 0 ? (
          <p className="text-sm text-gray-400">No players added yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {sortedPlayers.map(player => {
              const fullName = `${player.first_name} ${player.last_name}`
              const isExpanded = expandedId === player.id
              const isEditing = editingId === player.id

              return (
                <div key={player.id}>
                  {/* Player row */}
                  <div className="py-3 flex items-center justify-between gap-4">
                    {isEditing ? (
                      <div className="flex-1 flex flex-wrap gap-2">
                        <input value={editFirst} onChange={e => setEditFirst(e.target.value)}
                          placeholder="First name"
                          className="flex-1 min-w-[8rem] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                        <input value={editLast} onChange={e => setEditLast(e.target.value)}
                          placeholder="Last name"
                          className="flex-1 min-w-[8rem] border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                        <input type="date" value={editDob} onChange={e => setEditDob(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                        <button onClick={() => handleUpdatePlayer(player.id)} disabled={saving}
                          className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 disabled:opacity-50">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{fullName}</p>
                          {player.date_of_birth && (
                            <p className="text-xs text-gray-400">b. {formatDob(player.date_of_birth)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <button
                            onClick={() => {
                              initLink(player.id)
                              setExpandedId(isExpanded ? null : player.id)
                              setEditingLinkId(null)
                            }}
                            className="text-xs text-red-800 hover:underline font-medium"
                          >
                            {isExpanded ? 'Hide' : `Teams (${player.teamSeasons.length})`}
                          </button>
                          <button onClick={() => {
                            setEditingId(player.id)
                            setEditFirst(player.first_name)
                            setEditLast(player.last_name)
                            setEditDob(player.date_of_birth ?? '')
                            setExpandedId(null)
                          }}
                            className="text-xs text-gray-500 hover:text-gray-800 transition">
                            Edit
                          </button>
                          <button onClick={() => handleDeletePlayer(player.id, fullName)}
                            className="text-xs text-gray-400 hover:text-red-600 transition">
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Expanded — team-season links */}
                  {isExpanded && !isEditing && (
                    <div className="pb-4 pl-3 space-y-3">
                      {/* Existing links */}
                      {player.teamSeasons.length > 0 ? (
                        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden mb-3">
                          {[...player.teamSeasons]
                            .sort((a, b) => a.seasonName.localeCompare(b.seasonName) || a.teamName.localeCompare(b.teamName))
                            .map(ts => {
                              const isEditingThis = editingLinkId === ts.id
                              return (
                                <li key={ts.id} className="bg-gray-50">
                                  {isEditingThis ? (
                                    <div className="px-4 py-3 space-y-2">
                                      <div className="flex flex-wrap gap-2 items-end">
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">Season</label>
                                          <select
                                            value={editLinkSeasonId}
                                            onChange={e => setEditLinkSeasonId(e.target.value)}
                                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                                          >
                                            {seasons.map(s => (
                                              <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">Team</label>
                                          <select
                                            value={editLinkTeamId}
                                            onChange={e => setEditLinkTeamId(e.target.value)}
                                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                                          >
                                            {teams.map(t => (
                                              <option key={t.id} value={t.id}>{t.displayName}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">Shirt #</label>
                                          <input
                                            type="number" min={1} max={99}
                                            value={editLinkNumber}
                                            onChange={e => setEditLinkNumber(e.target.value)}
                                            placeholder="—"
                                            className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleUpdateLink(player.id)}
                                            disabled={editLinkSaving}
                                            className="bg-red-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-red-900 disabled:opacity-50"
                                          >
                                            {editLinkSaving ? 'Saving…' : 'Save'}
                                          </button>
                                          <button
                                            onClick={() => setEditingLinkId(null)}
                                            className="text-xs text-gray-400 hover:text-gray-600 px-2"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                      {editLinkError && <p className="text-xs text-red-600">{editLinkError}</p>}
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between px-4 py-2.5">
                                      <div>
                                        <p className="text-sm text-gray-800 font-medium">
                                          {ts.teamName}
                                          {ts.player_number != null && (
                                            <span className="ml-2 text-xs font-semibold text-gray-400">#{ts.player_number}</span>
                                          )}
                                        </p>
                                        <p className="text-xs text-gray-400">{ts.seasonName}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={() => startEditLink(ts)}
                                          className="text-xs text-gray-500 hover:text-gray-800 transition"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleRemoveLink(player.id, ts.id)}
                                          className="text-xs text-gray-400 hover:text-red-600 transition"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </li>
                              )
                            })}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400">No team assignments yet.</p>
                      )}

                      {/* Add link */}
                      <div className="flex flex-wrap gap-2 items-end">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Season</label>
                          <select
                            value={linkSeasonId[player.id] ?? currentSeason?.id ?? ''}
                            onChange={e => setLinkSeasonId(p => ({ ...p, [player.id]: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                          >
                            {seasons.map(s => (
                              <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Team</label>
                          <select
                            value={linkTeamId[player.id] ?? teams[0]?.id ?? ''}
                            onChange={e => setLinkTeamId(p => ({ ...p, [player.id]: e.target.value }))}
                            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                          >
                            {teams.map(t => (
                              <option key={t.id} value={t.id}>{t.displayName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Shirt #</label>
                          <input
                            type="number" min={1} max={99}
                            value={linkNumber[player.id] ?? ''}
                            onChange={e => setLinkNumber(n => ({ ...n, [player.id]: e.target.value }))}
                            placeholder="—"
                            className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                          />
                        </div>
                        <button
                          onClick={() => handleAddLink(player.id)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-1.5 rounded-lg text-sm transition"
                        >
                          + Add
                        </button>
                      </div>
                      {linkError[player.id] && (
                        <p className="text-xs text-red-600">{linkError[player.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
