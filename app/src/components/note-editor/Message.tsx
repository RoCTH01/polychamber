'use client'

import { useState } from 'react'
import MessageContent from './MessageContent'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { SRC_LABEL, SRC_NAME } from '@/types'
import type { Item, ItemMessage } from '@/types'

interface Props {
  item: Item
  rootSrc: string | null
  rootAuthor: string | null
  grouped: boolean
  onToggleTask: () => void
  onUpdate: (patch: Partial<Item>) => void
  onDelete: () => void
  onReact: (emoji: string) => void
}

export default function Message({ item, rootSrc, rootAuthor, grouped, onToggleTask, onUpdate, onDelete, onReact }: Props) {
  const [hover, setHover]           = useState(false)
  const [editing, setEditing]       = useState(false)
  const [editText, setEditText]     = useState(item.body)
  const { open: openMenu }          = useContextMenu()

  const msg    = item.message
  const isMe   = msg?.who === 'me'
  const isSrc  = msg?.who === 'src'

  const commitEdit = () => {
    onUpdate({ body: editText })
    setEditing(false)
  }

  const reactions = msg?.reactions ?? []

  const addReaction = (emoji: string) => {
    const existing = reactions.findIndex(r => r.e === emoji)
    const next = existing >= 0
      ? reactions.map((r, i) => i === existing ? { ...r, n: r.n + 1 } : r)
      : [...reactions, { e: emoji, n: 1 }]
    onReact(emoji)
    onUpdate({ message: { ...msg!, reactions: next } })
  }

  return (
    <div className={`ne-msg${grouped ? ' grouped' : ''}${isSrc ? ' src' : ''}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onContextMenu={e => {
        const menuItems = [
          ...(isMe ? [{ label: 'Edit', action: () => { setEditText(item.body); setEditing(true) } }] : []),
          { label: 'Copy text', action: () => navigator.clipboard.writeText(item.body) },
          { divider: true as const },
          { label: 'Reply', disabled: true },
          ...(isMe ? [{ divider: true as const }, { label: 'Delete', danger: true, action: onDelete }] : []),
        ]
        openMenu(e, menuItems)
      }}>

      <div className="ne-avatar-col">
        {!grouped ? (
          <span className={`ne-avatar${isMe ? ' me' : ''}${isSrc ? ' src' : ''}`}>
            {isMe ? 'me' : isSrc ? (rootSrc ? SRC_LABEL[rootSrc] : '?') : '?'}
          </span>
        ) : (
          <span className="ne-mini-time mono">
            {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        )}
      </div>

      <div className="ne-msg-body">
        {!grouped && (
          <div className="ne-msg-head">
            <span className="ne-msg-author">{isMe ? 'You' : isSrc ? (rootAuthor ?? 'Source') : 'Unknown'}</span>
            {isSrc && rootSrc && <span className="ne-msg-via mono">via {SRC_NAME[rootSrc]}</span>}
            <span className="ne-msg-t mono">
              {new Date(item.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        )}

        {editing ? (
          <div className="ne-edit">
            <textarea className="ne-edit-input" value={editText} autoFocus
              rows={Math.max(1, editText.split('\n').length)}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitEdit() }}
            />
            <div className="ne-edit-actions">
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>esc to cancel · ⌘⏎ to save</span>
              <button className="ne-btn-sm secondary" onClick={() => setEditing(false)}>cancel</button>
              <button className="ne-btn-sm" onClick={commitEdit}>save</button>
            </div>
          </div>
        ) : (
          <MessageContent body={item.body} message={msg ?? undefined} onToggleTask={onToggleTask} />
        )}

        {reactions.length > 0 && (
          <div className="ne-reactions">
            {reactions.map((r, i) => (
              <span key={i} className="ne-reaction" onClick={() => addReaction(r.e)}>
                <span>{r.e}</span><span className="mono tab">{r.n}</span>
              </span>
            ))}
            <button className="ne-reaction add" onClick={() => addReaction('👍')}>+</button>
          </div>
        )}
      </div>

      {hover && !editing && (
        <div className="ne-msg-tools">
          <button title="React" onClick={() => addReaction('👍')}>☺</button>
        </div>
      )}
    </div>
  )
}
