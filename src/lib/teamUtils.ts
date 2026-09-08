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

/** Returns the display name for a fixture opponent, resolving internal team age groups for the fixture's season. */
export function fixtureOpponentName(
  clubTeam: { name: string; clubs?: { name: string } | null; internal_team?: { name: string; type: string; founding_age_group: number | null; founding_season_id: string | null } | null } | null,
  seasons: Season[],
  seasonId: string
): string {
  if (!clubTeam) return 'TBC'
  const internalTeam = (clubTeam as any).internal_team
  if (internalTeam) {
    if (internalTeam.type === 'junior') {
      const sorted = [...seasons].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      const currentIndex = sorted.findIndex((s: Season) => s.is_current)
      const targetIndex = sorted.findIndex((s: Season) => s.id === seasonId)
      // Compute current age via founding data
      const foundingIndex = internalTeam.founding_season_id
        ? sorted.findIndex((s: Season) => s.id === internalTeam.founding_season_id)
        : -1
      const currentAge = (foundingIndex !== -1 && currentIndex !== -1 && internalTeam.founding_age_group)
        ? internalTeam.founding_age_group + (currentIndex - foundingIndex)
        : null
      if (currentAge !== null && targetIndex !== -1 && currentIndex !== -1) {
        // Delta from current season to fixture season
        const targetAge = currentAge + (targetIndex - currentIndex)
        return `Under ${targetAge} ${internalTeam.name}`
      }
    }
    // Internal but senior, or insufficient founding data — strip stored prefix
    return clubTeam.name.replace(/^\[Internal\]\s*/, '')
  }
  // External club team
  return ([clubTeam.clubs?.name, clubTeam.name].filter(s => s && s.trim()).join(' ') || 'TBC').replace(/^\[Internal\]\s*/, '')
}

/** Like teamDisplayName but resolves the age group relative to a specific season, not the current one. */
export function teamDisplayNameForSeason(team: Team, seasons: Season[], seasonId: string): string {
  if (team.type === 'senior') return team.name
  if (!team.founding_age_group || !team.founding_season_id) return team.name

  const sorted = [...seasons].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  )
  const foundingIndex = sorted.findIndex(s => s.id === team.founding_season_id)
  const targetIndex = sorted.findIndex(s => s.id === seasonId)
  if (foundingIndex === -1 || targetIndex === -1) return team.name

  const age = team.founding_age_group + (targetIndex - foundingIndex)
  return `Under ${age} ${team.name}`
}
