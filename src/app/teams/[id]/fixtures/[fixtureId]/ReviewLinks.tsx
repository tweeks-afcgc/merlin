'use client'

import { useState, useEffect } from 'react'
import { ensureFixtureReview, resetRefReview, resetManagerReview } from '@/app/admin/reviews/actions'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition flex-shrink-0 ${copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {copied ? 'Copied!' : label}
    </button>
  )
}

function ResetButton({ label, onReset }: { label: string; onReset: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)

  async function handleConfirm() {
    setResetting(true)
    await onReset()
    setConfirming(false)
    setResetting(false)
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        <p className="text-xs text-amber-800 flex-1">This will permanently delete the submitted review. This cannot be undone. Are you sure?</p>
        <button type="button" onClick={handleConfirm} disabled={resetting}
          className="text-xs font-semibold px-2 py-1 rounded bg-red-700 text-white hover:bg-red-800 transition disabled:opacity-50">
          {resetting ? '…' : 'Reset'}
        </button>
        <button type="button" onClick={() => setConfirming(false)}
          className="text-xs text-gray-500 hover:text-gray-700 px-1">
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button type="button" onClick={() => setConfirming(true)}
      className="text-xs text-gray-400 hover:text-red-600 transition mt-1">
      Reset {label}
    </button>
  )
}

export default function ReviewLinks({ fixtureId, isPast }: { fixtureId: string; isPast: boolean }) {
  const [review, setReview] = useState<{ ref_token: string; manager_token: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [refSubmitted, setRefSubmitted] = useState(false)
  const [managerSubmitted, setManagerSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useEffect(() => {
    async function load() {
      // Load existing review status
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data } = await supabase
        .from('fixture_reviews')
        .select('ref_token, manager_token, ref_submitted_at, manager_submitted_at')
        .eq('fixture_id', fixtureId)
        .single()
      if (data) {
        setReview({ ref_token: data.ref_token, manager_token: data.manager_token })
        setRefSubmitted(!!data.ref_submitted_at)
        setManagerSubmitted(!!data.manager_submitted_at)
      }
    }
    load()
  }, [fixtureId])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await ensureFixtureReview(fixtureId)
    if (result.error) { setError(result.error); setLoading(false); return }
    setReview(result.review!)
    setLoading(false)
  }

  if (!isPast) return null

  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 mt-6">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Post-match reviews</h2>
        <p className="text-xs text-gray-400 mt-0.5">Send these links after the match to collect feedback.</p>
      </div>
      <div className="px-6 py-4 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!review ? (
          <button type="button" onClick={handleGenerate} disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60">
            {loading ? 'Generating…' : 'Generate review links'}
          </button>
        ) : (
          <div className="space-y-4">
            {/* Ref review link */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-600">Referee Feedback</p>
                  {refSubmitted
                    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Submitted</span>
                    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Pending</span>
                  }
                </div>
                <CopyButton text={`${origin}/review/ref/${review.ref_token}`} label="Copy link" />
              </div>
              <p className="text-xs text-gray-400 font-mono truncate">{origin}/review/ref/{review.ref_token}</p>
              {refSubmitted && (
                <ResetButton label="referee review" onReset={async () => {
                  await resetRefReview(fixtureId)
                  setRefSubmitted(false)
                }} />
              )}
            </div>

            {/* Manager review link */}
            <div className="border-t border-gray-50 pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-600">Manager Feedback</p>
                  {managerSubmitted
                    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Submitted</span>
                    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">Pending</span>
                  }
                </div>
                <CopyButton text={`${origin}/review/manager/${review.manager_token}`} label="Copy link" />
              </div>
              <p className="text-xs text-gray-400 font-mono truncate">{origin}/review/manager/{review.manager_token}</p>
              {managerSubmitted && (
                <ResetButton label="manager review" onReset={async () => {
                  await resetManagerReview(fixtureId)
                  setManagerSubmitted(false)
                }} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
