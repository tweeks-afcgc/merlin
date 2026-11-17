'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export default function TabBar({ active }: { active: 'incomplete' | 'complete' }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function go(tab: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', tab)
    router.push(`${pathname}?${p.toString()}`)
  }

  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      <button
        onClick={() => go('incomplete')}
        className={`px-4 pb-3 -mb-px text-sm transition font-medium ${
          active === 'incomplete'
            ? 'text-red-800 border-b-2 border-red-800 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        Incomplete
      </button>
      <button
        onClick={() => go('complete')}
        className={`px-4 pb-3 -mb-px text-sm transition font-medium ${
          active === 'complete'
            ? 'text-red-800 border-b-2 border-red-800 font-semibold'
            : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        Complete
      </button>
    </div>
  )
}
