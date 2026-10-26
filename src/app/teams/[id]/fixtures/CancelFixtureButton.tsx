'use client'

import { useState } from 'react'
import { cancelFixture, uncancelFixture } from './actions'

type CancelReason = 'cannot_field_team' | 'waterlogged_pitch' | 'frozen_pitch' | 'match_abandoned'

export default function CancelFixtureButton({
  fixtureId,
  teamId,
  teamName,
  opponentName,
  isCancelled,
  cancellationReason,
  compact = false,
}: {
  fixtureId: string
  teamId: string
  teamName: string
  opponentName: string
  isCancelled: boolean
  cancellationReason: string | null
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<CancelReason>('cannot_field_team')
  const [team, setTeam] = useState<'ours' | 'theirs'>('ours')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setSaving(true)
    setError(null)
    let reasonText = ''
    if (reason === 'cannot_field_team') {
      reasonText = `${team === 'ours' ? teamName : opponentName} cannot field a team`
    } else if (reason === 'waterlogged_pitch') {
      reasonText = 'Waterlogged pitch'
    } else if (reason === 'frozen_pitch') {
      reasonText = 'Frozen pitch'
    } else {
      reasonText = 'Match abandoned'
    }
    const res = await cancelFixture(fixtureId, teamId, reasonText)
    setSaving(false)
    if (res?.error) { setError(res.error) } else { setOpen(false) }
  }

  async function handleUncancel() {
    setSaving(true)
    setError(null)
    const res = await uncancelFixture(fixtureId, teamId)
    setSaving(false)
    if (res?.error) setError(res.error)
  }

  if (isCancelled) {
    return (
      <div className="w-full mt-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
        <p className="text-sm font-semibold text-gray-600 text-center">
          Fixture cancelled{cancellationReason ? `: ${cancellationReason}` : ''}
        </p>
        {error && <p className="text-xs text-red-600 text-center">{error}</p>}
        <button
          type="button"
          onClick={handleUncancel}
          disabled={saving}
          className="w-full border border-gray-300 text-gray-600 hover:bg-gray-100 font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Uncancel fixture'}
        </button>
      </div>
    )
  }

  if (open) {
    return (
      <div className="w-full mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
        <p className="text-sm font-semibold text-amber-800">Cancel fixture — select reason</p>
        <div className="space-y-2">
          {(['cannot_field_team', 'waterlogged_pitch', 'frozen_pitch', 'match_abandoned'] as const).map(r => (
            <label key={r} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="cancel-reason"
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-amber-600"
              />
              <span className="text-sm text-gray-700">
                {r === 'cannot_field_team' ? 'Cannot field a team' : r === 'waterlogged_pitch' ? 'Waterlogged pitch' : r === 'frozen_pitch' ? 'Frozen pitch' : 'Match abandoned'}
              </span>
            </label>
          ))}
        </div>
        {reason === 'cannot_field_team' && (
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Which team cannot field?</p>
            <div className="flex gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="cancel-team" checked={team === 'ours'} onChange={() => setTeam('ours')} className="accent-amber-600" />
                <span className="text-sm text-gray-700">{teamName}</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="cancel-team" checked={team === 'theirs'} onChange={() => setTeam('theirs')} className="accent-amber-600" />
                <span className="text-sm text-gray-700">{opponentName}</span>
              </label>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2 rounded-lg text-sm transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg text-sm transition disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-amber-700 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-amber-200 transition">
        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        Cancel fixture
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="w-full mt-2 border border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-2.5 rounded-lg text-sm transition"
    >
      Cancel fixture
    </button>
  )
}
