export type Team = {
  id: string
  type: string
  name: string
  age_group: number | null
  founding_age_group: number | null
  founding_season_id: string | null
}

export type Season = {
  id: string
  name: string
  start_date: string
  is_current: boolean
}

export function computeAgeGroup(team: Team, seasons: Season[]): number | null {
  if (team.type !== 'junior') return null
  if (!team.founding_age_group || !team.founding_season_id) return team.age_group

  const sorted = [...seasons].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )

  const foundingIndex = sorted.findIndex(s => s.id === team.founding_season_id)
  const currentIndex = sorted.findIndex(s => s.is_current)

  if (foundingIndex === -1 || currentIndex === -1) return team.founding_age_group

  return team.founding_age_group + (currentIndex - foundingIndex)
}

export function teamDisplayName(team: Team, seasons: Season[]): string {
  if (team.type === 'senior') return team.name
  const age = computeAgeGroup(team, seasons)
  return age !== null ? `Under ${age} ${team.name}` : team.name
}
