'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addRoadmapItem, updateRoadmapItem, toggleRoadmapItem, deleteRoadmapItem, reorderRoadmapItems } from './actions'

type Item = {
  id: string
  title: string
  description: string | null
  completed: boolean
  created_at: string
  completed_at: string | null
  position: number
}

function SortableItem({
  item,
  onToggle,
  onDelete,
  onEdit,
  toggling,
  deleting,
}: {
  item: Item
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  onEdit: (item: Item) => void
  toggling: string | null
  deleting: string | null
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-xl px-5 py-4 shadow-sm flex gap-4 items-start ${isDragging ? 'border-red-300 shadow-md opacity-80' : 'border-gray-200'}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 flex-shrink-0 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        title="Drag to reorder"
        tabIndex={-1}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zM7 10a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
        </svg>
      </button>

      {/* Complete toggle */}
      <button
        onClick={() => onToggle(item.id, item.completed)}
        disabled={toggling === item.id}
        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
          item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-red-700'
        } disabled:opacity-40`}
        title={item.completed ? 'Mark as open' : 'Mark as done'}
      >
        {item.completed && (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
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

      {/* Edit + delete */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(item)}
          className="text-gray-300 hover:text-blue-500 transition p-1"
          title="Edit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          disabled={deleting === item.id}
          className="text-gray-300 hover:text-red-500 transition p-1 disabled:opacity-40"
          title="Delete"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </li>
  )
}

export default function RoadmapClient({ items: initialItems }: { items: Item[] }) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<'open' | 'done'>('open')

  // Add form
  const [adding, setAdding] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDescription, setAddDescription] = useState('')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Edit form
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [toggling, setToggling] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const visible = items.filter(i => i.completed === (filter === 'done'))

  async function handleAdd() {
    if (!addTitle.trim()) { setAddError('Title is required.'); return }
    setAddSaving(true)
    setAddError(null)
    const result = await addRoadmapItem(addTitle, addDescription)
    setAddSaving(false)
    if (result.error) { setAddError(result.error); return }
    // Optimistically append with a placeholder id; server revalidates
    const newItem: Item = {
      id: crypto.randomUUID(),
      title: addTitle.trim(),
      description: addDescription.trim() || null,
      completed: false,
      created_at: new Date().toISOString(),
      completed_at: null,
      position: (items.at(-1)?.position ?? 0) + 1,
    }
    setItems(prev => [...prev, newItem])
    setAddTitle('')
    setAddDescription('')
    setAdding(false)
  }

  function openEdit(item: Item) {
    setEditingItem(item)
    setEditTitle(item.title)
    setEditDescription(item.description ?? '')
    setEditError(null)
  }

  async function handleEdit() {
    if (!editingItem) return
    if (!editTitle.trim()) { setEditError('Title is required.'); return }
    setEditSaving(true)
    setEditError(null)
    const result = await updateRoadmapItem(editingItem.id, editTitle, editDescription)
    setEditSaving(false)
    if (result.error) { setEditError(result.error); return }
    setItems(prev => prev.map(i => i.id === editingItem.id
      ? { ...i, title: editTitle.trim(), description: editDescription.trim() || null }
      : i
    ))
    setEditingItem(null)
  }

  async function handleToggle(id: string, completed: boolean) {
    setToggling(id)
    setItems(prev => prev.map(i => i.id === id
      ? { ...i, completed: !completed, completed_at: !completed ? new Date().toISOString() : null }
      : i
    ))
    await toggleRoadmapItem(id, !completed)
    setToggling(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    setDeleting(id)
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteRoadmapItem(id)
    setDeleting(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    // Only reorder within the same filter group
    const visibleIds = visible.map(i => i.id)
    const oldIndex = visibleIds.indexOf(active.id as string)
    const newIndex = visibleIds.indexOf(over.id as string)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedVisible = arrayMove(visible, oldIndex, newIndex)
    // Rebuild full list: keep non-visible items in place, splice in reordered visible
    const nonVisible = items.filter(i => i.completed !== (filter === 'done'))
    const newItems = [...reorderedVisible, ...nonVisible].sort((a, b) => {
      const aIdx = reorderedVisible.findIndex(x => x.id === a.id)
      const bIdx = reorderedVisible.findIndex(x => x.id === b.id)
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
      if (aIdx !== -1) return -1
      if (bIdx !== -1) return 1
      return a.position - b.position
    })
    setItems(newItems)
    await reorderRoadmapItems(reorderedVisible.map(i => i.id))
  }

  return (
    <div className="space-y-6">
      {/* Edit modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Edit item</h2>
            {editError && <p className="text-xs text-red-600">{editError}</p>}
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700"
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              rows={4}
              placeholder="Description (optional)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingItem(null)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={editSaving}
                className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-50"
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          onClick={() => { setAdding(true); setAddError(null) }}
          className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + Add item
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">New roadmap item</h2>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <input
            type="text"
            placeholder="Title"
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() } }}
          />
          <textarea
            placeholder="Description (optional)"
            value={addDescription}
            onChange={e => setAddDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-700 resize-y"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setAdding(false); setAddTitle(''); setAddDescription(''); setAddError(null) }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={addSaving}
              className="bg-red-800 hover:bg-red-900 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {addSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Sortable list */}
      {visible.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">
          {filter === 'open' ? 'No open items. Add one above.' : 'Nothing completed yet.'}
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={visible.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {visible.map(item => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEdit={openEdit}
                  toggling={toggling}
                  deleting={deleting}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
