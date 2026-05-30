'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import { useAppStore } from '@/store/app'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { SRC_LABEL } from '@/types'
import type { Item, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void; config?: Record<string, unknown> }

const SOURCES = ['All', 'Me', 'New', 'TW', 'DC', 'OB', 'MN', 'RD']

export default function FeedWidget({ id, dragHandlers, onClose }: Props) {
  const [src, setSrc] = useState('All')
  const activeWs       = useAppStore(s => s.activeWorkspace)
  const openNoteId     = useAppStore(s => s.openNoteId)
  const setOpenNote    = useAppStore(s => s.setOpenNoteId)
  const setOpenNoteMode = useAppStore(s => s.setOpenNoteMode)
  const { open: openMenu } = useContextMenu()
  const { workspaces, addWidget } = useWorkspaces()
  const ws = workspaces.find(w => w.name === activeWs)

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

  const handleTagContextMenu = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation()
    openMenu(e, [
      {
        label: `Track #${tag} in heatmap`,
        action: () => {
          if (ws) addWidget(ws.id, ws.layout, 'heatmap', { mode: 'tag', tag })
        },
      },
    ])
  }

  const handleContextMenu = (e: React.MouseEvent, note: Item) => {
    const alreadyQueued = !!note.funnel
    openMenu(e, [
      { label: 'Edit (document)',   action: () => { setOpenNoteMode('document'); setOpenNote(note.id) } },
      { label: 'Open thread',       action: () => { setOpenNoteMode('thread');   setOpenNote(note.id) } },
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
            onEdit={() => { setOpenNoteMode('document'); setOpenNote(n.id) }}
            onChat={() => { setOpenNoteMode('thread');   setOpenNote(n.id) }}
            onContextMenu={e => handleContextMenu(e, n)}
            onTagContextMenu={handleTagContextMenu} />
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

function NoteRow({ note, first, active, onEdit, onChat, onContextMenu, onTagContextMenu }: {
  note: Item; first: boolean; active: boolean
  onEdit: () => void
  onChat: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onTagContextMenu: (e: React.MouseEvent, tag: string) => void
}) {
  return (
    <div className={`feed-row${active ? ' active' : ''}`} style={{
      padding: 'calc(var(--pad) * 0.85) var(--pad)',
      borderTop: first ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }} onContextMenu={onContextMenu}>
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
      {note.title && <div className="feed-title">{note.title}</div>}
      <div className="feed-body" style={{ fontSize: 'var(--fs-sm)', color: note.title ? 'var(--text-2)' : 'var(--text)', lineHeight: 1.55, textWrap: 'pretty' } as React.CSSProperties}>
        {note.body}
      </div>
      {note.tags.length > 0 && (
        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          {note.tags.map(t => (
            <span key={t} className="chip" onContextMenu={e => { e.stopPropagation(); onTagContextMenu(e, t) }}>{t}</span>
          ))}
        </div>
      )}
      {/* Hover action buttons — shown via CSS .feed-row:hover */}
      <div className="feed-row-actions">
        <button className="feed-row-btn" title="Edit document"
          onClick={e => { e.stopPropagation(); onEdit() }}>✎</button>
        <button className="feed-row-btn" title="Open thread"
          onClick={e => { e.stopPropagation(); onChat() }}>⌨</button>
      </div>
    </div>
  )
}
