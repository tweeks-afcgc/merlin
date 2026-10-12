'use client'

import { useState } from 'react'
import { saveLeagueEmailData } from '../actions'

type ParsedData = {
  videoingAllowed: boolean | null
  leagueNotes: string | null
  oppColours: string | null
  oppFixtureSecName: string | null
  oppFixtureSecEmail: string | null
  oppFixtureSecPhone: string | null
  oppManagerName: string | null
  oppManagerEmail: string | null
  oppManagerPhone: string | null
  oppVenueName: string | null
  oppVenueAddress: string | null
}

type ExistingData = ParsedData & { loaded: true } | { loaded: false }

function parseSelkentEmail(text: string, isHome: boolean): ParsedData {
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Videoing
  const videoingLine = t.match(/VIDEOING[:\s]*\n?([^\n]+)/i)?.[1] ?? ''
  const videoingAllowed = videoingLine.toLowerCase().includes('not') ? false
    : videoingLine.toLowerCase().includes('allow') ? true : null

  // Notes — from NOTES: until next known heading
  const notesMatch = t.match(/NOTES[:\s]*\n([\s\S]+?)(?=\n[ \t]*(?:HOME|AWAY)\s+CLUB\s+COLOURS|\n[ \t]*HOME\s+CLUB\b|\n[ \t]*AWAY\s+CLUB\b)/i)
  const leagueNotes = notesMatch ? notesMatch[1].trim() : null

  // Colours — look for the combined "X CLUB COLOURS" label
  const homeColours = t.match(/HOME\s+CLUB\s+COLOURS[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null
  const awayColours = t.match(/AWAY\s+CLUB\s+COLOURS[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null

  // Split text into a HOME section and an AWAY section so regexes don't bleed across
  const homeIdx = t.search(/\bHOME\s+CLUB\b/i)
  const awayIdx = t.search(/\bAWAY\s+CLUB\b/i)
  let homeSection = ''
  let awaySection = ''
  if (homeIdx !== -1 && awayIdx !== -1) {
    if (homeIdx < awayIdx) {
      homeSection = t.slice(homeIdx, awayIdx)
      awaySection = t.slice(awayIdx)
    } else {
      awaySection = t.slice(awayIdx, homeIdx)
      homeSection = t.slice(homeIdx)
    }
  } else if (homeIdx !== -1) {
    homeSection = t.slice(homeIdx)
  } else if (awayIdx !== -1) {
    awaySection = t.slice(awayIdx)
  }

  // Within a section extract a contact role (name / email / phone on consecutive non-blank lines)
  function extractRole(section: string, rolePattern: string) {
    const rx = new RegExp(`${rolePattern}[:\\s]*\\n([^\\n]+)\\n([^\\n]+)\\n([^\\n]+)`, 'i')
    const m = section.match(rx)
    if (!m) return null
    return { name: m[1].trim(), email: m[2].trim(), phone: m[3].trim() }
  }

  // Within a section extract a ground name + address lines
  function extractGround(section: string) {
    const rx = /GROUND[:\s]*\n([^\n]+)\n([\s\S]+?)(?=\n[ \t]*(?:FIXTURE\s+SECRETARY|TEAM\s+MANAGER)|$)/i
    const m = section.match(rx)
    if (!m) return null
    const name = m[1].trim()
    const addressLines = m[2].split('\n').map((l: string) => l.trim()).filter(Boolean)
    return { name, address: addressLines.join(', ') }
  }

  const homeFixSec = extractRole(homeSection, 'FIXTURE\\s+SECRETARY')
  const awayFixSec = extractRole(awaySection, 'FIXTURE\\s+SECRETARY')
  const homeManager = extractRole(homeSection, 'TEAM\\s+MANAGER')
  const awayManager = extractRole(awaySection, 'TEAM\\s+MANAGER')
  const homeGround = extractGround(homeSection)
  const awayGround = extractGround(awaySection)

  // When playing home, the opposition is the away side (and vice versa)
  const oppFixSec = isHome ? awayFixSec : homeFixSec
  const oppManager = isHome ? awayManager : homeManager
  const oppColours = isHome ? awayColours : homeColours
  const oppVenue = isHome ? awayGround : homeGround

  return {
    videoingAllowed,
    leagueNotes,
    oppColours,
    oppFixtureSecName: oppFixSec?.name ?? null,
    oppFixtureSecEmail: oppFixSec?.email ?? null,
    oppFixtureSecPhone: oppFixSec?.phone ?? null,
    oppManagerName: oppManager?.name ?? null,
    oppManagerEmail: oppManager?.email ?? null,
    oppManagerPhone: oppManager?.phone ?? null,
    oppVenueName: oppVenue?.name ?? null,
    oppVenueAddress: oppVenue?.address ?? null,
  }
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-0.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700"
      />
    </div>
  )
}

export default function LeagueEmailImport({
  fixtureId,
  teamId,
  venue,
  existing,
}: {
  fixtureId: string
  teamId: string
  venue: string // 'home' | 'away' | 'neutral'
  existing: ExistingData
}) {
  const [open, setOpen] = useState(existing.loaded)
  const [emailText, setEmailText] = useState('')
  const [parsed, setParsed] = useState<ParsedData | null>(existing.loaded ? existing : null)
  const isHome = venue !== 'away'
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Editable fields driven from parsed
  const [videoingAllowed, setVideoingAllowed] = useState<string>(
    existing.loaded ? (existing.videoingAllowed == null ? '' : existing.videoingAllowed ? 'yes' : 'no') : ''
  )
  const [leagueNotes, setLeagueNotes] = useState(existing.loaded ? existing.leagueNotes ?? '' : '')
  const [oppColours, setOppColours] = useState(existing.loaded ? existing.oppColours ?? '' : '')
  const [oppFixSecName, setOppFixSecName] = useState(existing.loaded ? existing.oppFixtureSecName ?? '' : '')
  const [oppFixSecEmail, setOppFixSecEmail] = useState(existing.loaded ? existing.oppFixtureSecEmail ?? '' : '')
  const [oppFixSecPhone, setOppFixSecPhone] = useState(existing.loaded ? existing.oppFixtureSecPhone ?? '' : '')
  const [oppManagerName, setOppManagerName] = useState(existing.loaded ? existing.oppManagerName ?? '' : '')
  const [oppManagerEmail, setOppManagerEmail] = useState(existing.loaded ? existing.oppManagerEmail ?? '' : '')
  const [oppManagerPhone, setOppManagerPhone] = useState(existing.loaded ? existing.oppManagerPhone ?? '' : '')
  const [oppVenueName, setOppVenueName] = useState(existing.loaded ? existing.oppVenueName ?? '' : '')
  const [oppVenueAddress, setOppVenueAddress] = useState(existing.loaded ? existing.oppVenueAddress ?? '' : '')

  function handleParse() {
    if (!emailText.trim()) return
    const result = parseSelkentEmail(emailText, isHome)
    setParsed(result)
    setVideoingAllowed(result.videoingAllowed == null ? '' : result.videoingAllowed ? 'yes' : 'no')
    setLeagueNotes(result.leagueNotes ?? '')
    setOppColours(result.oppColours ?? '')
    setOppFixSecName(result.oppFixtureSecName ?? '')
    setOppFixSecEmail(result.oppFixtureSecEmail ?? '')
    setOppFixSecPhone(result.oppFixtureSecPhone ?? '')
    setOppManagerName(result.oppManagerName ?? '')
    setOppManagerEmail(result.oppManagerEmail ?? '')
    setOppManagerPhone(result.oppManagerPhone ?? '')
    setOppVenueName(result.oppVenueName ?? '')
    setOppVenueAddress(result.oppVenueAddress ?? '')
    setSaved(false)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await saveLeagueEmailData(fixtureId, teamId, {
      leagueNotes: leagueNotes || null,
      videoingAllowed: videoingAllowed === 'yes' ? true : videoingAllowed === 'no' ? false : null,
      oppColours: oppColours || null,
      oppFixtureSecName: oppFixSecName || null,
      oppFixtureSecEmail: oppFixSecEmail || null,
      oppFixtureSecPhone: oppFixSecPhone || null,
      oppManagerName: oppManagerName || null,
      oppManagerEmail: oppManagerEmail || null,
      oppManagerPhone: oppManagerPhone || null,
      oppVenueName: oppVenueName || null,
      oppVenueAddress: oppVenueAddress || null,
    })
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
  }

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 mt-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-700">League confirmation email</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {parsed ? 'Data imported — tap to review or update.' : 'Paste the Selkent confirmation email to import opposition details.'}
          </p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">

          {/* Paste area */}
          {!parsed && (
            <>
              <p className="text-xs text-gray-400">
                Playing <span className="font-medium text-gray-600">{venue === 'neutral' ? 'at a neutral venue' : venue}</span> — opposition contacts will be pulled from the {isHome ? 'away' : 'home'} club block.
              </p>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Paste email text</label>
                <textarea
                  value={emailText}
                  onChange={e => setEmailText(e.target.value)}
                  rows={8}
                  placeholder="Paste the full Selkent fixture confirmation email here…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y font-mono"
                />
              </div>

              <button
                type="button"
                onClick={handleParse}
                disabled={!emailText.trim()}
                className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                Parse email
              </button>
            </>
          )}

          {/* Parsed fields */}
          {parsed && (
            <div className="space-y-5">
              {/* Videoing + colours — always show */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Videoing</label>
                  <select
                    value={videoingAllowed}
                    onChange={e => setVideoingAllowed(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700"
                  >
                    <option value="">Unknown</option>
                    <option value="yes">Allowed</option>
                    <option value="no">Not allowed</option>
                  </select>
                </div>
                {oppColours && <Field label="Opposition kit colours" value={oppColours} onChange={setOppColours} />}
              </div>

              {/* Opposition venue — only if data found */}
              {(oppVenueName || oppVenueAddress) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opposition venue</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {oppVenueName && <Field label="Ground name" value={oppVenueName} onChange={setOppVenueName} />}
                    {oppVenueAddress && <Field label="Address" value={oppVenueAddress} onChange={setOppVenueAddress} />}
                  </div>
                </div>
              )}

              {/* Opposition fixture secretary — only if data found */}
              {(oppFixSecName || oppFixSecEmail || oppFixSecPhone) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opposition fixture secretary</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {oppFixSecName && <Field label="Name" value={oppFixSecName} onChange={setOppFixSecName} />}
                    {oppFixSecEmail && <Field label="Email" value={oppFixSecEmail} onChange={setOppFixSecEmail} />}
                    {oppFixSecPhone && <Field label="Phone" value={oppFixSecPhone} onChange={setOppFixSecPhone} />}
                  </div>
                </div>
              )}

              {/* Opposition manager — only if data found */}
              {(oppManagerName || oppManagerEmail || oppManagerPhone) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opposition team manager</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {oppManagerName && <Field label="Name" value={oppManagerName} onChange={setOppManagerName} />}
                    {oppManagerEmail && <Field label="Email" value={oppManagerEmail} onChange={setOppManagerEmail} />}
                    {oppManagerPhone && <Field label="Phone" value={oppManagerPhone} onChange={setOppManagerPhone} />}
                  </div>
                </div>
              )}

              {/* Venue notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Venue notes (from league)</label>
                <textarea
                  value={leagueNotes}
                  onChange={e => setLeagueNotes(e.target.value)}
                  rows={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {saved && <p className="text-sm text-green-600">Saved successfully.</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setParsed(null); setEmailText('') }}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  Re-paste email
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save to fixture'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
