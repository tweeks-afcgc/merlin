'use client'

import { useState } from 'react'

type Fixture = {
  date: string
  kickoff_time: string | null
  teamName: string
  ageGroupLabel: string
  opponentName: string
  venueName: string | null
  venueAddress: string | null
  pitchName: string | null
  pitchType: string | null
  kitJersey: string | null
  kitShorts: string | null
  kitSocks: string | null
  managerName: string | null
}

function formatDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTimeAmPm(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = parseInt(hStr)
  const m = parseInt(mStr)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

// Render a line with **label:** bold and the rest normal
function EmailLine({ line }: { line: string }) {
  const match = line.match(/^\*\*(.+?):\*\* (.*)$/)
  if (match) {
    return <p><strong>{match[1]}:</strong> {match[2]}</p>
  }
  return <p>{line || <>&nbsp;</>}</p>
}

function buildEmailText(f: Fixture): string {
  const lines: string[] = []

  lines.push(`Please see below for confirmation of our upcoming ${f.ageGroupLabel} fixture:`)
  lines.push('')
  lines.push(`**Fixture:** ${f.teamName} vs ${f.opponentName}`)

  if (f.kickoff_time) {
    lines.push(`**Kick Off Date & Time:** ${formatDateLong(f.date)}, ${formatTimeAmPm(f.kickoff_time)}`)
  }

  const venueStr = [f.venueName, f.venueAddress].filter(Boolean).join(', ')
  if (venueStr) lines.push(`**Venue:** ${venueStr}`)

  if (f.pitchType || f.pitchName) {
    const pitchTypeLabel = f.pitchType === '3g' ? '3G' : f.pitchType === 'grass' ? 'Grass' : f.pitchType ?? ''
    const pitchParts = [pitchTypeLabel, f.pitchName].filter(Boolean)
    lines.push(`**Pitch Type:** ${pitchParts.join(', ')}`)
  }

  if (f.kitJersey || f.kitShorts || f.kitSocks) {
    const kitParts: string[] = []
    if (f.kitJersey) kitParts.push(`${f.kitJersey} jerseys`)
    if (f.kitShorts) kitParts.push(`${f.kitShorts} shorts`)
    if (f.kitSocks)  kitParts.push(`${f.kitSocks} socks`)
    lines.push('')
    lines.push(`Our team play in ${kitParts.join(', ')}.`)
  }

  if (f.managerName) {
    lines.push('')
    lines.push(`Our team manager is ${f.managerName}.`)
  }

  lines.push('')
  lines.push('Please confirm you will be able to attend this fixture by email reply.')

  return lines.join('\n')
}

export default function EmailModal({ fixture }: { fixture: Fixture }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const text = buildEmailText(fixture)

  // Plain text for clipboard: strip ** markers
  const plainText = text.replace(/\*\*(.+?):\*\*/g, '$1:')

  async function handleCopy() {
    await navigator.clipboard.writeText(plainText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* Email icon button */}
      <button
        onClick={() => setOpen(true)}
        title="Copy confirmation email"
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-800 hover:bg-red-50 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Fixture confirmation email</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-80 overflow-y-auto space-y-1">
                {text.split('\n').map((line, i) => <EmailLine key={i} line={line} />)}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setOpen(false)} className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-4 py-2 rounded-lg text-sm transition">
                Close
              </button>
              <button
                onClick={handleCopy}
                className={`font-semibold px-4 py-2 rounded-lg text-sm transition ${copied ? 'bg-green-600 text-white' : 'bg-red-800 hover:bg-red-900 text-white'}`}
              >
                {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
