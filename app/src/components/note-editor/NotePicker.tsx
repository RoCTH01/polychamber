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
  const [query, setQuery] = useState('')
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

  return (
    <div className="ne-note-picker" role="listbox">
      <div className="ne-note-picker-search">
        <input
          autoFocus
          className="ne-note-picker-input"
          placeholder="Search notes…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onDismiss() }}
        />
      </div>
      {filtered.length === 0 && (
        <div className="ne-note-picker-empty">No notes found</div>
      )}
      {filtered.map(note => (
        <button key={note.id} className="ne-note-picker-row" role="option"
          onMouseDown={e => { e.preventDefault(); onSelect(note) }}>
          <span className="ne-note-picker-title">
            {note.author ?? note.body.slice(0, 60)}
          </span>
        </button>
      ))}
    </div>
  )
}
