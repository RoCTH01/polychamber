'use client'

import { useState } from 'react'
import { useItems } from '@/hooks/useItems'
import type { Item } from '@/types'

interface Props {
  excludeId: string
  onSelect: (note: Item) => void
  onDismiss: () => void
}

export default function NotePicker({ excludeId, onSelect, onDismiss }: Props) {
  const [query, setQuery]           = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { items } = useItems({ parentId: 'null' })

  const filtered = items
    .filter(n => n.id !== excludeId)
    .filter(n => {
      if (!query) return true
      const q = query.toLowerCase()
      const searchable = (n.author ?? n.body).toLowerCase()
      return searchable.includes(q)
    })
    .slice(0, 8)

  const safeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1))

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setSelectedIndex(0)  // Reset to first result on every query change
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onDismiss(); return }
    if (filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const note = filtered[safeIndex]
      if (note) onSelect(note)
    }
  }

  return (
    <div className="ne-note-picker" role="listbox">
      <div className="ne-note-picker-search">
        <input
          autoFocus
          className="ne-note-picker-input"
          placeholder="Search notes…"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
        />
      </div>
      {filtered.length === 0 && (
        <div className="ne-note-picker-empty">No notes found</div>
      )}
      {filtered.map((note, i) => (
        <button key={note.id}
          className={`ne-note-picker-row${i === safeIndex ? ' selected' : ''}`}
          role="option"
          aria-selected={i === safeIndex}
          onMouseDown={e => { e.preventDefault(); onSelect(note) }}
          onMouseEnter={() => setSelectedIndex(i)}>
          <span className="ne-note-picker-title">
            {note.author ?? note.body.slice(0, 60)}
          </span>
        </button>
      ))}
    </div>
  )
}
