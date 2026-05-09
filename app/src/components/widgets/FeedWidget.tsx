'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import { useAppStore } from '@/store/app'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { SRC_LABEL } from '@/types'
import type { Item, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void }

const SOURCES = ['All', 'TW', 'DC', 'OB', 'MN', 'RD']

export default function FeedWidget({ id, dragHandlers, onClose }: Props) {
  const [src, setSrc] = useState('All')
  const openNoteId  = useAppStore(s => s.openNoteId)
  const setOpenNote = useAppStore(s => s.setOpenNoteId)
  const { open: openMenu } = useContextMenu()

  const { items, updateItem, deleteItem } = useItems({ parentId: 'null' })
  const filtered = src === 'All' ? items : items.filter(n => n.src && SRC_LABEL[n.src] === src)

  const handleContextMenu = (e: React.MouseEvent, note: Item) => {
    openMenu(e, [
      { label: 'Open',              action: () => setOpenNote(note.id) },
      { divider: true },
      { label: note.starred ? 'Unstar' : 'Star', checked: note.starred, action: () => updateItem(note.id, { starred: !note.starred }) },
      { label: 'Copy text',         action: () => navigator.clipboard.writeText(note.body) },
      { divider: true },
      { label: 'Delete',            danger: true, action: () => deleteItem(note.id) },
    ])
  }

  return (
    <WidgetShell id={id} title="FEED" meta={`${filtered.length} entries · live`}
      tabs={SOURCES} tab={src} onTab={setSrc}
      dragHandlers={dragHandlers} onClose={onClose} noPad>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((n, i) => (
          <NoteRow key={n.id} note={n} first={i === 0}
            active={openNoteId === n.id}
            onClick={() => setOpenNote(openNoteId === n.id ? null : n.id)}
            onContextMenu={e => handleContextMenu(e, n)} />
        ))}
      </div>
    </WidgetShell>
  )
}

function NoteRow({ note, first, active, onClick, onContextMenu }: { note: Item; first: boolean; active: boolean; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void }) {
  return (
    <div className={`feed-row${active ? ' active' : ''}`} style={{
      padding: 'calc(var(--pad) * 0.85) var(--pad)',
      borderTop: first ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }} onClick={onClick} onContextMenu={onContextMenu}>
      <div className="row gap-8">
        {note.src && <span className={`src-icon src-${note.src}`}>{SRC_LABEL[note.src]}</span>}
        <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontWeight: 500 }}>{note.author}</span>
        <span className="mono tab muted-2" style={{ fontSize: 'var(--fs-xs)', marginLeft: 'auto' }}>
          {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        {note.starred && <span style={{ color: 'var(--warn)', fontSize: 11 }}>★</span>}
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.45, textWrap: 'pretty' } as React.CSSProperties}>
        {note.body}
      </div>
      {note.tags.length > 0 && (
        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          {note.tags.map(t => (
            <span key={t} className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
