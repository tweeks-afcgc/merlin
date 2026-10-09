'use client'

import { useState, useRef, useEffect } from 'react'
import { sendFixtureConfirmation, type UpcomingFixture } from './whatsapp/fixtureActions'

export default function FixtureConfirmModal({ fixtures }: { fixtures: UpcomingFixture[] }) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleOpen() {
    const first = fixtures.find(f => f.managerMobile)
    setSelectedId(first?.id ?? fixtures[0]?.id ?? '')
    setResult(null)
    setOpen(true)
  }

  async function handleSend() {
    if (!selectedId) return
    setSending(true)
    setResult(null)
    const res = await sendFixtureConfirmation(selectedId)
    setResult(res)
    setSending(false)
  }

  const selected = fixtures.find(f => f.id === selectedId)

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        Fixture Confirmation
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div ref={ref} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Send Fixture Confirmation</h3>
            <p className="text-xs text-gray-400 mb-4">Sends the approved WhatsApp template to the team manager.</p>

            {fixtures.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming fixtures found.</p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Fixture</label>
                  <select
                    value={selectedId}
                    onChange={e => { setSelectedId(e.target.value); setResult(null) }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                  >
                    {fixtures.map(f => (
                      <option key={f.id} value={f.id}>
                        {formatDate(f.date)} — {f.teamName} vs {f.opponentName}
                      </option>
                    ))}
                  </select>
                </div>

                {selected && (
                  <div className="bg-gray-50 rounded-lg px-4 py-3 mb-4 text-xs text-gray-600 space-y-1">
                    <div><span className="font-medium">Manager:</span> {selected.managerName ?? <span className="text-red-500">No manager found</span>}</div>
                    <div><span className="font-medium">Mobile:</span> {selected.managerMobile ?? <span className="text-red-500">No mobile number</span>}</div>
                    <div><span className="font-medium">Venue:</span> {selected.venueName ?? 'TBC'}</div>
                    <div><span className="font-medium">Address:</span> {selected.venueAddress ?? 'TBC'}</div>
                  </div>
                )}

                {result && (
                  <div className={`text-sm rounded-lg px-4 py-2 mb-4 ${result.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {result.ok ? 'Confirmation sent successfully.' : `Error: ${result.error}`}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !selected?.managerMobile}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-50"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
