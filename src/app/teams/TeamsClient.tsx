'use client'

import { useState } from 'react'
import Link from 'next/link'

const COLOUR_MAP: Record<string, string> = {
  'light red': '#fca5a5', 'red': '#dc2626', 'dark red': '#991b1b', 'maroon': '#7f1d1d', 'burgundy': '#881337',
  'rose': '#fb7185', 'pink': '#ec4899', 'hot pink': '#db2777', 'magenta': '#a21caf',
  'peach': '#fdba74', 'orange': '#f97316', 'dark orange': '#c2410c', 'burnt orange': '#92400e',
  'yellow': '#fde047', 'amber': '#f59e0b', 'gold': '#d97706',
  'lime': '#a3e635', 'light green': '#4ade80', 'green': '#16a34a', 'dark green': '#15803d', 'forest': '#166534', 'emerald': '#059669',
  'sky blue': '#7dd3fc', 'light blue': '#38bdf8', 'cyan': '#06b6d4', 'blue': '#2563eb', 'royal blue': '#1d4ed8', 'dark blue': '#1e40af', 'navy': '#1e3a5f',
  'lilac': '#c084fc', 'purple': '#9333ea', 'violet': '#7c3aed', 'indigo': '#4f46e5',
  'white': '#f9fafb', 'cream': '#fef9c3', 'silver': '#e5e7eb', 'light grey': '#9ca3af', 'grey': '#6b7280', 'gray': '#6b7280', 'dark grey': '#374151', 'charcoal': '#1f2937', 'black': '#111827',
}

function kitColour(s: string | null): string {
  if (!s) return '#d1d5db'
  return COLOUR_MAP[s.toLowerCase()] ?? '#d1d5db'
}

function KitCircle({ jersey, shorts, size, title }: { jersey: string | null; shorts: string | null; size: 'sm' | 'lg'; title?: string }) {
  const cls = size === 'lg' ? 'w-11 h-11' : 'w-5 h-5'
  const border = size === 'lg' ? '2px solid rgba(0,0,0,0.1)' : '1.5px solid rgba(0,0,0,0.1)'
  return (
    <div className={`${cls} rounded-full overflow-hidden flex-shrink-0`} style={{ border }} title={title}>
      <div style={{ height: '50%', background: kitColour(jersey) }} />
      <div style={{ height: '50%', background: kitColour(shorts) }} />
    </div>
  )
}

function fmtTime(t: string | null) {
  if (!t) return null
  return t.slice(0, 5)
}

function genderBadge(g: string) {
  const cls = g === 'Male' ? 'bg-blue-100 text-blue-700' : g === 'Female' ? 'bg-pink-100 text-pink-700' : 'bg-green-100 text-green-700'
  return <span key={g} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{g}</span>
}

type FilterType = 'all' | 'senior' | 'junior'
type FilterGender = 'all' | 'Male' | 'Female' | 'Mixed'

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${active ? 'bg-red-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {children}
    </button>
  )
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      {options.map(o => (
        <FilterPill key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>{o.label}</FilterPill>
      ))}
    </div>
  )
}

type FilterPanelProps = {
  filterType: FilterType; setFilterType: (v: FilterType) => void
  filterGender: FilterGender; setFilterGender: (v: FilterGender) => void
  filterFormat: string; setFilterFormat: (v: string) => void
  filterVenue: string; setFilterVenue: (v: string) => void
  showFormat: boolean; formats: string[]
  venueNames: string[]
}

