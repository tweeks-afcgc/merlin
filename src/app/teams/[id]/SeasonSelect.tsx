'use client'

import { useRouter } from 'next/navigation'

type Season = { id: string; name: string; is_current: boolean }

export default function SeasonSelect({
  teamId,
  seasons,
  selectedId,
}: {
  teamId: string
  seasons: Season[]
  selectedId: string | null
}) {
  const router = useRouter()
  return (
    <select
      value={selectedId ?? ''}
      onChange={e => router.push(`/teams/${teamId}?season=${e.target.value}`)}
      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 bg-white"
    >
      {seasons.map(s => (
        <option key={s.id} value={s.id}>
          {s.name}{s.is_current ? ' (current)' : ''}
        </option>
      ))}
    </select>
  )
}
