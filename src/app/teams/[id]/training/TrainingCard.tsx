'use client'

import { useState } from 'react'
import { addTrainingSlot, deleteTrainingSlot } from './actions'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type Slot = {
  id: string
  day_of_week: string
  frequency: string
  start_time: string
  end_time: string
  venue_id: string | null
  venueName: string | null
  notes: string | null
}

type Venue = { id: string; name: string }

function formatTime(t: string) {
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

export default function TrainingCard({
  teamId,
  slots: initialSlots,
  venues,
  isAdmin,
}: {
  teamId: string
  slots: Slot[]
  venues: Venue[]
  isAdmin: boolean
}) {
  const [open, setOpen] = useState(false)
  const [slots, setSlots] = useState(initialSlots)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [day, setDay] = useState('Monday')
  const [frequency, setFrequency] = useState('weekly')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '')
  const [notes, setNotes] = useState('')

  const sorted = [...slots].sort((a, b) =>
    DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  )

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!startTime || !endTime) { setError('Start and end time are required'); return }
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.set('day_of_week', day)
    fd.set('frequency', frequency)
    fd.set('start_time', startTime)
    fd.set('end_time', endTime)
    fd.set('venue_id', venueId)
    fd.set('notes', notes)
    const result = await addTrainingSlot(teamId, fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    // Reload via server revalidation — simplest approach for server-rendered slots
    setSaving(false)
    setShowForm(false)
    setStartTime('')
    setEndTime('')
    setNotes('')
    window.location.reload()
  }

  async function handleDelete(slotId: string) {
    await deleteTrainingSlot(slotId, teamId)
    setSlots(prev => prev.filter(s => s.id !== slotId))
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-4">
      {/* Header — clickable to expand/collapse */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-left flex-1 group"
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-0' : '-rotate-90'}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition">
            Training schedule
            {!open && slots.length > 0 && (
              <span className="ml-2 font-normal text-gray-400 text-xs">{slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
            )}
          </h2>
        </button>
        {isAdmin && open && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs font-semibold text-red-800 hover:underline flex items-center gap-1 flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add slot
          </button>
        )}
      </div>

      {open && showForm && (
        <form onSubmit={handleAdd} className="px-5 py-4 border-b border-gray-50 space-y-4 bg-gray-50">
          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Day</label>
              <select value={day} onChange={e => setDay(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End time</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Venue</label>
            <select value={venueId} onChange={e => setVenueId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
              <option value="">No venue</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes <span className="font-normal text-gray-400">(optional — e.g. which pitch or area)</span></label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bottom pitch"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="bg-red-800 hover:bg-red-900 text-white font-semibold px-5 py-2 rounded-lg text-sm transition disabled:opacity-60">
              {saving ? 'Saving…' : 'Add slot'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(null) }}
              className="border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold px-4 py-2 rounded-lg text-sm transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {open && sorted.length === 0 && (
        <p className="px-5 pb-4 text-sm text-gray-400">No training slots added yet.</p>
      )}
      {open && sorted.length > 0 && (
        <ul className="divide-y divide-gray-50 border-t border-gray-50">
          {sorted.map(slot => (
            <li key={slot.id} className="px-5 py-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">{slot.day_of_week}</span>
                  <span className="text-xs text-gray-500">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 capitalize">
                    {slot.frequency}
                  </span>
                </div>
                {slot.venueName && (
                  <p className="text-xs text-gray-500 mt-0.5">{slot.venueName}{slot.notes ? ` · ${slot.notes}` : ''}</p>
                )}
                {!slot.venueName && slot.notes && (
                  <p className="text-xs text-gray-500 mt-0.5">{slot.notes}</p>
                )}
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(slot.id)}
                  className="text-xs text-gray-400 hover:text-red-600 transition flex-shrink-0 mt-0.5"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