function FilterPanel({ filterType, setFilterType, filterGender, setFilterGender, filterFormat, setFilterFormat, filterVenue, setFilterVenue, showFormat, formats, venueNames }: FilterPanelProps) {
  return (
    <div className="space-y-3">
      <FilterSelect
        label="Type"
        value={filterType}
        onChange={v => setFilterType(v as FilterType)}
        options={[{ value: 'all', label: 'All' }, { value: 'senior', label: 'Senior' }, { value: 'junior', label: 'Junior' }]}
      />
      <FilterSelect
        label="Gender"
        value={filterGender}
        onChange={v => setFilterGender(v as FilterGender)}
        options={[{ value: 'all', label: 'All' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Mixed', label: 'Mixed' }]}
      />
      {showFormat && (
        <FilterSelect
          label="Format"
          value={filterFormat}
          onChange={setFilterFormat}
          options={[{ value: 'all', label: 'All' }, ...formats.map(f => ({ value: f, label: f }))]}
        />
      )}
      {venueNames.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">Home</span>
          <FilterPill active={filterVenue === 'all'} onClick={() => setFilterVenue('all')}>All</FilterPill>
          {venueNames.map(v => (
            <FilterPill key={v} active={filterVenue === v} onClick={() => setFilterVenue(v)}>{v}</FilterPill>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeamsClient({ teams, isAdmin, venueNames, formats }: {
  teams: any[]
  isAdmin: boolean
  venueNames: string[]
  formats: string[]
}) {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterGender, setFilterGender] = useState<FilterGender>('all')
  const [filterFormat, setFilterFormat] = useState('all')
  const [filterVenue, setFilterVenue] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filtered = teams.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterGender !== 'all' && t.gender !== filterGender) return false
    if (filterFormat !== 'all' && t.format !== filterFormat) return false
    if (filterVenue !== 'all' && t.venueName !== filterVenue) return false
    return true
  })

  const activeCount = (filterType !== 'all' ? 1 : 0) + (filterGender !== 'all' ? 1 : 0) + (filterFormat !== 'all' ? 1 : 0) + (filterVenue !== 'all' ? 1 : 0)

  const showFormat = (filterType === 'all' || filterType === 'junior') && formats.length > 0

  const filterPanelProps: FilterPanelProps = {
    filterType, setFilterType, filterGender, setFilterGender,
    filterFormat, setFilterFormat, filterVenue, setFilterVenue,
    showFormat, formats, venueNames,
  }

  return (
    <>
      {/* Filters — collapsible on all screen sizes */}
      <div className="mb-4">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 4h18M7 9h10M10 14h4M12 19h0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
        {filtersOpen && (
          <div className="mt-2 p-4 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
            <FilterPanel {...filterPanelProps} />
          </div>
        )}
      </div>

      {/* Team cards */}
      <div className="space-y-3">
        {filtered.map((team: any) => (
          <div key={team.id} className="relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition group">
            <Link href={`/teams/${team.id}`} className="block px-5 py-4 pr-14">
              <div className="flex items-start gap-4">

                {/* Kit circles — desktop left side, stacked */}
                <div className="hidden sm:flex flex-col gap-1 flex-shrink-0 mt-0.5">
                  <KitCircle jersey={team.kit_jersey ?? null} shorts={team.kit_shorts ?? null} size="lg"
                    title={[team.kit_jersey, team.kit_shorts].filter(Boolean).join(' · ')} />
                  {team.away_kit_jersey ? (
                    <KitCircle jersey={team.away_kit_jersey ?? null} shorts={team.away_kit_shorts ?? null} size="lg"
                      title={[team.away_kit_jersey, team.away_kit_shorts].filter(Boolean).join(' · ')} />
                  ) : (
                    <div className="w-11 h-11" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-red-800 transition">
                      {team.displayName}
                    </p>
                    {/* Kit circles — mobile inline after name */}
                    <div className="sm:hidden flex gap-1 flex-shrink-0">
                      <KitCircle jersey={team.kit_jersey ?? null} shorts={team.kit_shorts ?? null} size="sm"
                        title={[team.kit_jersey, team.kit_shorts].filter(Boolean).join(' · ')} />
                      {team.away_kit_jersey && (
                        <KitCircle jersey={team.away_kit_jersey ?? null} shorts={team.away_kit_shorts ?? null} size="sm"
                          title={[team.away_kit_jersey, team.away_kit_shorts].filter(Boolean).join(' · ')} />
                      )}
                    </div>
                  </div>

                  {/* Badges row — always on its own line so alignment is consistent */}
                  {(team.format || team.gender) && (
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {team.gender && genderBadge(team.gender)}
                      {team.format && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          {team.format}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Detail rows */}
                  <div className="mt-1.5 space-y-1">
                    {team.roleLines.map((r: { label: string; names: string[] }, i: number) =>
                      r.names.map((name: string, j: number) => (
                        <div key={`${i}-${j}`} className="flex items-baseline gap-2">
                          <span className={`w-20 flex-shrink-0 text-xs ${j === 0 ? 'text-gray-400' : 'invisible'}`}>{r.label}</span>
                          <span className="text-xs text-gray-700">{name}</span>
                        </div>
                      ))
                    )}
                    {team.league && (
                      <div className="flex items-baseline gap-2">
                        <span className="w-20 flex-shrink-0 text-xs text-gray-400">League</span>
                        <span className="text-xs text-gray-700">
                          {team.league.abbr_name ?? team.league.name}{team.league.division ? ` - ${team.league.division}` : ''}
                        </span>
                      </div>
                    )}
                    {team.venueName && (
                      <div className="flex items-baseline gap-2">
                        <span className="w-20 flex-shrink-0 text-xs text-gray-400">Home</span>
                        <span className="text-xs text-gray-700">{team.venueName}</span>
                      </div>
                    )}
                    {team.slots.map((slot: any, i: number) => {
                      const start = fmtTime(slot.start_time)
                      const end = fmtTime(slot.end_time)
                      const timeStr = start && end ? `${start}–${end}` : start ? `from ${start}` : null
                      const isAlt = slot.frequency === 'Alternate' || slot.frequency === 'bi-weekly'
                      const dayStr = slot.day_of_week + 's' + (isAlt ? ' (Alt)' : '')
                      const freqPart = !isAlt && slot.frequency !== 'weekly' ? slot.frequency : null
                      const mainParts = [dayStr, freqPart, timeStr].filter(Boolean)
                      const venuePart = slot.venues?.name ? `@ ${slot.venues.name}` : null
                      const display = venuePart ? `${mainParts.join(' ')} ${venuePart}` : mainParts.join(' ')
                      return (
                        <div key={i} className="flex items-baseline gap-2">
                          <span className={`w-20 flex-shrink-0 text-xs ${i === 0 ? 'text-gray-400' : 'invisible'}`}>Training</span>
                          <span className="text-xs text-gray-700">{display}</span>
                        </div>
                      )
                    })}
                    {team.sponsors.map((name: string, i: number) => (
                      <div key={i} className="flex items-baseline gap-2">
                        <span className={`w-20 flex-shrink-0 text-xs ${i === 0 ? 'text-gray-400' : 'invisible'}`}>
                          {i === 0 ? (team.sponsors.length > 1 ? 'Sponsors' : 'Sponsor') : 'Sponsor'}
                        </span>
                        <span className="text-xs text-gray-700">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>

            {isAdmin && (
              <Link
                href={`/admin/teams/${team.id}/edit?from=/teams`}
                className="absolute top-3.5 right-4 p-1.5 rounded-lg text-gray-300 hover:text-red-800 hover:bg-red-50 transition"
                title="Edit team"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-gray-400">{teams.length === 0 ? 'No teams added yet.' : 'No teams match the selected filters.'}</p>
        )}
      </div>
    </>
  )
}
