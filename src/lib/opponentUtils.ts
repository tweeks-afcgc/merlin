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
  for (const club of clubs) {
    if (club.club_teams.length === 0) {
      // No teams — list the club once
      options.push({ value: `club:${club.id}`, label: club.name })
    } else {
      // Has teams — list each team (club name already prefixed in the label)
      for (const team of club.club_teams) {
        options.push({ value: team.id, label: `${club.name} ${team.name}` })
      }
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label))
}

/** Display an opponent name, handling the case where a team has no name (club-only). */
export function opponentName(clubName: string | null | undefined, teamName: string | null | undefined): string {
  return [clubName, teamName].filter(s => s && s.trim()).join(' ')
}
