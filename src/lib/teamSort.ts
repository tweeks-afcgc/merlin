const SENIOR_ORDER = ['First XI', 'Sunday XI', 'Vets XI', 'Women']
const SQUAD_ORDER = ['Knights', 'Dukes', 'Roses']

type SortableTeam = {
  id: string
  name: string
  type: string
  founding_age_group: number | null
  founding_season_id: string | null
  age_group: number | null
}

type SortableSeason = {
  id: string
  start_date: string
  is_current: boolean
}

export function computeAge(team: SortableTeam, seasons: SortableSeason[]): number {
  if (!team.founding_age_group || !team.founding_season_id) return team.age_group ?? 0
  const sorted = [...seasons].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
  const foundingIdx = sorted.findIndex(s => s.id === team.founding_season_id)
  const currentIdx = sorted.findIndex(s => s.is_current)
  if (foundingIdx === -1 || currentIdx === -1) return team.founding_age_group
  return team.founding_age_group + (currentIdx - foundingIdx)
}

export function teamDisplayName(team: SortableTeam, seasons: SortableSeason[]): string {
  if (team.type === 'senior') return team.name
  const age = computeAge(team, seasons)
  return `Under ${age} ${team.name}`
}

export function sortedTeams<T extends SortableTeam>(teams: T[], seasons: SortableSeason[]): T[] {
  const senior = teams
    .filter(t => t.type === 'senior')
    .sort((a, b) => {
      const ai = SENIOR_ORDER.indexOf(a.name)
      const bi = SENIOR_ORDER.indexOf(b.name)
      const av = ai === -1 ? 99 : ai
      const bv = bi === -1 ? 99 : bi
      return av !== bv ? av - bv : a.name.localeCompare(b.name)
    })

  const junior = teams
    .filter(t => t.type === 'junior')
    .sort((a, b) => {
      const ageA = computeAge(a, seasons)
      const ageB = computeAge(b, seasons)
      if (ageB !== ageA) return ageB - ageA
      const si = (name: string) => {
        const idx = SQUAD_ORDER.findIndex(s => name.includes(s))
        return idx === -1 ? 99 : idx
      }
      return si(a.name) - si(b.name)
    })

  return [...senior, ...junior]
}
