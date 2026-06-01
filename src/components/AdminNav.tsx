'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/seasons', label: 'Seasons' },
  { href: '/admin/teams', label: 'Teams' },
  { href: '/admin/clubs', label: 'Clubs' },
  { href: '/admin/users', label: 'Users' },
]

export default function AdminNav() {
  const pathname = usePathname()
  return (
    <div className="flex gap-1 text-sm mb-8 border-b border-gray-200 overflow-x-auto">
      {tabs.map(tab => {
        const isActive = tab.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap px-3 pb-3 -mb-px transition ${
              isActive
                ? 'text-red-800 font-semibold border-b-2 border-red-800'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
