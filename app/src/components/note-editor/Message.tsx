'use client'

import { useState } from 'react'
import MessageContent from './MessageContent'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { SRC_LABEL, SRC_NAME } from '@/types'
import type { Item, ItemMessage } from '@/types'
import { formatMsgTime } from '@/lib/utils'

interface Props {
  item: Item
  rootSrc: string | null
  rootAuthor: string | null
  grouped: boolean
  onToggleTask: () => void
  onUpdate: (patch: Partial<Item>) => void
  onDelete: () => void
  onReact: (emoji: string) => void
  onLinkClick?: (noteId: string) => void
}

export default function Message({ item, rootSrc, rootAuthor, grouped, onToggleTask, onUpdate, onDelete, onReact, onLinkClick }: Props) {
  const [hover, setHover]       = useState(false)
  const [editing, setEditing]   = useState(false)
  const [editText, setEditText] = useState(item.body)
  const { open: openMenu }      = useContextMenu()

  const msg   = item.message
  // When there's no itemMessage record (e.g. root notes created outside the Composer),
  // infer who from item.src: no src → mine, has src → external.
  const isMe  = msg ? msg.who === 'me'  : item.src === null
  const isSrc = msg ? msg.who === 'src' : item.src !== null

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
    <div
      className={`ne-msg${grouped ? ' grouped' : ''}${isSrc ? ' src' : ''}${isMe ? ' mine' : ''}`}
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

      {/* Avatar column — only rendered for source messages */}
      {!isMe && (
        <div className="ne-avatar-col">
          {!grouped ? (
            <span className="ne-avatar src">
              {rootSrc ? (SRC_LABEL[rootSrc] ?? rootSrc.slice(0, 2).toUpperCase()) : '·'}
            </span>
          ) : (
            <span className="ne-mini-time mono">
              {formatMsgTime(new Date(item.createdAt))}
            </span>
          )}
        </div>
      )}

      <div className="ne-msg-body">
        {/* Author header — only for source messages */}
        {!isMe && !grouped && (
          <div className="ne-msg-head">
            <span className="ne-msg-author">{rootAuthor ?? (rootSrc ? SRC_NAME[rootSrc] : 'Source')}</span>
            {isSrc && rootSrc && <span className="ne-msg-via mono">via {SRC_NAME[rootSrc]}</span>}
            <span className="ne-msg-t mono">
              {formatMsgTime(new Date(item.createdAt))}
            </span>
          </div>
        )}

        {/* Timestamp shown on hover for own messages */}
        {isMe && hover && !grouped && (
          <div className="ne-me-time mono">
            {formatMsgTime(new Date(item.createdAt))}
          </div>
        )}

        {editing ? (
          <div className="ne-edit">
            <textarea className="ne-edit-input" value={editText} autoFocus
              rows={Math.max(1, editText.split('\n').length)}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') setEditing(false)
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitEdit()
              }}
            />
            <div className="ne-edit-actions">
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>esc to cancel · ⌘⏎ to save</span>
              <button className="ne-btn-sm secondary" onClick={() => setEditing(false)}>cancel</button>
              <button className="ne-btn-sm" onClick={commitEdit}>save</button>
            </div>
          </div>
        ) : (
          <MessageContent body={item.body} message={msg ?? undefined} onToggleTask={onToggleTask} onLinkClick={onLinkClick} />
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
