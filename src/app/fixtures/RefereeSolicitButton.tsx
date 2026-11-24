'use client'

import { useState } from 'react'

type SolicitFixture = {
  id: string
  date: string
  kickoff_time: string | null
  venueName: string | null
  venue: string
  teamFormat: string | null
  ageGroupLabel: string
  teamName: string
  opponentName: string
}

function formatTime(t: string | null) {
  if (!t) return 'TBC'
  return t.slice(0, 5)
}

function formatAgeGroup(label: string) {
  if (label === 'Senior') return 'Senior'
  // "Under 12" -> "U12"
  return label.replace('Under ', 'U')
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

function buildMessage(selected: SolicitFixture[]) {
  const lines = selected.map(f => {
    const time = formatTime(f.kickoff_time)
    const venue = f.venueName ?? (f.venue === 'home' ? 'Home' : 'Away')
    const format = f.teamFormat ?? '—'
    const age = formatAgeGroup(f.ageGroupLabel)
    return `${time} - ${venue} - ${format} - ${age}`
  })
  return [
    'Hello all. Here are the fixtures that we are looking for referees for next weekend:',
    '',
    ...lines,
    '',
    'Please let me know if you would like to take any of the above, thank you 🙏',
  ].join('\n')
}

export default function RefereeSolicitButton({ fixtures }: { fixtures: SolicitFixture[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(fixtures.map(f => f.id)))
  const [copied, setCopied] = useState(false)

  if (fixtures.length === 0) return null

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedFixtures = fixtures.filter(f => selected.has(f.id))
  const message = buildMessage(selectedFixtures)

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function handleOpen() {
    setSelected(new Set(fixtures.map(f => f.id)))
    setCopied(false)
    setOpen(true)
  }

  // Group by date
  const byDate = new Map<string, SolicitFixture[]>()
  for (const f of fixtures) {
    const arr = byDate.get(f.date) ?? []
    arr.push(f)
    byDate.set(f.date, arr)
  }
  const dates = [...byDate.keys()].sort()

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 text-sm font-medium px-3 py-2 rounded-lg transition shadow-sm"
        title="Generate referee request message"
      >
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Ref request
        <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{fixtures.length}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">Referee request message</h2>
                <p className="text-xs text-gray-400 mt-0.5">Select the fixtures to include, then copy the message.</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Fixture list */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              {dates.map(date => (
                <div key={date}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{formatDate(date)}</p>
                  <div className="space-y-2">
                    {byDate.get(date)!.map(f => {
                      const checked = selected.has(f.id)
                      return (
                        <label key={f.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${checked ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(f.id)}
                            className="mt-0.5 accent-red-800 w-4 h-4 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{f.teamName} vs {f.opponentName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {formatTime(f.kickoff_time)} · {f.venueName ?? (f.venue === 'home' ? 'Home' : 'Away')} · {f.teamFormat ?? '—'} · {formatAgeGroup(f.ageGroupLabel)}
                            </p>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Generated message preview */}
            <div className="px-5 pb-2 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 mb-2">Message preview</p>
              <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap font-sans leading-relaxed max-h-40 overflow-y-auto">
                {selectedFixtures.length === 0 ? <span className="text-gray-400 italic">No fixtures selected.</span> : message}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-3">
              <button
                onClick={handleCopy}
                disabled={selectedFixtures.length === 0}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-40 ${
                  copied ? 'bg-green-600 text-white' : 'bg-red-800 hover:bg-red-900 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
