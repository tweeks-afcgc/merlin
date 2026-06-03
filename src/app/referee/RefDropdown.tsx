'use client'

import { useRouter } from 'next/navigation'

export default function RefDropdown({
  referees,
  selectedId,
  selfId,
}: {
  referees: { id: string; full_name: string | null }[]
  selectedId: string | null
  selfId: string | null
}) {
  const router = useRouter()

  return (
    <select
      value={selectedId ?? ''}
      onChange={e => router.push(`/referee?ref=${e.target.value}`)}
      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-700 bg-white"
    >
      {referees.map(r => (
        <option key={r.id} value={r.id}>
          {r.id === selfId ? `Myself (${r.full_name ?? '—'})` : (r.full_name ?? '—')}
        </option>
      ))}
    </select>
  )
}
