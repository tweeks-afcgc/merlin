'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { signOut } from '@/app/auth/actions'

interface Props {
  children: React.ReactNode
  userName?: string | null
  isAdmin?: boolean
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="4" x2="20" y2="20" /><line x1="20" y1="4" x2="4" y2="20" />
    </svg>
  )
}

export default function AppShell({ children, userName: nameProp, isAdmin: adminProp }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(nameProp ?? null)
  const [isAdmin, setIsAdmin] = useState(adminProp ?? false)
  const pathname = usePathname()
  const profileRef = useRef<HTMLDivElement>(null)

  // If props not provided (client-only pages), fetch from Supabase
  useEffect(() => {
    if (nameProp !== undefined) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setUserName(data.full_name)
            setIsAdmin(data.role === 'admin')
          }
        })
    })
  }, [nameProp])

  // Update state when props change
  useEffect(() => { if (nameProp !== undefined) setUserName(nameProp ?? null) }, [nameProp])
  useEffect(() => { if (adminProp !== undefined) setIsAdmin(adminProp) }, [adminProp])

  // Close profile dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); setProfileOpen(false) }, [pathname])

  const initials = userName
    ? userName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const navLinks = [
    { href: '/dashboard', label: 'Home' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* â”€â”€ Top bar â”€â”€ */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-40 flex items-center px-4 gap-3">

        {/* Desktop hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition"
          aria-label="Toggle menu"
        >
          <MenuIcon />
        </button>

        {/* Logo */}
        <span className="flex-1 text-center md:text-left font-bold text-lg text-red-800 tracking-tight">
          Merlin
        </span>

        {/* Desktop profile avatar */}
        <div ref={profileRef} className="relative hidden md:block">
          <button
            onClick={() => setProfileOpen(o => !o)}
            className="w-9 h-9 rounded-full bg-red-800 hover:bg-red-900 text-white text-sm font-bold flex items-center justify-center transition"
            aria-label="Profile menu"
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-11 bg-white shadow-xl rounded-xl border border-gray-100 w-44 overflow-hidden z-50">
              <Link href="/profile" className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition">
                My profile
              </Link>
              <div className="border-t border-gray-100" />
              <form action={signOut}>
                <button className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition">
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Mobile spacer to keep logo centred */}
        <div className="md:hidden w-9" />
      </header>

      {/* â”€â”€ Desktop sidebar (slides in) â”€â”€ */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30 hidden md:block" onClick={() => setMenuOpen(false)} />
          <nav className="fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-gray-100 shadow-lg z-30 hidden md:flex flex-col p-3">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition mb-0.5 ${
                  isActive(link.href)
                    ? 'bg-red-50 text-red-800'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      )}

      {/* â”€â”€ Mobile full-screen menu overlay â”€â”€ */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col md:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 flex-shrink-0">
            <span className="font-bold text-lg text-red-800">Merlin</span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition"
            >
              <CloseIcon />
            </button>
          </div>

          {/* User info strip */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-red-800 text-white font-bold flex items-center justify-center text-sm flex-shrink-0">
              {initials}
            </div>
            <span className="text-sm font-semibold text-gray-900 truncate">{userName ?? ''}</span>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition ${
                  isActive(link.href) ? 'bg-red-50 text-red-800' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Profile + sign out at bottom */}
          <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-1">
            <Link
              href="/profile"
              className="block px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              My profile
            </Link>
            <form action={signOut}>
              <button className="w-full text-left px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition">
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Page content â”€â”€ */}
      <main className="pt-14 pb-20 md:pb-8 min-h-screen">
        {children}
      </main>

      {/* â”€â”€ Mobile bottom bar with centred menu button â”€â”€ */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-center md:hidden z-30">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex flex-col items-center gap-1 text-gray-500 hover:text-red-800 transition px-8 py-2"
          aria-label="Menu"
        >
          <MenuIcon />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>
    </div>
  )
}

