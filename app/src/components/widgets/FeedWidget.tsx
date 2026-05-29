'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import { useAppStore } from '@/store/app'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { SRC_LABEL } from '@/types'
import type { Item, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void }

const SOURCES = ['All', 'Me', 'New', 'TW', 'DC', 'OB', 'MN', 'RD']

export default function FeedWidget({ id, dragHandlers, onClose }: Props) {
  const [src, setSrc] = useState('All')
  const openNoteId  = useAppStore(s => s.openNoteId)
  const setOpenNote = useAppStore(s => s.setOpenNoteId)
  const { open: openMenu } = useContextMenu()

  const { items, updateItem, deleteItem, mutate } = useItems({ parentId: 'null' })

  const filtered = (() => {
    if (src === 'Me')  return items.filter(n => n.src === null)
    if (src === 'New') return items.filter(n => !n.starred && n.tags.length === 0)
    if (src === 'All') return items
    return items.filter(n => n.src && SRC_LABEL[n.src] === src)
  })()

  const queueItem = async (note: Item, queueTag: 'next' | 'soon' | 'later') => {
    await updateItem(note.id, {
      funnel: { mediaKind: 'article', source: note.src ?? 'me', est: '', queueTag },
    } as Partial<Item>)
  }

  const handleContextMenu = (e: React.MouseEvent, note: Item) => {
    const alreadyQueued = !!note.funnel
    openMenu(e, [
      { label: 'Open',              action: () => setOpenNote(note.id) },
      { divider: true },
      { label: note.starred ? 'Unstar' : 'Star', checked: note.starred, action: () => updateItem(note.id, { starred: !note.starred }) },
      { label: 'Copy text',         action: () => navigator.clipboard.writeText(note.body) },
      { divider: true },
      { label: alreadyQueued ? 'Move to Next'  : 'Queue: Next',  action: () => queueItem(note, 'next') },
      { label: alreadyQueued ? 'Move to Soon'  : 'Queue: Soon',  action: () => queueItem(note, 'soon') },
      { label: alreadyQueued ? 'Move to Later' : 'Queue: Later', action: () => queueItem(note, 'later') },
      { divider: true },
      { label: 'Delete',            danger: true, action: () => deleteItem(note.id) },
    ])
  }

  return (
    <WidgetShell id={id} title="Feed" meta={`${filtered.length} entries · live`}
      tabs={SOURCES} tab={src} onTab={setSrc}
      dragHandlers={dragHandlers} onClose={onClose} onRefresh={mutate} noPad>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((n, i) => (
          <NoteRow key={n.id} note={n} first={i === 0}
            active={openNoteId === n.id}
            onClick={() => setOpenNote(openNoteId === n.id ? null : n.id)}
            onContextMenu={e => handleContextMenu(e, n)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '24px var(--pad)', textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
            nothing here
          </div>
        )}
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
        {!note.src && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-4)', background: 'var(--panel-hi)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>ME</span>}
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontWeight: 500 }}>{note.author}</span>
        <span className="tab muted-2" style={{ fontSize: 'var(--fs-xs)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
          {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        {note.starred && <span style={{ color: 'var(--accent)', fontSize: 11 }}>★</span>}
        {note.funnel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent)', opacity: 0.7 }}>{note.funnel.queueTag}</span>}
      </div>
      <div className="feed-body" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.55, textWrap: 'pretty' } as React.CSSProperties}>
        {note.body}
      </div>
      {note.tags.length > 0 && (
        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          {note.tags.map(t => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
