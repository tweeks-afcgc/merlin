'use client'

import { useState } from 'react'

type Fixture = {
  date: string
  kickoff_time: string | null
  teamName: string
  opponentName: string
  venue: string
  teamFormat: string | null
  venueName: string | null
  venueAddress: string | null
  venueNotes: string | null
  managerName: string | null
  managerFirstName: string | null
  managerMobile: string | null
  refereeName: string | null
  leagueAssignedReferee: boolean
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string): string {
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

function buildRefereeText(f: Fixture): string {
  const lines: string[] = []

  // Fixture
  lines.push(`${f.teamName} vs ${f.opponentName}`)
  if (f.kickoff_time) lines.push(`${formatDateLong(f.date)}, ${formatTime(f.kickoff_time)}`)
  else lines.push(formatDateLong(f.date))

  // Format
  if (f.teamFormat) lines.push(`Match format: ${f.teamFormat}`)

  lines.push('')

  // Venue
  const venueStr = [f.venueName, f.venueAddress].filter(Boolean).join(', ')
  if (venueStr) lines.push(`Venue: ${venueStr}`)
  if (f.venueNotes) lines.push(f.venueNotes)

  lines.push('')

  // Manager contact
  if (f.managerName) {
    lines.push(`The home manager is ${f.managerName}.`)
    if (f.managerFirstName && f.managerMobile) {
      lines.push(`If there are any problems on the day, please contact ${f.managerFirstName} on the following number: ${f.managerMobile}`)
    } else if (f.managerFirstName) {
      lines.push(`If there are any problems on the day, please contact ${f.managerFirstName}.`)
    }
  }

  return lines.join('\n').trim()
}

export default function RefereeModal({ fixture }: { fixture: Fixture }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const refName = fixture.refereeName ?? 'League assigned referee'
  const text = buildRefereeText(fixture)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Whistle icon button */}
      <button
        onClick={() => setOpen(true)}
        title="Referee info"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-800 hover:bg-red-50 transition"
      >
        {/* Whistle SVG */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h4" />
          <path d="M6 7v10" />
          <path d="M6 7h12l2-4H6" />
          <circle cx="17" cy="14" r="4" />
          <path d="M17 10v4" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Referee information</h2>
                <p className="text-sm text-gray-500 mt-0.5">{refName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Fixture details</p>
                <button
                  onClick={handleCopy}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-72 overflow-y-auto whitespace-pre-wrap">
                {text}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button onClick={() => setOpen(false)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2 rounded-lg text-sm transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
