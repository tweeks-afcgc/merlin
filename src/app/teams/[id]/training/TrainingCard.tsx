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

function formatTime(t: string | null) {
  if (!t) return null
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
  const [slots, setSlots] = useState(initialSlots)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700">Training schedule</span>
        {isAdmin && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-red-800 hover:text-red-900 transition"
            title="Add slot"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {showForm && (
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
              <label className="block text-xs text-gray-500 mb-1">Start time <span className="text-gray-400">(optional)</span></label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End time <span className="text-gray-400">(optional)</span></label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
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
            <label className="block text-xs text-gray-500 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
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

      {sorted.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-400">No training slots added yet.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {sorted.map(slot => {
            const start = formatTime(slot.start_time)
            const end = formatTime(slot.end_time)
            const timeStr = start && end ? `${start} – ${end}` : start ? `from ${start}` : null
            return (
              <li key={slot.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">{slot.day_of_week}</span>
                    {timeStr && <span className="text-xs text-gray-500">{timeStr}</span>}
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
                  <button onClick={() => handleDelete(slot.id)}
                    className="text-xs text-gray-400 hover:text-red-600 transition flex-shrink-0 mt-0.5">
                    Remove
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
