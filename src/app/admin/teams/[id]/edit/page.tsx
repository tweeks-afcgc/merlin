'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import AppShell from '@/components/AppShell'
import BackButton from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'

const KIT_COLOURS = [
  // Reds
  { label: 'Light Red',  value: 'Light Red',  hex: '#fca5a5' },
  { label: 'Red',        value: 'Red',        hex: '#dc2626' },
  { label: 'Dark Red',   value: 'Dark Red',   hex: '#991b1b' },
  { label: 'Maroon',     value: 'Maroon',     hex: '#7f1d1d' },
  { label: 'Burgundy',   value: 'Burgundy',   hex: '#881337' },
  // Pinks
  { label: 'Rose',       value: 'Rose',       hex: '#fb7185' },
  { label: 'Pink',       value: 'Pink',       hex: '#ec4899' },
  { label: 'Hot Pink',   value: 'Hot Pink',   hex: '#db2777' },
  { label: 'Magenta',    value: 'Magenta',    hex: '#a21caf' },
  // Oranges
  { label: 'Peach',      value: 'Peach',      hex: '#fdba74' },
  { label: 'Orange',     value: 'Orange',     hex: '#f97316' },
  { label: 'Dark Orange',value: 'Dark Orange',hex: '#c2410c' },
  { label: 'Burnt Orange',value:'Burnt Orange',hex:'#92400e' },
  // Yellows / Golds
  { label: 'Yellow',     value: 'Yellow',     hex: '#fde047' },
  { label: 'Amber',      value: 'Amber',      hex: '#f59e0b' },
  { label: 'Gold',       value: 'Gold',       hex: '#d97706' },
  // Greens
  { label: 'Lime',       value: 'Lime',       hex: '#a3e635' },
  { label: 'Light Green',value: 'Light Green',hex: '#4ade80' },
  { label: 'Green',      value: 'Green',      hex: '#16a34a' },
  { label: 'Dark Green', value: 'Dark Green', hex: '#15803d' },
  { label: 'Forest',     value: 'Forest',     hex: '#166534' },
  { label: 'Emerald',    value: 'Emerald',    hex: '#059669' },
  // Blues
  { label: 'Sky Blue',   value: 'Sky Blue',   hex: '#7dd3fc' },
  { label: 'Light Blue', value: 'Light Blue', hex: '#38bdf8' },
  { label: 'Cyan',       value: 'Cyan',       hex: '#06b6d4' },
  { label: 'Blue',       value: 'Blue',       hex: '#2563eb' },
  { label: 'Royal Blue', value: 'Royal Blue', hex: '#1d4ed8' },
  { label: 'Dark Blue',  value: 'Dark Blue',  hex: '#1e40af' },
  { label: 'Navy',       value: 'Navy',       hex: '#1e3a5f' },
  // Purples / Indigos
  { label: 'Lilac',      value: 'Lilac',      hex: '#c084fc' },
  { label: 'Purple',     value: 'Purple',     hex: '#9333ea' },
  { label: 'Violet',     value: 'Violet',     hex: '#7c3aed' },
  { label: 'Indigo',     value: 'Indigo',     hex: '#4f46e5' },
  // Neutrals
  { label: 'White',      value: 'White',      hex: '#f9fafb', border: true },
  { label: 'Cream',      value: 'Cream',      hex: '#fef9c3', border: true },
  { label: 'Silver',     value: 'Silver',     hex: '#e5e7eb', border: true },
  { label: 'Light Grey', value: 'Light Grey', hex: '#9ca3af' },
  { label: 'Grey',       value: 'Grey',       hex: '#6b7280' },
  { label: 'Dark Grey',  value: 'Dark Grey',  hex: '#374151' },
  { label: 'Charcoal',   value: 'Charcoal',   hex: '#1f2937' },
  { label: 'Black',      value: 'Black',      hex: '#111827' },
]

function ColourPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="flex items-center gap-2">
          {value && (
            <>
              <span className="text-xs text-gray-500 font-medium">{value}</span>
              <button
                type="button"
                title="Clear"
                onClick={() => onChange('')}
                className="text-xs text-gray-300 hover:text-red-500 transition leading-none"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {KIT_COLOURS.map(c => (
          <button
            key={c.value}
            type="button"
            title={c.label}
            onClick={() => onChange(value === c.value ? '' : c.value)}
            className={`w-7 h-7 rounded-full transition-all flex-shrink-0 ${
              value === c.value
                ? 'ring-2 ring-offset-2 ring-red-700 scale-110'
                : 'hover:scale-110 hover:ring-1 hover:ring-offset-1 hover:ring-gray-400'
            }`}
            style={{
              backgroundColor: c.hex,
              border: (c as any).border ? '1.5px solid #d1d5db' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function KitFields({
  jersey, setJersey,
  shorts, setShorts,
  socks, setSocks,
}: {
  jersey: string; setJersey: (v: string) => void
  shorts: string; setShorts: (v: string) => void
  socks: string; setSocks: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <ColourPicker label="Jersey" value={jersey} onChange={setJersey} />
      <ColourPicker label="Shorts" value={shorts} onChange={setShorts} />
      <ColourPicker label="Socks"  value={socks}  onChange={setSocks} />
    </div>
  )
}

export default function EditTeamPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('from') ?? '/admin/teams'
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'senior' | 'junior'>('senior')
  const [name, setName] = useState('')
  const [nameOpen, setNameOpen] = useState(false)
  const [foundingAgeGroup, setFoundingAgeGroup] = useState('')
  const [foundingSeasonName, setFoundingSeasonName] = useState('')
  const [currentAgeGroup, setCurrentAgeGroup] = useState<number | null>(null)
  const [format, setFormat] = useState('')
  const [ageGroupOpen, setAgeGroupOpen] = useState(false)

  // Home kit
  const [kitJersey, setKitJersey] = useState('')
  const [kitShorts, setKitShorts] = useState('')
  const [kitSocks, setKitSocks] = useState('')
  const [homeKitOpen, setHomeKitOpen] = useState(false)

  // Away kit
  const [hasAwayKit, setHasAwayKit] = useState(false)
  const [awayJersey, setAwayJersey] = useState('')
  const [awayShorts, setAwayShorts] = useState('')
  const [awaySocks, setAwaySocks] = useState('')
  const [awayKitOpen, setAwayKitOpen] = useState(false)

  // Venue
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([])
  const [defaultVenueId, setDefaultVenueId] = useState('')
  const [pitches, setPitches] = useState<{ id: string; name: string }[]>([])
  const [defaultPitchId, setDefaultPitchId] = useState('')

  // Current season
  const [currentSeasonId, setCurrentSeasonId] = useState('')
  const [currentSeasonName, setCurrentSeasonName] = useState('')

  // Training slots
  type TrainingSlot = { id: string; day_of_week: string; frequency: string; start_time: string | null; end_time: string | null; venue_id: string | null; notes: string | null; venueName: string | null }
  const [trainingSlots, setTrainingSlots] = useState<TrainingSlot[]>([])
  const [addingTraining, setAddingTraining] = useState(false)
  const [tDay, setTDay] = useState('Monday')
  const [tFreq, setTFreq] = useState('weekly')
  const [tStart, setTStart] = useState('')
  const [tEnd, setTEnd] = useState('')
  const [tVenueId, setTVenueId] = useState('')
  const [tNotes, setTNotes] = useState('')
  const [tSaving, setTSaving] = useState(false)

  // Competitions (current season)
  type Competition = { id: string; type: 'league' | 'cup'; name: string; abbr_name: string | null; division: string | null }
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [addingComp, setAddingComp] = useState(false)
  const [cType, setCType] = useState<'league' | 'cup'>('league')
  const [cName, setCName] = useState('')
  const [cAbbr, setCAbbr] = useState('')
  const [cDiv, setCDiv] = useState('')
  const [cSaving, setCSaving] = useState(false)
  const [cError, setCError] = useState<string | null>(null)

  // Sponsors (current season)
  type Sponsor = { id: string; name: string }
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [addingSponsor, setAddingSponsor] = useState(false)
  const [sName, setSName] = useState('')
  const [sSaving, setSSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: team } = await supabase.from('teams').select('*').eq('id', id).single()
      if (!team) { router.push('/admin/teams'); return }

      setType(team.type)
      setName(team.name)
      setFoundingAgeGroup(team.founding_age_group?.toString() ?? '')
      setKitJersey(team.kit_jersey ?? '')
      setKitShorts(team.kit_shorts ?? '')
      setKitSocks(team.kit_socks ?? '')
      setFormat(team.format ?? '')

      const awayJ = (team as any).away_kit_jersey ?? ''
      const awayS = (team as any).away_kit_shorts ?? ''
      const awayK = (team as any).away_kit_socks ?? ''
      setAwayJersey(awayJ)
      setAwayShorts(awayS)
      setAwaySocks(awayK)
      if (awayJ || awayS || awayK) setHasAwayKit(true)

      const venueId = (team as any).default_venue_id ?? ''
      const [{ data: allSeasons }, { data: allVenues }, { data: initialPitches }, { data: slotsData }] = await Promise.all([
        supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: true }),
        supabase.from('venues').select('id, name').order('name'),
        venueId ? supabase.from('pitches').select('id, name').eq('venue_id', venueId).eq('is_active', true).order('name') : Promise.resolve({ data: [] }),
        supabase.from('training_slots').select('id, day_of_week, frequency, start_time, end_time, venue_id, notes, venues(name)').eq('team_id', id).order('created_at'),
      ])
      const seasons = allSeasons ?? []
      const curSeason = seasons.find(s => s.is_current) ?? null
      const curSeasonId = curSeason?.id ?? ''
      setVenues(allVenues ?? [])
      setDefaultVenueId(venueId)
      setPitches(initialPitches ?? [])
      setDefaultPitchId((team as any).default_pitch_id ?? '')
      setCurrentSeasonId(curSeasonId)
      setCurrentSeasonName(curSeason?.name ?? '')
      setTrainingSlots((slotsData ?? []).map((s: any) => ({
        id: s.id, day_of_week: s.day_of_week, frequency: s.frequency,
        start_time: s.start_time ?? null, end_time: s.end_time ?? null,
        venue_id: s.venue_id ?? null, notes: s.notes ?? null, venueName: s.venues?.name ?? null,
      })))
      if (curSeasonId) {
        const [{ data: compsData }, { data: sponsData }] = await Promise.all([
          supabase.from('team_competitions').select('id, type, name, abbr_name, division').eq('team_id', id).eq('season_id', curSeasonId).order('created_at'),
          supabase.from('team_sponsors').select('id, name').eq('team_id', id).eq('season_id', curSeasonId).order('created_at'),
        ])
        setCompetitions((compsData ?? []) as any)
        setSponsors((sponsData ?? []) as any)
      }
      if (team.founding_season_id) {
        const foundingSeason = seasons.find(s => s.id === team.founding_season_id)
        setFoundingSeasonName(foundingSeason?.name ?? '')
      }
      if (team.type === 'junior' && team.founding_age_group && team.founding_season_id) {
        const foundingIdx = seasons.findIndex(s => s.id === team.founding_season_id)
        const currentIdx = seasons.findIndex(s => s.is_current)
        if (foundingIdx !== -1 && currentIdx !== -1) {
          setCurrentAgeGroup(team.founding_age_group + (currentIdx - foundingIdx))
        } else {
          setCurrentAgeGroup(team.founding_age_group)
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!defaultVenueId) { setPitches([]); setDefaultPitchId(''); return }
    supabase.from('pitches').select('id, name').eq('venue_id', defaultVenueId).eq('is_active', true).order('name')
      .then(({ data }) => setPitches(data ?? []))
  }, [defaultVenueId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = {
      name,
      default_venue_id: defaultVenueId || null,
      default_pitch_id: defaultPitchId || null,
      kit_jersey: kitJersey || null,
      kit_shorts: kitShorts || null,
      kit_socks: kitSocks || null,
      home_kit_image_url: null,
      away_kit_jersey: hasAwayKit ? (awayJersey || null) : null,
      away_kit_shorts: hasAwayKit ? (awayShorts || null) : null,
      away_kit_socks: hasAwayKit ? (awaySocks || null) : null,
      away_kit_image_url: null,
    }
    if (type === 'junior') {
      updates.founding_age_group = parseInt(foundingAgeGroup)
      updates.format = format || null
    }

    const { error } = await supabase.from('teams').update(updates).eq('id', id)
    if (error) { setError(error.message); setSaving(false) }
    else router.push(returnTo)
  }

  const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

  async function addSlot() {
    setTSaving(true)
    const { data, error } = await supabase.from('training_slots').insert({
      team_id: id, day_of_week: tDay, frequency: tFreq,
      start_time: tStart || null, end_time: tEnd || null,
      venue_id: tVenueId || null, notes: tNotes || null,
    }).select('id, day_of_week, frequency, start_time, end_time, venue_id, notes').single()
    setTSaving(false)
    if (error || !data) return
    const venueName = tVenueId ? venues.find(v => v.id === tVenueId)?.name ?? null : null
    setTrainingSlots(prev => [...prev, { ...data, venueName }].sort((a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)))
    setAddingTraining(false); setTStart(''); setTEnd(''); setTNotes(''); setTVenueId('')
  }

  async function removeSlot(slotId: string) {
    await supabase.from('training_slots').delete().eq('id', slotId)
    setTrainingSlots(prev => prev.filter(s => s.id !== slotId))
  }

  async function addComp() {
    if (!cName.trim()) return
    const hasLeague = competitions.some(c => c.type === 'league')
    if (cType === 'league' && hasLeague) { setCError('Only one league per season.'); return }
    setCSaving(true); setCError(null)
    const { data, error } = await supabase.from('team_competitions').insert({
      team_id: id, season_id: currentSeasonId, type: cType, name: cName.trim(),
      abbr_name: cType === 'league' ? (cAbbr.trim() || null) : null,
      division: cType === 'league' ? (cDiv.trim() || null) : null,
    }).select('id, type, name, abbr_name, division').single()
    setCSaving(false)
    if (error || !data) { setCError(error?.message ?? 'Error'); return }
    setCompetitions(prev => [...prev, data as any])
    setAddingComp(false); setCName(''); setCAbbr(''); setCDiv(''); setCType('league')
  }

  async function removeComp(compId: string) {
    await supabase.from('team_competitions').delete().eq('id', compId)
    setCompetitions(prev => prev.filter(c => c.id !== compId))
  }

  async function addSponsor() {
    if (!sName.trim()) return
    setSSaving(true)
    const { data, error } = await supabase.from('team_sponsors').insert({
      team_id: id, season_id: currentSeasonId, name: sName.trim(),
    }).select('id, name').single()
    setSSaving(false)
    if (error || !data) return
    setSponsors(prev => [...prev, data as any])
    setAddingSponsor(false); setSName('')
  }

  async function removeSponsor(sId: string) {
    await supabase.from('team_sponsors').delete().eq('id', sId)
    setSponsors(prev => prev.filter(s => s.id !== sId))
  }

  return (
    <AppShell>
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="mb-6"><BackButton /></div>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            {/* Inline team name display */}
            <div className="mb-6">
              <div className="flex items-baseline gap-2 flex-wrap">
                {type === 'junior' && currentAgeGroup !== null && (
                  ageGroupOpen ? (
                    <div className="flex flex-col gap-0.5">
                      <input
                        type="number" min={5} max={18} autoFocus
                        value={foundingAgeGroup} onChange={e => setFoundingAgeGroup(e.target.value)}
                        onBlur={() => setAgeGroupOpen(false)}
                        className="border border-red-300 rounded-lg px-2 py-1 text-xl font-bold w-24 focus:outline-none focus:ring-2 focus:ring-red-700"
                      />
                      <span className="text-xs text-gray-400">Age in {foundingSeasonName || 'founding season'}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAgeGroupOpen(true)}
                      className="text-2xl font-bold text-gray-900 hover:text-red-800 transition cursor-pointer"
                      title="Click to edit age group"
                    >
                      Under {currentAgeGroup}
                    </button>
                  )
                )}
                {nameOpen ? (
                  <input
                    type="text" autoFocus required
                    value={name} onChange={e => setName(e.target.value)}
                    onBlur={() => setNameOpen(false)}
                    className="border border-red-300 rounded-lg px-2 py-1 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-red-700"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setNameOpen(true)}
                    className="text-2xl font-bold text-gray-900 hover:text-red-800 transition cursor-pointer"
                    title="Click to edit team name"
                  >
                    {name || (type === 'junior' ? 'Squad name' : 'Team name')}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-8 mb-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
                )}

                {type === 'junior' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <select
                        value={format} onChange={e => setFormat(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      >
                        <option value="">Not specified</option>
                        {['3v3','5v5','7v7','9v9','11v11'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* Default home venue */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Default home venue</label>
                    <select
                      value={defaultVenueId}
                      onChange={e => { setDefaultVenueId(e.target.value); setDefaultPitchId('') }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                    >
                      <option value="">None</option>
                      {venues.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  {defaultVenueId && pitches.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default pitch <span className="font-normal text-gray-400">(optional)</span></label>
                      <select
                        value={defaultPitchId}
                        onChange={e => setDefaultPitchId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700"
                      >
                        <option value="">No default</option>
                        {pitches.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Home kit */}
                <div className="border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={() => setHomeKitOpen(o => !o)}
                    className="w-full flex items-center justify-between group"
                  >
                    <p className="text-sm font-semibold text-gray-700">Home kit</p>
                    <div className="flex items-center gap-2">
                      {!homeKitOpen && (
                        <div className="flex gap-1">
                          {[kitJersey, kitShorts, kitSocks].map((c, i) => {
                            const col = KIT_COLOURS.find(k => k.value === c)
                            return col ? (
                              <span key={i} className="w-5 h-5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: col.hex, border: (col as any).border ? '1px solid #d1d5db' : 'none' }} title={col.label} />
                            ) : <span key={i} className="w-5 h-5 rounded-full bg-gray-100 inline-block" />
                          })}
                        </div>
                      )}
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${homeKitOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                  {homeKitOpen && (
                    <div className="mt-4">
                      <KitFields
                        jersey={kitJersey} setJersey={setKitJersey}
                        shorts={kitShorts} setShorts={setKitShorts}
                        socks={kitSocks}   setSocks={setKitSocks}
                      />
                    </div>
                  )}
                </div>

                {/* Away kit */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between">
                    {hasAwayKit ? (
                      <button
                        type="button"
                        onClick={() => setAwayKitOpen(o => !o)}
                        className="flex items-center justify-between w-full group"
                      >
                        <p className="text-sm font-semibold text-gray-700">Away kit</p>
                        <div className="flex items-center gap-2">
                          {!awayKitOpen && (
                            <div className="flex gap-1">
                              {[awayJersey, awayShorts, awaySocks].map((c, i) => {
                                const col = KIT_COLOURS.find(k => k.value === c)
                                return col ? (
                                  <span key={i} className="w-5 h-5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: col.hex, border: (col as any).border ? '1px solid #d1d5db' : 'none' }} title={col.label} />
                                ) : <span key={i} className="w-5 h-5 rounded-full bg-gray-100 inline-block" />
                              })}
                            </div>
                          )}
                          <svg className={`w-4 h-4 text-gray-400 transition-transform ${awayKitOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </button>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-700">Away kit</p>
                        <button
                          type="button"
                          onClick={() => { setHasAwayKit(true); setAwayKitOpen(true) }}
                          className="text-xs font-semibold px-3 py-1 rounded-full bg-red-50 text-red-800 hover:bg-red-100 transition"
                        >
                          + Add away kit
                        </button>
                      </>
                    )}
                  </div>
                  {hasAwayKit && awayKitOpen && (
                    <div className="mt-4 space-y-4">
                      <KitFields
                        jersey={awayJersey} setJersey={setAwayJersey}
                        shorts={awayShorts} setShorts={setAwayShorts}
                        socks={awaySocks}   setSocks={setAwaySocks}
                      />
                      <button
                        type="button"
                        onClick={() => { setHasAwayKit(false); setAwayKitOpen(false); setAwayJersey(''); setAwayShorts(''); setAwaySocks('') }}
                        className="text-xs text-red-600 hover:text-red-800 font-medium transition"
                      >
                        Remove away kit
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => router.push(returnTo)}
                    className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-lg text-sm transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-red-800 hover:bg-red-900 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Training */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Training schedule</span>
                {!addingTraining && (
                  <button type="button" onClick={() => setAddingTraining(true)} className="text-red-800 hover:text-red-900">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {trainingSlots.length === 0 && !addingTraining && (
                <p className="px-5 py-4 text-sm text-gray-400">No training slots added.</p>
              )}
              {trainingSlots.length > 0 && (
                <ul className="divide-y divide-gray-50">
                  {trainingSlots.map(slot => {
                    const start = slot.start_time?.slice(0, 5) ?? null
                    const end = slot.end_time?.slice(0, 5) ?? null
                    const timeStr = start && end ? `${start}–${end}` : start ? `from ${start}` : null
                    const isAlt = slot.frequency === 'Alternate' || slot.frequency === 'bi-weekly'
                    const dayStr = slot.day_of_week + (isAlt ? ' (Alt)' : '')
                    const freqPart = !isAlt && slot.frequency !== 'weekly' ? slot.frequency : null
                    const mainParts = [dayStr, freqPart, timeStr].filter(Boolean)
                    const venuePart = slot.venueName ? `@ ${slot.venueName}` : null
                    const parts = venuePart ? [...mainParts, venuePart] : mainParts
                    if (slot.notes) parts.push(slot.notes)
                    return (
                      <li key={slot.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <span className="text-sm text-gray-800">{parts.join(' · ')}</span>
                        <button type="button" onClick={() => removeSlot(slot.id)} className="text-xs text-gray-300 hover:text-red-500 transition flex-shrink-0">Remove</button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {addingTraining && (
                <div className="px-5 py-4 border-t border-gray-100 space-y-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Day</label>
                      <select value={tDay} onChange={e => setTDay(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                        {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Frequency</label>
                      <select value={tFreq} onChange={e => setTFreq(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                        <option value="weekly">Weekly</option>
                        <option value="Alternate">Alternate</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Start <span className="text-gray-400">(opt)</span></label>
                      <input type="time" value={tStart} onChange={e => setTStart(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">End <span className="text-gray-400">(opt)</span></label>
                      <input type="time" value={tEnd} onChange={e => setTEnd(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Venue <span className="text-gray-400">(opt)</span></label>
                    <select value={tVenueId} onChange={e => setTVenueId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                      <option value="">None</option>
                      {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes <span className="text-gray-400">(opt)</span></label>
                    <input type="text" value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="e.g. Bottom pitch" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={addSlot} disabled={tSaving} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 disabled:opacity-50 transition">{tSaving ? 'Saving…' : 'Add'}</button>
                    <button type="button" onClick={() => { setAddingTraining(false); setTStart(''); setTEnd(''); setTNotes(''); setTVenueId('') }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Competitions (current season) */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden mb-4">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Competitions</span>
                  {currentSeasonName && <span className="ml-2 text-xs text-gray-400">{currentSeasonName}</span>}
                </div>
                {!addingComp && (
                  <button type="button" onClick={() => setAddingComp(true)} className="text-red-800 hover:text-red-900">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {competitions.length === 0 && !addingComp && (
                <p className="px-5 py-4 text-sm text-gray-400">No competitions recorded.</p>
              )}
              {competitions.length > 0 && (
                <ul className="divide-y divide-gray-50">
                  {competitions.map(c => (
                    <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${c.type === 'league' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                          {c.type === 'league' ? 'League' : 'Cup'}
                        </span>
                        <div className="min-w-0">
                          <span className="text-sm text-gray-800 truncate block">{c.name}{c.abbr_name ? ` (${c.abbr_name})` : ''}</span>
                          {c.division && <span className="text-xs text-gray-400">Division {c.division}</span>}
                        </div>
                      </div>
                      <button type="button" onClick={() => removeComp(c.id)} className="text-xs text-gray-300 hover:text-red-500 transition flex-shrink-0">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              {addingComp && (
                <div className="px-5 py-4 border-t border-gray-100 space-y-3 bg-gray-50">
                  {cError && <p className="text-xs text-red-600">{cError}</p>}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select value={cType} onChange={e => setCType(e.target.value as 'league' | 'cup')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700">
                      <option value="league" disabled={competitions.some(c => c.type === 'league')}>League{competitions.some(c => c.type === 'league') ? ' (already added)' : ''}</option>
                      <option value="cup">Cup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{cType === 'league' ? 'League name' : 'Cup name'}</label>
                    <input type="text" autoFocus value={cName} onChange={e => setCName(e.target.value)} placeholder={cType === 'league' ? 'e.g. Sevenoaks and District Football League' : 'e.g. FA Cup'} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                  </div>
                  {cType === 'league' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Abbreviation <span className="text-gray-400">(opt)</span></label>
                        <input type="text" value={cAbbr} onChange={e => setCAbbr(e.target.value)} placeholder="e.g. SADFL" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Division <span className="text-gray-400">(opt)</span></label>
                        <input type="text" value={cDiv} onChange={e => setCDiv(e.target.value)} placeholder="e.g. 1" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={addComp} disabled={cSaving || !cName.trim()} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 disabled:opacity-50 transition">{cSaving ? 'Saving…' : 'Add'}</button>
                    <button type="button" onClick={() => { setAddingComp(false); setCName(''); setCAbbr(''); setCDiv(''); setCError(null) }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            {/* Sponsors (current season) */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden mb-6">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <span className="text-sm font-semibold text-gray-700">Sponsors</span>
                  {currentSeasonName && <span className="ml-2 text-xs text-gray-400">{currentSeasonName}</span>}
                </div>
                {!addingSponsor && (
                  <button type="button" onClick={() => setAddingSponsor(true)} className="text-red-800 hover:text-red-900">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
              {sponsors.length === 0 && !addingSponsor && (
                <p className="px-5 py-4 text-sm text-gray-400">No sponsors recorded.</p>
              )}
              {sponsors.length > 0 && (
                <ul className="divide-y divide-gray-50">
                  {sponsors.map(s => (
                    <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800">{s.name}</span>
                      <button type="button" onClick={() => removeSponsor(s.id)} className="text-xs text-gray-300 hover:text-red-500 transition flex-shrink-0">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
              {addingSponsor && (
                <div className="px-5 py-4 border-t border-gray-100 space-y-2 bg-gray-50">
                  <input type="text" autoFocus value={sName} onChange={e => setSName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSponsor() } }} placeholder="Sponsor name" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                  <div className="flex gap-2">
                    <button type="button" onClick={addSponsor} disabled={sSaving || !sName.trim()} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 disabled:opacity-50 transition">{sSaving ? 'Saving…' : 'Add'}</button>
                    <button type="button" onClick={() => { setAddingSponsor(false); setSName('') }} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancel</button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
              Team staff (managers, coaches, assistants) are now managed via <strong>Admin → Volunteers</strong>. Assign a team role to a volunteer there to give them access to this team.
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
