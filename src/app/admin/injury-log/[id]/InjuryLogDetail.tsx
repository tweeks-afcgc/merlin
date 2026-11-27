'use client'

import { useState } from 'react'
import { updateInjuryLog } from '../actions'

const OUTCOME_LABELS: Record<string, string> = {
  continued_playing: 'Continued playing',
  stopped_playing: 'Stopped playing',
  went_home: 'Went home',
  went_to_ae_or_gp: 'Went to A&E or a GP',
  taken_by_ambulance: 'Taken by ambulance',
}

const INJURY_TYPE_LABELS: Record<string, string> = {
  knock_bruise: 'Knock or bruise',
  cut: 'Cut',
  sprain_strain: 'Sprain or strain',
  suspected_fracture: 'Suspected fracture',
  suspected_concussion: 'Suspected concussion or head injury',
  breathing_medical: 'Breathing or medical issue',
  other: 'Other',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(t: string | null) {
  if (!t) return '—'
  return t.slice(0, 5)
}

function yn(v: boolean | null) {
  if (v === null || v === undefined) return '—'
  return v ? 'Yes' : 'No'
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 w-44 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{value || '—'}</span>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 bg-white'

export default function InjuryLogDetail({ log }: { log: any }) {
  const team = log.teams
  const venue = log.venues

  // Admin editable fields
  const [status, setStatus] = useState<string>(log.status ?? 'open')
  const [reportedLeague, setReportedLeague] = useState<boolean>(log.reported_to_league ?? false)
  const [reportedLeagueDate, setReportedLeagueDate] = useState<string>(log.reported_to_league_date ?? '')
  const [reportedKentFa, setReportedKentFa] = useState<boolean>(log.reported_to_kent_fa ?? false)
  const [reportedKentFaDate, setReportedKentFaDate] = useState<string>(log.reported_to_kent_fa_date ?? '')
  const [reportedInsurer, setReportedInsurer] = useState<boolean>(log.reported_to_insurer ?? false)
  const [reportedInsurerDate, setReportedInsurerDate] = useState<string>(log.reported_to_insurer_date ?? '')
  const [fitReturnDate, setFitReturnDate] = useState<string>(log.fit_to_return_date ?? '')
  const [adminNotes, setAdminNotes] = useState<string>(log.admin_notes ?? '')
  const [closedBy, setClosedBy] = useState<string>(log.closed_by ?? '')
  const [closedDate, setClosedDate] = useState<string>(log.closed_date ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    const result = await updateInjuryLog(log.id, {
      status,
      reported_to_league: reportedLeague,
      reported_to_league_date: reportedLeagueDate || null,
      reported_to_kent_fa: reportedKentFa,
      reported_to_kent_fa_date: reportedKentFaDate || null,
      reported_to_insurer: reportedInsurer,
      reported_to_insurer_date: reportedInsurerDate || null,
      fit_to_return_date: fitReturnDate || null,
      admin_notes: adminNotes || null,
      closed_by: closedBy || null,
      closed_date: closedDate || null,
    })
    setSaving(false)
    if (result.error) { setSaveError(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const flags = []
  if (log.suspected_concussion) flags.push({ label: 'Suspected concussion', cls: 'bg-orange-100 text-orange-700' })
  if (log.ambulance_called) flags.push({ label: 'Ambulance called', cls: 'bg-red-100 text-red-700' })
  if (log.defib_used) flags.push({ label: 'Defib used', cls: 'bg-red-100 text-red-700' })
  if (log.is_under_18) flags.push({ label: 'Under 18', cls: 'bg-blue-100 text-blue-700' })

  const venueDisplay = log.venue_label ?? venue?.name ?? '—'

  return (
    <div className="mt-4">
      {/* Flags */}
      {flags.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {flags.map(f => (
            <span key={f.label} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${f.cls}`}>
              {f.label}
            </span>
          ))}
        </div>
      )}

      <h1 className="text-xl font-bold text-gray-900 mb-1">
        {log.injured_name}
      </h1>
      <p className="text-sm text-gray-400 mb-5">
        {formatDate(log.incident_date)} · Submitted {formatDate(log.created_at?.split('T')[0])} by {log.reporter_name}
      </p>

      <SectionCard title="Reporter">
        <Row label="Name" value={log.reporter_name} />
        <Row label="Role" value={log.reporter_role} />
        <Row label="Team" value={team?.name} />
        <Row label="Contact" value={log.reporter_contact} />
      </SectionCard>

      <SectionCard title="When and where">
        <Row label="Date" value={formatDate(log.incident_date)} />
        <Row label="Time" value={formatTime(log.incident_time)} />
        <Row label="Venue" value={venueDisplay} />
        <Row label="Activity" value={log.activity} />
        {log.opposition && <Row label="Opposition" value={log.opposition} />}
      </SectionCard>

      <SectionCard title="Injured person">
        <Row label="Name" value={log.injured_name} />
        <Row label="Role" value={log.injured_role} />
        <Row label="Under 18" value={yn(log.is_under_18)} />
        {log.is_under_18 && <Row label="Parent/carer present" value={yn(log.parent_carer_present)} />}
      </SectionCard>

      <SectionCard title="Injury">
        <Row label="What happened" value={<span className="whitespace-pre-wrap">{log.what_happened}</span>} />
        <Row label="Body part" value={log.body_part} />
        <Row label="Type" value={log.injury_type ? (INJURY_TYPE_LABELS[log.injury_type] ?? log.injury_type) : null} />
        {log.injury_description && <Row label="Description" value={<span className="whitespace-pre-wrap">{log.injury_description}</span>} />}
      </SectionCard>

      <SectionCard title="Response and outcome">
        {log.first_aid_given && <Row label="First aid given" value={<span className="whitespace-pre-wrap">{log.first_aid_given}</span>} />}
        {log.first_aid_by && <Row label="First aid by" value={log.first_aid_by} />}
        <Row label="Defib used" value={yn(log.defib_used)} />
        <Row label="Ambulance called" value={yn(log.ambulance_called)} />
        <Row label="Outcome" value={log.outcome ? (OUTCOME_LABELS[log.outcome] ?? log.outcome) : null} />
        {log.is_under_18 && (
          <>
            <Row label="Parent/carer informed" value={yn(log.parent_carer_informed)} />
            {log.parent_carer_informed && <Row label="Informed when" value={log.parent_carer_informed_when} />}
          </>
        )}
        <Row label="Suspected concussion" value={yn(log.suspected_concussion)} />
      </SectionCard>

      {/* Admin section */}
      <div className="bg-white rounded-xl border border-red-100 shadow-sm mb-6 overflow-hidden">
        <div className="bg-red-50 border-b border-red-100 px-4 py-2.5">
          <h2 className="text-xs font-bold text-red-700 uppercase tracking-wide">Admin</h2>
        </div>
        <div className="px-4 py-4 space-y-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['open', 'monitoring', 'closed'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition border ${
                    status === s ? 'border-red-700 bg-red-800 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Reporting */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500">Reported to…</p>
            {[
              { label: 'The league', checked: reportedLeague, setChecked: setReportedLeague, date: reportedLeagueDate, setDate: setReportedLeagueDate },
              { label: 'Kent FA', checked: reportedKentFa, setChecked: setReportedKentFa, date: reportedKentFaDate, setDate: setReportedKentFaDate },
              { label: 'Insurer', checked: reportedInsurer, setChecked: setReportedInsurer, date: reportedInsurerDate, setDate: setReportedInsurerDate },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={item.checked} onChange={e => item.setChecked(e.target.checked)} className="accent-red-800 w-4 h-4" />
                  <span className="text-sm text-gray-700 w-20">{item.label}</span>
                </label>
                {item.checked && (
                  <input type="date" value={item.date} onChange={e => item.setDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700" />
                )}
              </div>
            ))}
          </div>

          {/* Fit to return */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Fit to return date</label>
            <input type="date" value={fitReturnDate} onChange={e => setFitReturnDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700" />
          </div>

          {/* Admin notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Notes</label>
            <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3}
              className={inputCls} placeholder="Internal notes…" />
          </div>

          {/* Closed by / date */}
          {status === 'closed' && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Closed by</label>
                <input type="text" value={closedBy} onChange={e => setClosedBy(e.target.value)}
                  className={inputCls} placeholder="Name" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Closed date</label>
                <input type="date" value={closedDate} onChange={e => setClosedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700" />
              </div>
            </div>
          )}

          {saveError && <p className="text-sm text-red-600">{saveError}</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`w-full font-semibold py-2.5 rounded-xl text-sm transition disabled:opacity-60 ${
              saved ? 'bg-green-600 text-white' : 'bg-red-800 hover:bg-red-900 text-white'
            }`}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
