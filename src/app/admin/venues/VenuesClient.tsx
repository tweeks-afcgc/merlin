'use client'

import { useState } from 'react'
import { addVenue, deleteVenue, addPitch, deletePitch } from './actions'

type Pitch = { id: string; name: string }
type Venue = { id: string; name: string; pitches: Pitch[] }

export default function VenuesClient({ venues: initial }: { venues: Venue[] }) {
  const [venues, setVenues] = useState(initial)
  const [venueName, setVenueName] = useState('')
  const [pitchNames, setPitchNames] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  async function handleAddVenue(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData()
    fd.set('name', venueName)
    await addVenue(fd)
    setVenueName('')
    setSaving(false)
    window.location.reload()
  }

  async function handleDeleteVenue(id: string) {
    if (!window.confirm('Delete this venue and all its pitches?')) return
    await deleteVenue(id)
    setVenues(v => v.filter(x => x.id !== id))
  }

  async function handleAddPitch(venueId: string, e: React.FormEvent) {
    e.preventDefault()
    const name = pitchNames[venueId] ?? ''
    if (!name.trim()) return
    const fd = new FormData()
    fd.set('name', name)
    await addPitch(venueId, fd)
    setPitchNames(p => ({ ...p, [venueId]: '' }))
    window.location.reload()
  }

  async function handleDeletePitch(id: string, venueId: string) {
    if (!window.confirm('Delete this pitch?')) return
    await deletePitch(id)
    setVenues(v => v.map(venue =>
      venue.id === venueId
        ? { ...venue, pitches: venue.pitches.filter(p => p.id !== id) }
        : venue
    ))
  }

  return (
    <div className="space-y-6">
      {/* Add venue */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Add venue</h2>
        <form onSubmit={handleAddVenue} className="flex gap-3">
          <input
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            placeholder="e.g. Flamingo Park"
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-red-800 hover:bg-red-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60"
          >
            Add venue
          </button>
        </form>
      </div>

      {/* Venue list */}
      {venues.length === 0 ? (
        <p className="text-sm text-gray-400">No venues added yet.</p>
      ) : (
        venues.map(venue => (
          <div key={venue.id} className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">{venue.name}</h3>
              <button
                onClick={() => handleDeleteVenue(venue.id)}
                className="text-xs text-gray-400 hover:text-red-600 transition"
              >
                Delete venue
              </button>
            </div>

            {/* Pitches */}
            {venue.pitches.length > 0 && (
              <ul className="mb-4 divide-y divide-gray-50">
                {venue.pitches.map(pitch => (
                  <li key={pitch.id} className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-700">{pitch.name}</span>
                    <button
                      onClick={() => handleDeletePitch(pitch.id, venue.id)}
                      className="text-xs text-gray-400 hover:text-red-600 transition"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add pitch */}
            <form onSubmit={e => handleAddPitch(venue.id, e)} className="flex gap-3 mt-2">
              <input
                value={pitchNames[venue.id] ?? ''}
                onChange={e => setPitchNames(p => ({ ...p, [venue.id]: e.target.value }))}
                placeholder="e.g. Pitch 1"
                required
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
              />
              <button
                type="submit"
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition"
              >
                + Add pitch
              </button>
            </form>
          </div>
        ))
      )}
    </div>
  )
}
