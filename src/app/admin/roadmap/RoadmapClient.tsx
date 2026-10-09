'use client'

import { useState } from 'react'
import { addRoadmapItem, toggleRoadmapItem, deleteRoadmapItem } from './actions'

type Item = {
  id: string
  title: string
  description: string | null
  completed: boolean
  created_at: string
  completed_at: string | null
}

export default function RoadmapClient({ items }: { items: Item[] }) {
  const [filter, setFilter] = useState<'open' | 'done'>('open')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const visible = items.filter(i => i.completed === (filter === 'done'))

  async function handleAdd() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)
    const result = await addRoadmapItem(title, description)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setTitle('')
    setDescription('')
    setAdding(false)
  }

  async function handleToggle(id: string, completed: boolean) {
    setToggling(id)
    await toggleRoadmapItem(id, !completed)
    setToggling(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    setDeleting(id)
    await deleteRoadmapItem(id)
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs + Add button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['open', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'open' ? 'Open' : 'Done'}
              <span className="ml-1.5 text-xs text-gray-400">
                ({items.filter(i => i.completed === (f === 'done')).length})
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => { setAdding(true); setError(null) }}
          className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Add item
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">New roadmap item</h2>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setTitle(''); setDescription(''); setError(null) }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          {filter === 'open' ? 'No open items. Add one above.' : 'Nothing completed yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map(item => (
            <li key={item.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex gap-4 items-start">
              <button
                onClick={() => handleToggle(item.id, item.completed)}
                disabled={toggling === item.id}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                  item.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-red-700'
                } disabled:opacity-40`}
                title={item.completed ? 'Mark as open' : 'Mark as done'}
              >
                {item.completed && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${item.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{item.description}</p>
                )}
                <p className="text-xs text-gray-300 mt-2">
                  Added {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {item.completed_at && (
                    <> · Done {new Date(item.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                className="text-gray-200 hover:text-red-500 transition disabled:opacity-40 flex-shrink-0"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
