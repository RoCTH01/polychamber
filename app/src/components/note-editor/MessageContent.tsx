'use client'

import { useState } from 'react'
import type { ItemMessage } from '@/types'
import { isLongText } from '@/lib/utils'

interface Props {
  body: string
  message?: ItemMessage
  onToggleTask?: () => void
  onLinkClick?: (noteId: string) => void
}

/** Light inline markdown + [[uuid:Title]] note chips */
function fmt(text: string, onLinkClick?: (id: string) => void): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\[\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[^\]]*\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@\w+|#\w+|https?:\/\/\S+)/g
  let last = 0; let m; let key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>)
    const tok = m[0]
    if (tok.startsWith('[[')) {
      const inner = tok.slice(2, -2)
      const colon = inner.indexOf(':')
      const uuid  = colon >= 0 ? inner.slice(0, colon) : ''
      const title = colon >= 0 ? inner.slice(colon + 1) : inner
      out.push(
        <button key={key++} className="ne-note-chip"
          onClick={() => uuid && onLinkClick?.(uuid)}>
          ↗ {title || 'untitled'}
        </button>
      )
    } else if (tok.startsWith('**'))   out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*'))    out.push(<em key={key++}>{tok.slice(1, -1)}</em>)
    else if (tok.startsWith('`'))    out.push(<code key={key++} className="ne-code-inline">{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('@'))    out.push(<span key={key++} className="ne-mention">{tok}</span>)
    else if (tok.startsWith('#'))    out.push(<span key={key++} className="ne-hashtag">{tok}</span>)
    else if (tok.startsWith('http')) out.push(<a key={key++} className="ne-link" onClick={e => e.preventDefault()} href={tok}>{tok}</a>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>)
  return out
}

export default function MessageContent({ body, message, onToggleTask, onLinkClick }: Props) {
  const [expanded, setExpanded] = useState(false)
  const kind = message?.messageKind

  if (kind === 'note_ref') {
    const colon = body.indexOf(':')
    const uuid  = colon >= 0 ? body.slice(0, colon) : ''
    const title = colon >= 0 ? body.slice(colon + 1) : body
    return (
      <div className="ne-note-ref" onClick={() => uuid && onLinkClick?.(uuid)}>
        <div className="ne-note-ref-label mono">LINKED NOTE</div>
        <div className="ne-note-ref-title">↗ {title || 'untitled'}</div>
      </div>
    )
  }

  if (kind === 'task') {
    return (
      <div className="ne-task">
        <button onClick={onToggleTask} className={`ne-task-box${message?.done ? ' done' : ''}`}>
          {message?.done ? '✓' : ''}
        </button>
        <span className={`ne-task-text${message?.done ? ' done' : ''}`}>{fmt(body, onLinkClick)}</span>
      </div>
    )
  }

  if (kind === 'link' && message?.linkMeta) {
    return (
      <div>
        <a className="ne-link" href={body} onClick={e => e.preventDefault()}>{body}</a>
        <div className="ne-link-card">
          <div className="ne-link-card-site mono">{message.linkMeta.site}</div>
          <div className="ne-link-card-title">{message.linkMeta.title}</div>
          <div className="ne-link-card-desc">{message.linkMeta.desc}</div>
        </div>
      </div>
    )
  }

  if (kind === 'link')  return <a className="ne-link" href={body} onClick={e => e.preventDefault()}>{body}</a>
  if (kind === 'quote') return <blockquote className="ne-quote">{fmt(body, onLinkClick)}</blockquote>

  // Plain text — collapse if long
  const long = isLongText(body)
  return (
    <div>
      <div className={`ne-text${long && !expanded ? ' ne-text-collapsed' : ''}`}>
        {fmt(body, onLinkClick)}
      </div>
      {long && (
        <button className="ne-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded ? 'Show less ↑' : 'Show more ↓'}
        </button>
      )}
    </div>
  )
}
