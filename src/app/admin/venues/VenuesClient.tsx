'use client'

import { useState } from 'react'
import { addVenue, deleteVenue, addPitch, setPitchActive, updateVenue } from './actions'

type Pitch = { id: string; name: string; pitch_type: string; is_active: boolean }
type Venue = { id: string; name: string; address: string | null; pitches: Pitch[] }

export default function VenuesClient({ venues: initial }: { venues: Venue[] }) {
  const [venues, setVenues] = useState(initial)
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [pitchNames, setPitchNames] = useState<Record<string, string>>({})
  const [pitchTypes, setPitchTypes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-venue edit state
  const [editing, setEditing] = useState<Record<string, { name: string; address: string }>>({})
  const [editSaving, setEditSaving] = useState<Record<string, boolean>>({})

  async function handleAddVenue(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('name', venueName)
    fd.set('address', venueAddress)
    const result = await addVenue(fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    setVenueName('')
    setVenueAddress('')
    setSaving(false)
    window.location.reload()
  }

  async function handleDeleteVenue(id: string) {
    if (!window.confirm('Delete this venue and all its pitches?')) return
    await deleteVenue(id)
    setVenues(v => v.filter(x => x.id !== id))
  }

  function startEdit(venue: Venue) {
    setEditing(e => ({ ...e, [venue.id]: { name: venue.name, address: venue.address ?? '' } }))
  }

  function cancelEdit(id: string) {
    setEditing(e => { const next = { ...e }; delete next[id]; return next })
  }

  async function handleSaveEdit(id: string, e: React.FormEvent) {
    e.preventDefault()
    const vals = editing[id]
    if (!vals) return
    setEditSaving(s => ({ ...s, [id]: true }))
    const fd = new FormData()
    fd.set('name', vals.name)
    fd.set('address', vals.address)
    const result = await updateVenue(id, fd)
    if (result?.error) { alert(result.error); setEditSaving(s => ({ ...s, [id]: false })); return }
    setVenues(v => v.map(venue => venue.id === id ? { ...venue, name: vals.name, address: vals.address || null } : venue))
    setEditSaving(s => ({ ...s, [id]: false }))
    cancelEdit(id)
  }

  async function handleAddPitch(venueId: string, e: React.FormEvent) {
    e.preventDefault()
    const name = pitchNames[venueId] ?? ''
    if (!name.trim()) return
    const fd = new FormData()
    fd.set('name', name)
    fd.set('pitch_type', pitchTypes[venueId] ?? 'grass')
    await addPitch(venueId, fd)
    setPitchNames(p => ({ ...p, [venueId]: '' }))
    setPitchTypes(p => ({ ...p, [venueId]: 'grass' }))
    window.location.reload()
  }

  async function handleSetPitchActive(id: string, venueId: string, isActive: boolean) {
    await setPitchActive(id, isActive)
    setVenues(v => v.map(venue =>
      venue.id === venueId
        ? { ...venue, pitches: venue.pitches.map(p => p.id === id ? { ...p, is_active: isActive } : p) }
        : venue
    ))
  }

  return (
    <div className="space-y-6">
      {/* Add venue */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add venue</h2>
        {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
        <form onSubmit={handleAddVenue} className="space-y-3">
          <div className="flex gap-3">
            <input
              value={venueName}
              onChange={e => setVenueName(e.target.value)}
              placeholder="Venue name e.g. Flamingo Park"
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            />
          </div>
          <div className="flex gap-3">
            <input
              value={venueAddress}
              onChange={e => setVenueAddress(e.target.value)}
              placeholder="Address (optional)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-red-800 hover:bg-red-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60 whitespace-nowrap"
            >
              Add venue
            </button>
          </div>
        </form>
      </div>

      {/* Venue list */}
      {venues.length === 0 ? (
        <p className="text-sm text-gray-400">No venues added yet.</p>
      ) : (
        venues.map(venue => {
          const isEditing = !!editing[venue.id]
          const editVals = editing[venue.id]

          return (
            <div key={venue.id} className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
              {isEditing ? (
                <form onSubmit={e => handleSaveEdit(venue.id, e)} className="space-y-3 mb-4">
                  <input
                    value={editVals.name}
                    onChange={e => setEditing(ed => ({ ...ed, [venue.id]: { ...ed[venue.id], name: e.target.value } }))}
                    required
                    placeholder="Venue name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                  <input
                    value={editVals.address}
                    onChange={e => setEditing(ed => ({ ...ed, [venue.id]: { ...ed[venue.id], address: e.target.value } }))}
                    placeholder="Address (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={editSaving[venue.id]} className="bg-red-800 hover:bg-red-900 text-white font-semibold px-4 py-1.5 rounded-lg text-sm transition disabled:opacity-60">
                      Save
                    </button>
                    <button type="button" onClick={() => cancelEdit(venue.id)} className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-1.5 rounded-lg text-sm transition">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{venue.name}</h3>
                    {venue.address && <p className="text-xs text-gray-400 mt-0.5">{venue.address}</p>}
                  </div>
                  <div className="flex gap-3 flex-shrink-0 ml-4">
                    <button onClick={() => startEdit(venue)} className="text-xs text-gray-400 hover:text-gray-700 transition">Edit</button>
                    <button onClick={() => handleDeleteVenue(venue.id)} className="text-xs text-gray-400 hover:text-red-600 transition">Delete</button>
                  </div>
                </div>
              )}

              {/* Pitches */}
              {venue.pitches.length > 0 && (
                <ul className="mb-4 divide-y divide-gray-50">
                  {venue.pitches.map(pitch => (
                    <li key={pitch.id} className={`flex items-center justify-between py-2 ${!pitch.is_active ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${pitch.is_active ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{pitch.name}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${pitch.pitch_type === '3g' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {pitch.pitch_type === '3g' ? '3G' : 'Grass'}
                        </span>
                        {!pitch.is_active && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-400">
                            Retired
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleSetPitchActive(pitch.id, venue.id, !pitch.is_active)}
                        className={`text-xs transition ${pitch.is_active ? 'text-gray-400 hover:text-amber-600' : 'text-gray-400 hover:text-green-700'}`}
                      >
                        {pitch.is_active ? 'Retire' : 'Reactivate'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add pitch */}
              <form onSubmit={e => handleAddPitch(venue.id, e)} className="flex gap-2 mt-2">
                <input
                  value={pitchNames[venue.id] ?? ''}
                  onChange={e => setPitchNames(p => ({ ...p, [venue.id]: e.target.value }))}
                  placeholder="e.g. Pitch 1"
                  required
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                />
                <select
                  value={pitchTypes[venue.id] ?? 'grass'}
                  onChange={e => setPitchTypes(p => ({ ...p, [venue.id]: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                >
                  <option value="grass">Grass</option>
                  <option value="3g">3G</option>
                </select>
                <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition whitespace-nowrap">
                  + Add pitch
                </button>
              </form>
            </div>
          )
        })
      )}
    </div>
  )
}
