export type OpponentOption = {
  value: string   // club_team id  OR  'club:${clubId}'
  label: string
}

type ClubWithTeams = {
  id: string
  name: string
  club_teams: { id: string; name: string }[]
}

/** Build a sorted list of opponent options from clubs+teams data. */
export function buildOpponentOptions(clubs: ClubWithTeams[]): OpponentOption[] {
  const options: OpponentOption[] = []
  const sorted = [...clubs].sort((a, b) => a.name.localeCompare(b.name))
  for (const club of sorted) {
    // Always list the club itself
    options.push({ value: `club:${club.id}`, label: club.name })
    // List each named team indented under the club, sorted by team name
    const namedTeams = club.club_teams.filter(t => t.name && t.name.trim())
      .sort((a, b) => a.name.localeCompare(b.name))
    for (const team of namedTeams) {
      options.push({ value: team.id, label: `** ${club.name} ${team.name}` })
    }
  }
  return options
}

/** Display an opponent name, handling the case where a team has no name (club-only). */
export function opponentName(clubName: string | null | undefined, teamName: string | null | undefined): string {
  return [clubName, teamName].filter(s => s && s.trim()).join(' ')
}
