'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { createClient } from '@/lib/supabase/client'
import { updateFixture, assignRefereeFromRequest, savePerformances, saveMatchNotes, type PlayerPerformance } from '../../actions'
import DeleteFixtureButton from '../../DeleteFixtureButton'
import CancelFixtureButton from '../../CancelFixtureButton'
import ReviewLinks from '../ReviewLinks'
import LeagueEmailImport from '../LeagueEmailImport'
import FixtureCardDownload from '../FixtureCardDownload'
import { buildOpponentOptions, type OpponentOption } from '@/lib/opponentUtils'
import { sortedTeams, teamDisplayName } from '@/lib/teamSort'

type Venue = { id: string; name: string; address?: string | null }
type Pitch = { id: string; name: string; venue_id: string }
type Referee = { id: string; full_name: string | null; isVolunteer?: boolean }
type RefRequest = { id: string; referee_id: string; refereeName: string; created_at: string }
type Player = { id: string; first_name: string; last_name: string; player_number: number | null }

// ── Small inline helpers ──────────────────────────────────────────────────────

const PencilIcon = () => (
  <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

function FieldRow({
  label, value, editing, onEdit, onCancel, children,
  readOnly = false,
}: {
  label: string
  value: React.ReactNode
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  children: React.ReactNode
  readOnly?: boolean
}) {
  return (
    <div
      className={`flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 group ${!readOnly && !editing ? 'cursor-pointer hover:bg-gray-50/60 rounded-lg px-2 -mx-2' : editing ? 'px-2 -mx-2' : ''}`}
      onClick={!readOnly && !editing ? onEdit : undefined}
    >
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-24 flex-shrink-0 pt-1">{label}</span>
      {editing ? (
        <div className="flex-1 space-y-2">
          {children}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-gray-800 flex-1 min-w-0">{value}</span>
          {!readOnly && (
            <span className="opacity-0 group-hover:opacity-100 text-gray-300 transition flex-shrink-0">
              <PencilIcon />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
        {badge}
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  )
}

function formatDateDisplay(d: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(t: string) {
  if (!t) return 'TBC'
  const [h, m] = t.split(':')
  return `${h}:${m}`
}

const COMP_LABELS: Record<string, string> = {
  friendly: 'Friendly', league: 'League', cup: 'Cup', shield: 'Shield',
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditFixturePage() {
  const { id: teamId, fixtureId } = useParams<{ id: string; fixtureId: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [opponents, setOpponents] = useState<OpponentOption[]>([])
  const [internalTeams, setInternalTeams] = useState<{ id: string; label: string }[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [referees, setReferees] = useState<Referee[]>([])
  const [refRequests, setRefRequests] = useState<RefRequest[]>([])
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const [seasonId, setSeasonId] = useState('')
  const [date, setDate] = useState('')
  const [tbc, setTbc] = useState(false)
  const [kickoffTime, setKickoffTime] = useState('')
  const [opponentId, setOpponentId] = useState('')
  const [opponentName, setOpponentName] = useState('')
  const [venue, setVenue] = useState('home')
  const [competition, setCompetition] = useState('friendly')
  const [homeVenueId, setHomeVenueId] = useState('')
  const [pitchId, setPitchId] = useState('')
  const [refereeRequired, setRefereeRequired] = useState(true)
  const [leagueAssignedReferee, setLeagueAssignedReferee] = useState(false)
  const [refereeId, setRefereeId] = useState('')
  const [goalsFor, setGoalsFor] = useState<string>('')
  const [goalsAgainst, setGoalsAgainst] = useState<string>('')
  const [isPast, setIsPast] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [isCancelled, setIsCancelled] = useState(false)
  const [cancellationReason, setCancellationReason] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [matchNotes, setMatchNotes] = useState('')
  const [isMirror, setIsMirror] = useState(false)
  const [isIntraClubPrimary, setIsIntraClubPrimary] = useState(false)
  const [intraClubTeamId, setIntraClubTeamId] = useState('')

  const [players, setPlayers] = useState<Player[]>([])
  const [perfs, setPerfs] = useState<Record<string, PlayerPerformance>>({})
  const [leagueEmailExisting, setLeagueEmailExisting] = useState<any>({ loaded: false })

  // originals for discard
  const originalsRef = useRef<Record<string, any>>({})

  function mark() { setDirty(true) }

  useEffect(() => {
    async function load() {
      const [
        { data: { user } },
        { data: fixture },
        { data: clubsData },
        { data: venuesData },
        { data: refereesData },
        { data: requestsData },
        { data: volunteerRefsData },
        { data: allTeamsData },
        { data: seasonsData },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('fixtures').select('*').eq('id', fixtureId).single(),
        supabase.from('clubs').select('id, name, club_teams(id, name, internal_team_id)').order('name'),
        supabase.from('venues').select('id, name, address').order('name'),
        supabase.from('profiles').select('id, full_name').eq('is_referee', true).order('full_name'),
        supabase.from('referee_requests').select('id, referee_id, created_at, profiles(full_name)').eq('fixture_id', fixtureId).order('created_at'),
        supabase.from('volunteers').select('id, first_name, last_name, profile_id').eq('is_referee', true),
        supabase.from('teams').select('id, name, type, founding_age_group, founding_season_id, age_group, nickname').order('name'),
        supabase.from('seasons').select('id, name, start_date, is_current').order('start_date', { ascending: false }),
      ])

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(profile?.role === 'admin')
      }

      const opts = buildOpponentOptions((clubsData ?? []) as any)
      setOpponents(opts)

      const allSeasons = seasonsData ?? []
      const ordered = sortedTeams(allTeamsData ?? [], allSeasons)
      setInternalTeams(ordered.map((t: any) => ({ id: `internal:${t.id}`, label: teamDisplayName(t, allSeasons) })))
      const thisTeam = (allTeamsData ?? []).find((t: any) => t.id === teamId)
      if (thisTeam) setTeamName(teamDisplayName(thisTeam as any, allSeasons))
      setVenues((venuesData ?? []) as Venue[])

      const profileRefIds = new Set((refereesData ?? []).map((r: any) => r.id))
      const volRefs = (volunteerRefsData ?? [])
        .filter((v: any) => !v.profile_id || !profileRefIds.has(v.profile_id))
        .map((v: any) => ({ id: `vol:${v.id}`, full_name: `${v.first_name} ${v.last_name}`, isVolunteer: true }))
      setReferees([...(refereesData ?? []), ...volRefs].sort((a: any, b: any) => (a.full_name ?? '').localeCompare(b.full_name ?? '')))
      setRefRequests((requestsData ?? []).map((r: any) => ({
        id: r.id,
        referee_id: r.referee_id,
        refereeName: r.profiles?.full_name ?? '—',
        created_at: r.created_at,
      })))

      if (fixture) {
        const lar = !!(fixture as any).league_assigned_referee
        const isHome = fixture.venue === 'home'
        const refRequired = !lar && (isHome ? (fixture.referee_required ?? true) : false)
        const refIdVal = fixture.referee_id
          ? fixture.referee_id
          : fixture.volunteer_referee_id
            ? `vol:${fixture.volunteer_referee_id}`
            : ''
        const goalsForVal = fixture.goals_for != null ? String(fixture.goals_for) : ''
        const goalsAgainstVal = fixture.goals_against != null ? String(fixture.goals_against) : ''
        const notesVal = (fixture as any).notes ?? ''
        const confirmedVal = !!(fixture as any).confirmed
        const competitionVal = fixture.competition ?? 'friendly'

        setSeasonId(fixture.season_id ?? '')
        setDate(fixture.date)
        setTbc(!fixture.kickoff_time)
        setKickoffTime(fixture.kickoff_time ?? '')
        setOpponentId(fixture.opponent_id ?? 'tbc')
        setVenue(fixture.venue)
        setCompetition(competitionVal)
        setHomeVenueId(fixture.home_venue_id ?? '')
        setPitchId(fixture.pitch_id ?? '')
        setLeagueAssignedReferee(lar)
        setRefereeRequired(refRequired)
        setRefereeId(refIdVal)
        setGoalsFor(goalsForVal)
        setGoalsAgainst(goalsAgainstVal)
        setIsPast(fixture.date < new Date().toISOString().split('T')[0])
        setMatchNotes(notesVal)
        setConfirmed(confirmedVal)
        setIsCancelled(!!(fixture as any).cancelled)
        setCancellationReason((fixture as any).cancellation_reason ?? null)
        const mirror = !!(fixture as any).is_mirror
        setIsMirror(mirror)
        setIsIntraClubPrimary(!mirror && !!(fixture as any).linked_fixture_id)

        const f = fixture as any
        const hasLeagueData = !!(f.opp_manager_name || f.opp_fixture_sec_name || f.opp_colours || f.league_notes || f.opp_venue_name)
        setLeagueEmailExisting(hasLeagueData ? {
          loaded: true,
          videoingAllowed: f.videoing_allowed ?? null,
          leagueNotes: f.league_notes ?? null,
          oppColours: f.opp_colours ?? null,
          oppFixtureSecName: f.opp_fixture_sec_name ?? null,
          oppFixtureSecEmail: f.opp_fixture_sec_email ?? null,
          oppFixtureSecPhone: f.opp_fixture_sec_phone ?? null,
          oppManagerName: f.opp_manager_name ?? null,
          oppManagerEmail: f.opp_manager_email ?? null,
          oppManagerPhone: f.opp_manager_phone ?? null,
          oppVenueName: f.opp_venue_name ?? null,
          oppVenueAddress: f.opp_venue_address ?? null,
        } : { loaded: false })

        // Capture originals for discard
        originalsRef.current = {
          date: fixture.date, tbc: !fixture.kickoff_time, kickoffTime: fixture.kickoff_time ?? '',
          opponentId: fixture.opponent_id ?? 'tbc', venue: fixture.venue,
          competition: competitionVal, homeVenueId: fixture.home_venue_id ?? '',
          pitchId: fixture.pitch_id ?? '', leagueAssignedReferee: lar,
          refereeRequired: refRequired, refereeId: refIdVal,
          goalsFor: goalsForVal, goalsAgainst: goalsAgainstVal,
          confirmed: confirmedVal, matchNotes: notesVal,
        }

        if (fixture.home_venue_id) {
          const { data: pitchData } = await supabase
            .from('pitches').select('id, name, venue_id').eq('venue_id', fixture.home_venue_id).eq('is_active', true)
          setPitches(pitchData ?? [])
        }

        // Resolve opponent name
        if (fixture.opponent_id && fixture.opponent_id !== 'tbc') {
          const isKnownOption = opts.some((o: any) => o.value === fixture.opponent_id)
          if (!isKnownOption) {
            const { data: ct } = await supabase
              .from('club_teams').select('id, club_id, internal_team_id, name').eq('id', fixture.opponent_id).maybeSingle()
            if (ct?.internal_team_id) {
              setOpponentId(`internal:${ct.internal_team_id}`)
              setIntraClubTeamId(ct.internal_team_id)
            } else if (ct?.club_id && (!ct.name || !ct.name.trim())) {
              setOpponentId(`club:${ct.club_id}`)
            }
          }
        }

        if (fixture.season_id) {
          const [{ data: playerRows }, { data: existingPerfs }] = await Promise.all([
            supabase.from('player_team_seasons')
              .select('player_number, players(id, first_name, last_name)')
              .eq('team_id', teamId).eq('season_id', fixture.season_id),
            supabase.from('fixture_player_performances').select('*').eq('fixture_id', fixtureId),
          ])
          const loadedPlayers = (playerRows ?? [])
            .map((r: any) => r.players ? { ...r.players, player_number: r.player_number ?? null } : null)
            .filter(Boolean)
            .sort((a: any, b: any) => {
              if (a.player_number != null && b.player_number != null) return a.player_number - b.player_number
              if (a.player_number != null) return -1
              if (b.player_number != null) return 1
              return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
            })
          setPlayers(loadedPlayers)
          const perfMap: Record<string, PlayerPerformance> = {}
          for (const p of loadedPlayers) {
            perfMap[p.id] = { player_id: p.id, played: false, goals: 0, assists: 0, motm: false, mins_played: 0 }
          }
          for (const ep of existingPerfs ?? []) {
            perfMap[ep.player_id] = { player_id: ep.player_id, played: ep.played, goals: ep.goals, assists: ep.assists, motm: ep.motm, mins_played: ep.mins_played }
          }
          setPerfs(perfMap)
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  // Keep opponentName in sync
  useEffect(() => {
    if (opponentId === 'tbc' || !opponentId) { setOpponentName('TBC'); return }
    const opt = opponents.find(o => o.value === opponentId)
    if (opt) { setOpponentName(opt.label); return }
    const intOpt = internalTeams.find(t => t.id === opponentId || t.id === `internal:${intraClubTeamId}`)
    if (intOpt) { setOpponentName(intOpt.label); return }
    setOpponentName(opponentId)
  }, [opponentId, opponents, internalTeams, intraClubTeamId])

  function discard() {
    const o = originalsRef.current
    setDate(o.date); setTbc(o.tbc); setKickoffTime(o.kickoffTime)
    setOpponentId(o.opponentId); setVenue(o.venue); setCompetition(o.competition)
    setHomeVenueId(o.homeVenueId); setPitchId(o.pitchId)
    setLeagueAssignedReferee(o.leagueAssignedReferee); setRefereeRequired(o.refereeRequired)
    setRefereeId(o.refereeId); setGoalsFor(o.goalsFor); setGoalsAgainst(o.goalsAgainst)
    setConfirmed(o.confirmed); setMatchNotes(o.matchNotes)
    setDirty(false); setEditingField(null)
  }

  function startEdit(field: string) { setEditingField(field) }
  function stopEdit() { setEditingField(null) }
  function saveField(field: string) { setEditingField(null); mark() }

  function returnUrl() {
    const from = searchParams.get('from')
    if (from) return from
    return seasonId ? `/teams/${teamId}?season=${seasonId}&tab=fixtures` : `/teams/${teamId}?tab=fixtures`
  }

  async function handleVenueChange(id: string) {
    setHomeVenueId(id); setPitchId('')
    if (id) {
      const { data } = await supabase.from('pitches').select('id, name, venue_id').eq('venue_id', id).eq('is_active', true)
      setPitches(data ?? [])
    } else { setPitches([]) }
  }

  function updatePerf(playerId: string, field: keyof Omit<PlayerPerformance, 'player_id'>, value: boolean | number) {
    setPerfs(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: value } }))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    const fd = new FormData()
    fd.set('date', date); fd.set('tbc', tbc ? 'true' : 'false'); fd.set('kickoff_time', kickoffTime)
    fd.set('opponent_id', isIntraClubPrimary ? `internal:${intraClubTeamId}` : opponentId)
    fd.set('intra_club_team_id', isIntraClubPrimary ? intraClubTeamId : '')
    fd.set('venue', venue); fd.set('competition', competition)
    fd.set('home_venue_id', venue === 'home' ? homeVenueId : '')
    fd.set('pitch_id', venue === 'home' ? pitchId : '')
    fd.set('league_assigned_referee', leagueAssignedReferee ? 'true' : 'false')
    fd.set('referee_required', refereeRequired ? 'true' : 'false')
    fd.set('referee_id', refereeRequired ? refereeId : '')
    fd.set('goals_for', goalsFor); fd.set('goals_against', goalsAgainst)
    fd.set('confirmed', confirmed ? 'true' : 'false')
    const result = await updateFixture(fixtureId, teamId, fd)
    if (result?.error) { setError(result.error); setSaving(false); return }
    await Promise.all([
      saveMatchNotes(fixtureId, teamId, matchNotes),
      savePerformances(fixtureId, teamId, Object.values(perfs)),
    ])
    router.push(returnUrl())
  }

  // ── Derived display values ────────────────────────────────────────────────
  const homeVenueName = venues.find(v => v.id === homeVenueId)?.name ?? null
  const homeVenueObj = venues.find(v => v.id === homeVenueId) ?? null
  const pitchName = pitches.find(p => p.id === pitchId)?.name ?? null
  const refereeName = referees.find(r => r.id === refereeId)?.full_name ?? null

  const resultLabel = goalsFor !== '' && goalsAgainst !== ''
    ? Number(goalsFor) > Number(goalsAgainst) ? 'Win'
      : Number(goalsFor) < Number(goalsAgainst) ? 'Loss' : 'Draw'
    : null

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 bg-white'
  const selectCls = inputCls

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-5">
          <Link href={`/teams/${teamId}`} className="hover:text-gray-700 transition">{teamName || 'Team'}</Link>
          <span>›</span>
          <Link href={returnUrl()} className="hover:text-gray-700 transition">Fixtures</Link>
          <span>›</span>
          <span className="text-gray-600 font-medium">
            {opponentName ? `vs ${opponentName}` : 'Fixture'}
          </span>
        </nav>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-6 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {!isMirror && (
              <>
                <CancelFixtureButton
                  fixtureId={fixtureId} teamId={teamId}
                  teamName={teamName}
                  opponentName={opponents.find(o => o.value === opponentId)?.label ?? opponentName}
                  isCancelled={isCancelled} cancellationReason={cancellationReason}
                />
                {!refereeId && (
                  <DeleteFixtureButton fixtureId={fixtureId} teamId={teamId} returnTo={returnUrl()} />
                )}
              </>
            )}
            <FixtureCardDownload fixtureId={fixtureId} teamId={teamId} isIntraClub={isIntraClubPrimary} />
          </div>
          <div className="flex items-center gap-3">
            {dirty ? (
              <>
                <button type="button" onClick={discard} disabled={saving}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition disabled:opacity-50">
                  Discard
                </button>
                <button type="button" onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 text-sm font-semibold bg-red-800 hover:bg-red-900 text-white px-4 py-1.5 rounded-lg transition disabled:opacity-60">
                  {saving ? 'Saving…' : (
                    <>
                      <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                        <polyline points="17 21 17 13 7 13 7 21"/>
                        <polyline points="7 3 7 8 15 8"/>
                      </svg>
                      Save changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400">Click any field to edit</span>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-12 text-center">Loading…</p>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
            )}
            {isMirror && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-xl px-4 py-3 mb-4">
                This is an intra-club mirror fixture. Date, kick-off and competition are controlled by the home team's fixture.
              </div>
            )}

            {/* Two-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

              {/* ── LEFT COLUMN ── */}
              <div className="space-y-4">

                {/* Fixture details card */}
                <SectionCard
                  title="Fixture details"
                  badge={
                    isCancelled ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Cancelled</span>
                    ) : confirmed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Confirmed</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Unconfirmed</span>
                    )
                  }
                >
                  {/* Date */}
                  <FieldRow
                    label="Date" readOnly={isMirror}
                    value={formatDateDisplay(date)}
                    editing={editingField === 'date'}
                    onEdit={() => startEdit('date')}
                    onCancel={stopEdit}
                  >
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} style={{ maxWidth: 200 }} />
                    <button type="button" onClick={() => saveField('date')}
                      className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                  </FieldRow>

                  {/* Kick-off */}
                  <FieldRow
                    label="Kick-off" readOnly={isMirror}
                    value={tbc ? 'TBC' : formatTime(kickoffTime)}
                    editing={editingField === 'kickoff'}
                    onEdit={() => startEdit('kickoff')}
                    onCancel={stopEdit}
                  >
                    <div className="flex items-center gap-3">
                      {!tbc && <input type="time" value={kickoffTime} onChange={e => setKickoffTime(e.target.value)} className={inputCls} style={{ maxWidth: 140 }} />}
                      <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={tbc} onChange={e => setTbc(e.target.checked)} className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
                        TBC
                      </label>
                    </div>
                    <button type="button" onClick={() => saveField('kickoff')}
                      className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                  </FieldRow>

                  {/* Competition */}
                  <FieldRow
                    label="Competition" readOnly={isMirror}
                    value={COMP_LABELS[competition] ?? competition}
                    editing={editingField === 'competition'}
                    onEdit={() => startEdit('competition')}
                    onCancel={stopEdit}
                  >
                    <select value={competition} onChange={e => setCompetition(e.target.value)} className={selectCls} style={{ maxWidth: 200 }}>
                      <option value="friendly">Friendly</option>
                      <option value="league">League</option>
                      <option value="cup">Cup</option>
                      <option value="shield">Shield</option>
                    </select>
                    <button type="button" onClick={() => saveField('competition')}
                      className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                  </FieldRow>

                  {/* Opponent */}
                  <FieldRow
                    label="Opponent" readOnly={isMirror}
                    value={opponentName || '—'}
                    editing={editingField === 'opponent'}
                    onEdit={() => startEdit('opponent')}
                    onCancel={stopEdit}
                  >
                    {isIntraClubPrimary ? (
                      <select value={intraClubTeamId} onChange={e => { setIntraClubTeamId(e.target.value); mark() }} className={selectCls}>
                        <option value="">Select opponent team…</option>
                        {internalTeams.filter(t => t.id !== `internal:${teamId}`).map(t => (
                          <option key={t.id} value={t.id.replace('internal:', '')}>{t.label}</option>
                        ))}
                      </select>
                    ) : (
                      <select value={opponentId} onChange={e => setOpponentId(e.target.value)} className={selectCls}>
                        <option value="">Select opponent…</option>
                        <option value="tbc">TBC</option>
                        {opponents.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        {internalTeams.length > 0 && (
                          <optgroup label="── Internal Teams ──">
                            {internalTeams.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </optgroup>
                        )}
                      </select>
                    )}
                    <button type="button" onClick={() => saveField('opponent')}
                      className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                  </FieldRow>

                  {/* Confirmed */}
                  <FieldRow
                    label="Confirmed"
                    value={
                      <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={confirmed}
                          onChange={e => { setConfirmed(e.target.checked); mark() }}
                          className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
                        <span className={confirmed ? 'text-green-700 font-medium' : 'text-gray-400'}>{confirmed ? 'Yes' : 'No'}</span>
                      </label>
                    }
                    editing={false} onEdit={() => {}} onCancel={() => {}} readOnly
                  >{null}</FieldRow>

                  {/* Venue type */}
                  <FieldRow
                    label="Venue" readOnly={isMirror}
                    value={venue.charAt(0).toUpperCase() + venue.slice(1)}
                    editing={editingField === 'venue'}
                    onEdit={() => startEdit('venue')}
                    onCancel={stopEdit}
                  >
                    <div className="flex gap-4">
                      {(['home', 'away', 'neutral'] as const).map(v => (
                        <label key={v} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                          <input type="radio" name="venue-edit" value={v} checked={venue === v}
                            onChange={() => { setVenue(v); if (v !== 'home') setRefereeRequired(false) }}
                            className="text-red-800 focus:ring-red-700" />
                          {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={() => saveField('venue')}
                      className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                  </FieldRow>

                  {/* Home venue / pitch — only when home */}
                  {isAdmin && venue === 'home' && (
                    <>
                      <FieldRow
                        label="Ground"
                        value={homeVenueName ?? <span className="text-gray-400">Not assigned</span>}
                        editing={editingField === 'ground'}
                        onEdit={() => startEdit('ground')}
                        onCancel={stopEdit}
                      >
                        <select value={homeVenueId} onChange={e => handleVenueChange(e.target.value)} className={selectCls} style={{ maxWidth: 260 }}>
                          <option value="">Not assigned</option>
                          {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                        <button type="button" onClick={() => saveField('ground')}
                          className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                      </FieldRow>
                      {homeVenueId && (
                        <FieldRow
                          label="Pitch"
                          value={pitchName ?? <span className="text-gray-400">Not assigned</span>}
                          editing={editingField === 'pitch'}
                          onEdit={() => startEdit('pitch')}
                          onCancel={stopEdit}
                        >
                          {pitches.length === 0 ? (
                            <p className="text-sm text-gray-400">No pitches for this venue.</p>
                          ) : (
                            <select value={pitchId} onChange={e => setPitchId(e.target.value)} className={selectCls} style={{ maxWidth: 260 }}>
                              <option value="">Not assigned</option>
                              {pitches.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          )}
                          <button type="button" onClick={() => saveField('pitch')}
                            className="text-xs font-semibold px-3 py-1.5 bg-red-800 text-white rounded-lg hover:bg-red-900 transition">Save</button>
                        </FieldRow>
                      )}
                    </>
                  )}
                </SectionCard>

                {/* Referee (admin only) */}
                {isAdmin && !isMirror && (
                  <SectionCard title="Referee">
                    {refRequests.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Requests</p>
                        <ul className="divide-y divide-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                          {refRequests.map(r => (
                            <li key={r.id} className="flex items-center justify-between px-4 py-3 bg-white">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{r.refereeName}</p>
                                <p className="text-xs text-gray-400">
                                  {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <button type="button" disabled={assigningId === r.referee_id}
                                onClick={async () => {
                                  setAssigningId(r.referee_id)
                                  const result = await assignRefereeFromRequest(fixtureId, r.referee_id, teamId)
                                  if (result?.error) setError(result.error)
                                  else { setRefereeId(r.referee_id); mark() }
                                  setAssigningId(null)
                                }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-800 text-white hover:bg-red-900 transition disabled:opacity-50">
                                {assigningId === r.referee_id ? '…' : 'Assign'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-4">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" checked={refereeRequired} disabled={leagueAssignedReferee}
                            onChange={e => { setRefereeRequired(e.target.checked); mark() }}
                            className="rounded border-gray-300 text-red-800 focus:ring-red-700 disabled:opacity-40" />
                          Referee required
                        </label>
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" checked={leagueAssignedReferee}
                            onChange={e => { setLeagueAssignedReferee(e.target.checked); if (e.target.checked) setRefereeRequired(false); mark() }}
                            className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
                          League assigned
                        </label>
                      </div>
                      {refereeRequired && (
                        <select value={refereeId} onChange={e => { setRefereeId(e.target.value); mark() }} className={selectCls}>
                          <option value="">Not assigned</option>
                          {referees.map(r => <option key={r.id} value={r.id}>{r.full_name ?? '—'}</option>)}
                        </select>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Result — only past fixtures */}
                {isPast ? (
                  <SectionCard
                    title="Result"
                    badge={
                      resultLabel ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          resultLabel === 'Win' ? 'bg-green-100 text-green-700'
                          : resultLabel === 'Loss' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                        }`}>{resultLabel}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Not entered</span>
                      )
                    }
                  >
                    <div className="flex items-center gap-4 py-1">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-400 mb-1">{teamName}</p>
                        <input type="number" min={0} value={goalsFor} onChange={e => { setGoalsFor(e.target.value); mark() }}
                          placeholder="—" className={`${inputCls} text-center text-2xl font-bold`} />
                      </div>
                      <div className="text-gray-300 font-bold text-xl pt-5">–</div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-400 mb-1">{opponentName}</p>
                        <input type="number" min={0} value={goalsAgainst} onChange={e => { setGoalsAgainst(e.target.value); mark() }}
                          placeholder="—" className={`${inputCls} text-center text-2xl font-bold`} />
                      </div>
                    </div>
                  </SectionCard>
                ) : (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-5 py-4">
                    <svg width="18" height="18" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24" className="flex-shrink-0">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p className="text-sm text-blue-700">Result and match notes will be available once this fixture has been played.</p>
                  </div>
                )}

                {/* Match notes — only past */}
                {isPast && (
                  <SectionCard title="Match notes">
                    <textarea value={matchNotes} onChange={e => { setMatchNotes(e.target.value); mark() }}
                      rows={4} placeholder="Notes about the match…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y" />
                    <p className="text-xs text-gray-400 mt-1.5">Not shared externally</p>
                  </SectionCard>
                )}

                {/* Player performances — only past */}
                {isPast && players.length > 0 && (
                  <SectionCard title="Player stats">
                    {goalsFor !== '' && (
                      <p className="text-xs text-gray-400 mb-3">Total goals must not exceed {goalsFor}.</p>
                    )}
                    <div className="overflow-x-auto -mx-5 px-5">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Player</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">Played</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">Goals</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">Ast</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-14">MOTM</th>
                            <th className="text-center px-2 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">Mins</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {players.map(p => {
                            const perf = perfs[p.id] ?? { player_id: p.id, played: false, goals: 0, assists: 0, motm: false, mins_played: 0 }
                            const totalGoals = Object.values(perfs).reduce((s, x) => s + (x.goals ?? 0), 0)
                            const maxGoals = goalsFor !== '' ? Number(goalsFor) : Infinity
                            return (
                              <tr key={p.id} className={perf.played ? '' : 'opacity-50'}>
                                <td className="py-2 font-medium text-gray-900 whitespace-nowrap">
                                  <span className="flex items-center gap-2">
                                    {p.player_number != null && <span className="text-xs text-gray-400 w-5 text-right">#{p.player_number}</span>}
                                    {p.first_name} {p.last_name}
                                  </span>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input type="checkbox" checked={perf.played} onChange={e => updatePerf(p.id, 'played', e.target.checked)}
                                    className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input type="number" min={0} value={perf.goals}
                                    onChange={e => { const val = Math.max(0, parseInt(e.target.value) || 0); const other = totalGoals - perf.goals; updatePerf(p.id, 'goals', maxGoals === Infinity ? val : Math.min(val, maxGoals - other)) }}
                                    className="w-12 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input type="number" min={0} value={perf.assists}
                                    onChange={e => updatePerf(p.id, 'assists', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-12 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input type="checkbox" checked={perf.motm} onChange={e => updatePerf(p.id, 'motm', e.target.checked)}
                                    className="rounded border-gray-300 text-red-800 focus:ring-red-700" />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <input type="number" min={0} value={perf.mins_played}
                                    onChange={e => updatePerf(p.id, 'mins_played', Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-700" />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-100 bg-gray-50/60">
                            <td className="py-2 text-xs text-gray-400">
                              {Object.values(perfs).filter(p => p.played).length} played · {Object.values(perfs).filter(p => p.motm).length} MOTM
                            </td>
                            <td />
                            <td className="px-2 py-2 text-center text-xs font-semibold text-gray-600">
                              {Object.values(perfs).reduce((s, p) => s + p.goals, 0)}{goalsFor !== '' ? `/${goalsFor}` : ''}
                            </td>
                            <td className="px-2 py-2 text-center text-xs font-semibold text-gray-600">
                              {Object.values(perfs).reduce((s, p) => s + p.assists, 0)}
                            </td>
                            <td /><td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {/* League email import */}
                {!isMirror && (
                  <LeagueEmailImport
                    fixtureId={fixtureId} teamId={teamId} venue={venue}
                    existing={leagueEmailExisting} isIntraClub={isIntraClubPrimary}
                  />
                )}

                {/* Review links — admin, past */}
                {isAdmin && <ReviewLinks fixtureId={fixtureId} isPast={isPast} />}
              </div>

              {/* ── RIGHT COLUMN (sidebar) ── */}
              <div className="space-y-4">

                {/* Venue card */}
                <SectionCard title="Venue">
                  {venue === 'home' ? (
                    homeVenueName ? (
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{homeVenueName}</p>
                        {homeVenueObj && (homeVenueObj as any).address && (
                          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{(homeVenueObj as any).address}</p>
                        )}
                        {pitchName && <p className="text-xs text-gray-500 mt-1.5">{pitchName}</p>}
                        <a href={`https://maps.google.com?q=${encodeURIComponent(homeVenueName)}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          Directions
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Home venue not assigned.</p>
                    )
                  ) : leagueEmailExisting.loaded && leagueEmailExisting.oppVenueName ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{leagueEmailExisting.oppVenueName}</p>
                      {leagueEmailExisting.oppVenueAddress && (
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{leagueEmailExisting.oppVenueAddress}</p>
                      )}
                      <a href={`https://maps.google.com?q=${encodeURIComponent(leagueEmailExisting.oppVenueAddress ?? leagueEmailExisting.oppVenueName)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-3 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        Directions
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-xs">Venue details will appear after the league confirmation email is imported below.</p>
                  )}
                </SectionCard>

                {/* Opposition contacts — from league email */}
                {leagueEmailExisting.loaded && (leagueEmailExisting.oppManagerName || leagueEmailExisting.oppFixtureSecName) && (
                  <SectionCard title="Opposition contacts">
                    <div className="space-y-3">
                      {leagueEmailExisting.oppManagerName && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Manager</p>
                          <p className="text-sm font-medium text-gray-800">{leagueEmailExisting.oppManagerName}</p>
                          {leagueEmailExisting.oppManagerPhone && <p className="text-xs text-gray-500">{leagueEmailExisting.oppManagerPhone}</p>}
                          {leagueEmailExisting.oppManagerEmail && <p className="text-xs text-gray-500">{leagueEmailExisting.oppManagerEmail}</p>}
                        </div>
                      )}
                      {leagueEmailExisting.oppFixtureSecName && (
                        <div className={leagueEmailExisting.oppManagerName ? 'pt-2 border-t border-gray-50' : ''}>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fixture secretary</p>
                          <p className="text-sm font-medium text-gray-800">{leagueEmailExisting.oppFixtureSecName}</p>
                          {leagueEmailExisting.oppFixtureSecPhone && <p className="text-xs text-gray-500">{leagueEmailExisting.oppFixtureSecPhone}</p>}
                          {leagueEmailExisting.oppFixtureSecEmail && <p className="text-xs text-gray-500">{leagueEmailExisting.oppFixtureSecEmail}</p>}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Referee summary */}
                <SectionCard
                  title="Referee"
                  badge={
                    leagueAssignedReferee
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">League assigned</span>
                      : refereeId && refereeName
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Assigned</span>
                        : refereeRequired
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Needed</span>
                          : null
                  }
                >
                  {leagueAssignedReferee ? (
                    <p className="text-sm text-gray-500 italic">Assigned by the league</p>
                  ) : refereeName ? (
                    <p className="text-sm font-medium text-gray-800">{refereeName}</p>
                  ) : (
                    <p className="text-sm text-gray-400">{refereeRequired ? 'No referee assigned yet' : 'Not required'}</p>
                  )}
                </SectionCard>

                {/* Players */}
                {players.length > 0 && (
                  <SectionCard
                    title="Players"
                    badge={
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        {players.length} registered
                      </span>
                    }
                  >
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {players.slice(0, 8).map(p => (
                        <div key={p.id} className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500">
                          {p.first_name[0]}{p.last_name[0]}
                        </div>
                      ))}
                      {players.length > 8 && (
                        <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-semibold text-gray-400">
                          +{players.length - 8}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                )}

                {/* Season info */}
                <SectionCard title="Info">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Season</span>
                      <span className="text-gray-700">{seasonId ? '2025-26' : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Venue type</span>
                      <span className="text-gray-700">{venue.charAt(0).toUpperCase() + venue.slice(1)}</span>
                    </div>
                    {leagueEmailExisting.loaded && leagueEmailExisting.oppColours && (
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Opp. colours</span>
                        <span className="text-gray-700">{leagueEmailExisting.oppColours}</span>
                      </div>
                    )}
                    {leagueEmailExisting.loaded && leagueEmailExisting.videoingAllowed != null && (
                      <div className="flex justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Videoing</span>
                        <span className={leagueEmailExisting.videoingAllowed ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                          {leagueEmailExisting.videoingAllowed ? 'Allowed' : 'Not allowed'}
                        </span>
                      </div>
                    )}
                  </div>
                </SectionCard>

              </div>{/* /right column */}
            </div>{/* /grid */}
          </>
        )}
      </div>
    </AppShell>
  )
}
