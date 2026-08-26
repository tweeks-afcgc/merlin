'use client'

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function FixtureNotesCell({ notes }: { notes: string | null }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  if (!notes?.trim()) return <td className="w-6 px-1 py-3" />

  function handleMouseEnter() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.top + window.scrollY - 8, left: r.left + r.width / 2 + window.scrollX })
  }

  return (
    <td className="w-6 px-1 py-3">
      <span
        ref={ref}
        className="text-gray-300 hover:text-gray-500 cursor-default select-none text-base leading-none"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
      >📋</span>
      {pos && typeof document !== 'undefined' && createPortal(
        <div
          className="pointer-events-none"
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, transform: 'translate(-50%, -100%)' }}
        >
          <div className="w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-pre-wrap mb-2">
            {notes}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>,
        document.body
      )}
    </td>
  )
}
