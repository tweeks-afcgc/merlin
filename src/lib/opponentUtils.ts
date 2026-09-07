export type OpponentOption = {
  value: string   // club_team id  OR  'club:${clubId}'
  label: string
}

export type OpponentGroup = {
  clubId: string
  clubName: string
  clubValue: string  // 'club:${clubId}'
  teams: OpponentOption[]  // empty if club has no named teams
}

type ClubWithTeams = {
  id: string
  name: string
  club_teams: { id: string; name: string }[]
}

/** Build grouped opponent data for rendering with <optgroup>. Clubs sorted A–Z, teams sorted A–Z within each club. */
export function buildOpponentGroups(clubs: ClubWithTeams[]): OpponentGroup[] {
  return [...clubs]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(club => ({
      clubId: club.id,
      clubName: club.name,
      clubValue: `club:${club.id}`,
      teams: club.club_teams
        .filter(t => t.name && t.name.trim())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(t => ({ value: t.id, label: `${club.name} ${t.name}` })),
    }))
}

/** @deprecated use buildOpponentGroups */
export function buildOpponentOptions(clubs: ClubWithTeams[]): OpponentOption[] {
  const opts: OpponentOption[] = []
  for (const g of buildOpponentGroups(clubs)) {
    opts.push({ value: g.clubValue, label: g.clubName })
    for (const t of g.teams) opts.push(t)
  }
  return opts
}

/** Display an opponent name, handling the case where a team has no name (club-only). */
export function opponentName(clubName: string | null | undefined, teamName: string | null | undefined): string {
  return [clubName, teamName].filter(s => s && s.trim()).join(' ')
}
