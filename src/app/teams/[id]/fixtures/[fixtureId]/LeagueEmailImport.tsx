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

  // Colours
  const homeColours = t.match(/Home\s+Club\s+Colours[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null
  const awayColours = t.match(/Away\s+Club\s+Colours[:\s]*([^\n]+)/i)?.[1]?.trim() ?? null

  // Contact blocks: each looks like:
  //   Away Club\nFixture Secretary:\tName\nEmail\nPhone
  // "Home Club" / "Away Club" appears once per role so we match side+role together.
  function extractContact(side: string, rolePattern: string) {
    // Name is on the SAME line as the role label (tab-separated), then email, then phone
    const rx = new RegExp(
      `${side}\\s+Club[^\\n]*\\n\\s*${rolePattern}[:\\s\\t]+([^\\n]+)\\n([^\\n]+)\\n([^\\n]+)`, 'i'
    )
    const m = t.match(rx)
    return m ? { name: m[1].trim(), email: m[2].trim(), phone: m[3].trim() } : null
  }

  // Ground is at the top of the email (not inside a club block) — for away fixtures
  function extractGround() {
    const rx = /Ground[:\s]*([^\n]+)\nAddress[:\s]*([^\n]+)/i
    const m = t.match(rx)
    return m ? { name: m[1].trim(), address: m[2].trim() } : null
  }

  const homeFixSec = extractContact('Home', 'Fixture\\s+Secretary')
  const awayFixSec = extractContact('Away', 'Fixture\\s+Secretary')
  const homeManager = extractContact('Home', 'Team\\s+Manager')
  const awayManager = extractContact('Away', 'Team\\s+Manager')

  // When playing home, opposition is the away side (and vice versa)
  const oppFixSec = isHome ? awayFixSec : homeFixSec
  const oppManager = isHome ? awayManager : homeManager
  const oppColours = isHome ? awayColours : homeColours
  // Ground/address at top of email is the match venue — only relevant when playing away
  const oppVenue = !isHome ? extractGround() : null

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
  isIntraClub = false,
}: {
  fixtureId: string
  teamId: string
  venue: string // 'home' | 'away' | 'neutral'
  existing: ExistingData
  isIntraClub?: boolean
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
              {/* Non-notes fields — hidden for intra-club matches */}
              {!isIntraClub && (
                <>
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

                  {(oppVenueName || oppVenueAddress) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Opposition venue</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {oppVenueName && <Field label="Ground name" value={oppVenueName} onChange={setOppVenueName} />}
                        {oppVenueAddress && <Field label="Address" value={oppVenueAddress} onChange={setOppVenueAddress} />}
                      </div>
                    </div>
                  )}

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
                </>
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
