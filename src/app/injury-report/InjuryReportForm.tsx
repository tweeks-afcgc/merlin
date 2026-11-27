'use client'

import { useState } from 'react'
import { submitInjuryReport } from './actions'

type Venue = { id: string; name: string }
type Team = { id: string; name: string }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="bg-gray-50 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-4 py-4 space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-600 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 bg-white'
const selectCls = inputCls

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3">
      {[true, false].map(v => (
        <label key={String(v)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition ${value === v ? 'border-red-700 bg-red-50 text-red-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <input type="radio" className="sr-only" checked={value === v} onChange={() => onChange(v)} />
          {v ? 'Yes' : 'No'}
        </label>
      ))}
    </div>
  )
}

export default function InjuryReportForm({ venues, teams }: { venues: Venue[]; teams: Team[] }) {
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Section 1 – Reporter
  const [reporterName, setReporterName] = useState('')
  const [reporterRole, setReporterRole] = useState('')
  const [reporterTeam, setReporterTeam] = useState('')
  const [reporterContact, setReporterContact] = useState('')

  // Section 2 – When / where
  const [incidentDate, setIncidentDate] = useState('')
  const [incidentTime, setIncidentTime] = useState('')
  const [venueId, setVenueId] = useState('')
  const [activity, setActivity] = useState('')
  const [opposition, setOpposition] = useState('')

  // Section 3 – Injured person
  const [injuredName, setInjuredName] = useState('')
  const [injuredRole, setInjuredRole] = useState('')
  const [isUnder18, setIsUnder18] = useState<boolean | null>(null)
  const [parentPresent, setParentPresent] = useState<boolean | null>(null)

  // Section 4 – Injury
  const [whatHappened, setWhatHappened] = useState('')
  const [bodyPart, setBodyPart] = useState('')
  const [injuryType, setInjuryType] = useState('')
  const [injuryDescription, setInjuryDescription] = useState('')

  // Section 5 – Response
  const [firstAidGiven, setFirstAidGiven] = useState('')
  const [firstAidBy, setFirstAidBy] = useState('')
  const [defibUsed, setDefibUsed] = useState<boolean | null>(null)
  const [ambulanceCalled, setAmbulanceCalled] = useState<boolean | null>(null)
  const [outcome, setOutcome] = useState('')
  const [parentInformed, setParentInformed] = useState<boolean | null>(null)
  const [parentInformedWhen, setParentInformedWhen] = useState('')
  const [suspectedConcussion, setSuspectedConcussion] = useState<boolean | null>(null)

  // Venue parsing
  const venueIsAway = venueId === '__away__'
  const venueIsOther = venueId === '__other__'
  const resolvedVenueId = (venueIsAway || venueIsOther) ? null : venueId || null
  const venueLabel = venueIsAway ? 'Away' : venueIsOther ? 'Other' : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!reporterName.trim()) { setError('Reporter name is required.'); return }
    if (!reporterRole) { setError('Reporter role is required.'); return }
    if (!reporterTeam) { setError('Team is required.'); return }
    if (!reporterContact.trim()) { setError('Contact details are required.'); return }
    if (!incidentDate) { setError('Date of incident is required.'); return }
    if (!injuredName.trim()) { setError('Injured person name is required.'); return }
    if (!whatHappened.trim()) { setError('Description of what happened is required.'); return }
    if (!pin.trim()) { setError('PIN is required.'); return }

    setSubmitting(true)
    const result = await submitInjuryReport(pin, {
      reporter_name: reporterName.trim(),
      reporter_role: reporterRole,
      reporter_team_id: reporterTeam || null,
      reporter_contact: reporterContact.trim(),
      incident_date: incidentDate,
      incident_time: incidentTime || null,
      venue_id: resolvedVenueId,
      venue_label: venueLabel,
      activity: activity || null,
      opposition: opposition.trim() || null,
      injured_name: injuredName.trim(),
      injured_role: injuredRole || null,
      is_under_18: isUnder18,
      parent_carer_present: isUnder18 ? parentPresent : null,
      what_happened: whatHappened.trim(),
      body_part: bodyPart || null,
      injury_type: injuryType || null,
      injury_description: injuryDescription.trim() || null,
      first_aid_given: firstAidGiven.trim() || null,
      first_aid_by: firstAidBy.trim() || null,
      defib_used: defibUsed,
      ambulance_called: ambulanceCalled,
      outcome: outcome || null,
      parent_carer_informed: isUnder18 ? parentInformed : null,
      parent_carer_informed_when: (isUnder18 && parentInformed) ? parentInformedWhen.trim() || null : null,
      suspected_concussion: suspectedConcussion,
    })

    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Thank you - incident received</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Your injury/incident report has been submitted and received by the club. A club official will review it shortly.
          {suspectedConcussion && (
            <span className="block mt-3 font-semibold text-amber-700">
              As a suspected concussion has been reported, please ensure a graduated return-to-play protocol is followed before the player returns to activity.
            </span>
          )}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      <Section title="1. Who is reporting">
        <Field label="Your name" required>
          <input type="text" value={reporterName} onChange={e => setReporterName(e.target.value)} className={inputCls} placeholder="Full name" />
        </Field>
        <Field label="Your role" required>
          <select value={reporterRole} onChange={e => setReporterRole(e.target.value)} className={selectCls}>
            <option value="">Select role…</option>
            <option value="manager">Manager</option>
            <option value="coach">Coach</option>
            <option value="volunteer">Volunteer</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Team" required>
          <select value={reporterTeam} onChange={e => setReporterTeam(e.target.value)} className={selectCls}>
            <option value="">Select team…</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Contact phone or email" required>
          <input type="text" value={reporterContact} onChange={e => setReporterContact(e.target.value)} className={inputCls} placeholder="Phone number or email address" />
        </Field>
      </Section>

      <Section title="2. When and where">
        <Field label="Date of incident" required>
          <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Approximate time">
          <input type="time" value={incidentTime} onChange={e => setIncidentTime(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Venue">
          <select value={venueId} onChange={e => setVenueId(e.target.value)} className={selectCls}>
            <option value="">Select venue…</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            <option value="__away__">Away</option>
            <option value="__other__">Other</option>
          </select>
        </Field>
        <Field label="Activity">
          <select value={activity} onChange={e => setActivity(e.target.value)} className={selectCls}>
            <option value="">Select activity…</option>
            <option value="match">Match</option>
            <option value="training">Training</option>
            <option value="other">Other</option>
          </select>
        </Field>
        {activity === 'match' && (
          <Field label="Opposition">
            <input type="text" value={opposition} onChange={e => setOpposition(e.target.value)} className={inputCls} placeholder="Opposing team name" />
          </Field>
        )}
      </Section>

      <Section title="3. Injured person">
        <Field label="Name" required>
          <input type="text" value={injuredName} onChange={e => setInjuredName(e.target.value)} className={inputCls} placeholder="Full name" />
        </Field>
        <Field label="Role">
          <select value={injuredRole} onChange={e => setInjuredRole(e.target.value)} className={selectCls}>
            <option value="">Select role…</option>
            <option value="player">Player</option>
            <option value="coach">Coach</option>
            <option value="referee">Referee</option>
            <option value="spectator">Spectator</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Under 18?" hint="Flags for safeguarding and parental notification requirements.">
          <YesNo value={isUnder18} onChange={setIsUnder18} />
        </Field>
        {isUnder18 === true && (
          <Field label="Was a parent or carer present?">
            <YesNo value={parentPresent} onChange={setParentPresent} />
          </Field>
        )}
      </Section>

      <Section title="4. The injury">
        <Field label="What happened" required>
          <textarea value={whatHappened} onChange={e => setWhatHappened(e.target.value)} rows={4} className={inputCls} placeholder="Describe how the injury occurred…" />
        </Field>
        <Field label="Body part affected">
          <select value={bodyPart} onChange={e => setBodyPart(e.target.value)} className={selectCls}>
            <option value="">Select body part…</option>
            {['Head','Face','Neck','Back','Arm','Hand','Leg','Knee','Ankle','Foot','Other'].map(p => <option key={p} value={p.toLowerCase()}>{p}</option>)}
          </select>
        </Field>
        <Field label="Type of injury">
          <select value={injuryType} onChange={e => setInjuryType(e.target.value)} className={selectCls}>
            <option value="">Select type…</option>
            <option value="knock_bruise">Knock or bruise</option>
            <option value="cut">Cut</option>
            <option value="sprain_strain">Sprain or strain</option>
            <option value="suspected_fracture">Suspected fracture</option>
            <option value="suspected_concussion">Suspected concussion or head injury</option>
            <option value="breathing_medical">Breathing or medical issue</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Description of injury">
          <textarea value={injuryDescription} onChange={e => setInjuryDescription(e.target.value)} rows={3} className={inputCls} placeholder="Any further detail about the injury itself…" />
        </Field>
      </Section>

      <Section title="5. Response and outcome">
        <Field label="First aid given">
          <textarea value={firstAidGiven} onChange={e => setFirstAidGiven(e.target.value)} rows={2} className={inputCls} placeholder="Describe any first aid treatment given…" />
        </Field>
        <Field label="First aid given by">
          <input type="text" value={firstAidBy} onChange={e => setFirstAidBy(e.target.value)} className={inputCls} placeholder="Name of person who gave first aid" />
        </Field>
        <Field label="Was a defibrillator used?">
          <YesNo value={defibUsed} onChange={setDefibUsed} />
        </Field>
        <Field label="Was an ambulance called?">
          <YesNo value={ambulanceCalled} onChange={setAmbulanceCalled} />
        </Field>
        <Field label="Outcome">
          <select value={outcome} onChange={e => setOutcome(e.target.value)} className={selectCls}>
            <option value="">Select outcome…</option>
            <option value="continued_playing">Continued playing</option>
            <option value="stopped_playing">Stopped playing</option>
            <option value="went_home">Went home</option>
            <option value="went_to_ae_or_gp">Went to A&amp;E or a GP</option>
            <option value="taken_by_ambulance">Taken by ambulance</option>
          </select>
        </Field>
        {isUnder18 === true && (
          <>
            <Field label="Was a parent or carer informed?">
              <YesNo value={parentInformed} onChange={setParentInformed} />
            </Field>
            {parentInformed === true && (
              <Field label="When were they informed?">
                <input type="text" value={parentInformedWhen} onChange={e => setParentInformedWhen(e.target.value)} className={inputCls} placeholder="e.g. during the match, immediately after, by phone at 5pm…" />
              </Field>
            )}
          </>
        )}
        <Field label="Suspected concussion?" hint="If yes, a graduated return-to-play protocol must be followed before the player returns to activity.">
          <YesNo value={suspectedConcussion} onChange={setSuspectedConcussion} />
        </Field>
        {suspectedConcussion === true && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <strong>Concussion protocol:</strong> The player must follow a graduated return-to-play (GRTP) programme before returning to sport. Do not return on the same day. Contact the club if you need guidance.
          </div>
        )}
      </Section>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Club PIN<span className="text-red-600 ml-0.5">*</span>
        </label>
        <p className="text-xs text-gray-400 mb-2">Enter the PIN provided by your club to submit this form.</p>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          className={inputCls}
          placeholder="PIN"
          autoComplete="off"
          maxLength={12}
        />
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-800 hover:bg-red-900 text-white font-bold py-3 rounded-xl text-sm transition disabled:opacity-60 mb-8"
      >
        {submitting ? 'Submitting…' : 'Submit incident report'}
      </button>
    </form>
  )
}
