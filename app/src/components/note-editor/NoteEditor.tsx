'use client'

import { useEffect, useRef, useState } from 'react'
import Message from './Message'
import Composer from './Composer'
import { useItems } from '@/hooks/useItems'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { SRC_LABEL, SRC_NAME } from '@/types'
import type { Item, CalendarEvent } from '@/types'
import '@/app/note-editor.css'
import { useItemLinks } from '@/hooks/useItemLinks'
import { useAppStore } from '@/store/app'
import { relativeTime } from '@/lib/utils'

interface Props {
  note: Item
  onClose: () => void
  onUpdate: (item: Item) => void
  linkedEvent?: CalendarEvent | null
}

export default function NoteEditor({ note, onClose, onUpdate, linkedEvent }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [localTags, setLocalTags] = useState(note.tags)
  const [tagInput, setTagInput]   = useState('')

  const { open: openMenu } = useContextMenu()

  const setOpenNote   = useAppStore(s => s.setOpenNoteId)
  const { backlinks } = useItemLinks(note.id)

  const queueNote = async (queueTag: 'next' | 'soon' | 'later') => {
    const updatedFunnel = { mediaKind: 'article' as const, source: note.src ?? 'me', est: '', queueTag }
    onUpdate({ ...note, funnel: updatedFunnel })
    await fetch(`/api/items/${note.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ funnel: updatedFunnel }),
    })
  }

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    const alreadyQueued = !!note.funnel
    openMenu(e, [
      { label: alreadyQueued ? 'Move to Next'  : 'Queue: Next',  action: () => queueNote('next') },
      { label: alreadyQueued ? 'Move to Soon'  : 'Queue: Soon',  action: () => queueNote('soon') },
      { label: alreadyQueued ? 'Move to Later' : 'Queue: Later', action: () => queueNote('later') },
    ])
  }

  // Thread replies: items with parentId = note.id
  const { items: replies, createItem, updateItem, deleteItem } = useItems({ parentId: note.id })

  // All messages = root note + replies, ordered by createdAt
  const allItems = [note, ...replies].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [note.id, allItems.length])

  const send = async (body: string, kind: string) => {
    await createItem({
      kind: 'note',
      body,
      parentId: note.id,
      tags: [],
      message: {
        who: 'me' as const,
        messageKind: (kind === 'text' ? null : kind) as import('@/types').MessageKind | null,
        reactions: null,
        linkMeta: null,
        done: kind === 'task' ? false : null,
      },
    })
  }

  const addTag = (tag: string) => {
    const next = [...localTags, tag]
    setLocalTags(next)
    onUpdate({ ...note, tags: next })
  }
  const removeTag = (i: number) => {
    const next = localTags.filter((_, j) => j !== i)
    setLocalTags(next)
    onUpdate({ ...note, tags: next })
  }

  return (
    <aside className="note-editor">
      {/* Header */}
      <header className="ne-head" onContextMenu={handleHeaderContextMenu}>
        {/* Calendar event badge — shown when this note is linked to an event */}
        {linkedEvent && (
          <div className="ne-event-badge mono">
            <span>📅</span>
            <span>{linkedEvent.title}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][linkedEvent.dayOfWeek]}</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span>{String(Math.floor(linkedEvent.startHour)).padStart(2,'0')}:{String(Math.round((linkedEvent.startHour % 1) * 60)).padStart(2,'0')}–{String(Math.floor(linkedEvent.endHour)).padStart(2,'0')}:{String(Math.round((linkedEvent.endHour % 1) * 60)).padStart(2,'0')}</span>
          </div>
        )}
        <div className="ne-head-title">
          {note.src && <span className={`src-icon src-${note.src}`} style={{ width: 22, height: 22, fontSize: 10, borderRadius: 5 }}>{SRC_LABEL[note.src]}</span>}
          <div className="ne-head-stack">
            <input className="ne-title-input" value={note.author ?? ''} placeholder="Author"
              onChange={e => onUpdate({ ...note, author: e.target.value })} />
            <div className="ne-head-meta mono">
              {note.src && <><span>{SRC_NAME[note.src]}</span><span>·</span></>}
              <span className="tab">{allItems.length} msg</span>
              <span>·</span>
              <span>opened {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
            </div>
          </div>
        </div>
        <div className="ne-head-actions">
          <button className="ne-icon-btn" title={note.starred ? 'Unstar' : 'Star'}
            style={note.starred ? { color: 'var(--warn)' } : undefined}
            onClick={() => onUpdate({ ...note, starred: !note.starred })}>★</button>
          <button className="ne-icon-btn" title="More">⋯</button>
          <button className="ne-icon-btn" title="Close" onClick={onClose}>✕</button>
        </div>
      </header>

      {/* Tag bar */}
      <div className="ne-tagbar">
        {localTags.map((tag, i) => (
          <span key={i} className="ne-tag-chip">
            <span style={{ color: 'var(--text-3)' }}>#</span>{tag}
            <button className="ne-tag-x" onClick={() => removeTag(i)}>×</button>
          </span>
        ))}
        <input className="ne-tag-input" placeholder="+ tag" value={tagInput}
          onChange={e => setTagInput(e.target.value.replace(/\s+/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter' && tagInput) { addTag(tagInput); setTagInput('') } }} />
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.06em' }}>
          THREAD · {note.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      {/* Message stream */}
      <div className="ne-stream" ref={scrollRef}>
        {allItems.map((item, i) => {
          const prev    = i > 0 ? allItems[i - 1] : null
          const grouped = !!prev && prev.message?.who === item.message?.who &&
            Math.abs(new Date(item.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60 * 1000
          return (
            <Message key={item.id} item={item}
              rootSrc={note.src} rootAuthor={note.author}
              grouped={grouped}
              onToggleTask={() => {
                if (item.id === note.id) onUpdate({ ...note, message: { ...note.message!, done: !note.message?.done } })
                else updateItem(item.id, { message: { ...item.message!, done: !item.message?.done } } as Partial<Item>)
              }}
              onUpdate={patch => {
                if (item.id === note.id) onUpdate({ ...note, ...patch })
                else updateItem(item.id, patch)
              }}
              onDelete={() => { if (item.id !== note.id) deleteItem(item.id) }}
              onReact={() => {}}
              onLinkClick={noteId => setOpenNote(noteId)}
            />
          )
        })}
      </div>

      {backlinks.length > 0 && (
        <div className="ne-backlinks">
          <div className="ne-backlinks-header mono">
            <span>LINKED FROM</span>
            <span className="ne-backlinks-count">{backlinks.length}</span>
          </div>
          {backlinks.map(bl => (
            <button key={bl.id} className="ne-backlinks-row"
              onClick={() => setOpenNote(bl.id)}>
              <span className="ne-backlinks-arrow">↗</span>
              <span className="ne-backlinks-title">
                {bl.author ?? bl.body.slice(0, 50)}
              </span>
              <span className="ne-backlinks-age mono">
                {relativeTime(new Date(bl.createdAt))}
              </span>
            </button>
          ))}
        </div>
      )}

      <Composer onSend={send} noteId={note.id} />
    </aside>
  )
}
