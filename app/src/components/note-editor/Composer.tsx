'use client'

import { useState } from 'react'

type MessageKind = 'text' | 'task' | 'link' | 'quote'

interface Props {
  onSend: (body: string, kind: MessageKind) => void
}

const KINDS: { k: MessageKind; label: string; glyph: string; placeholder: string }[] = [
  { k: 'text',  label: 'msg',   glyph: '¶', placeholder: 'Reply to this thread…' },
  { k: 'task',  label: 'task',  glyph: '☐', placeholder: 'New task — what needs doing?' },
  { k: 'link',  label: 'link',  glyph: '⌘', placeholder: 'Paste a URL…' },
  { k: 'quote', label: 'quote', glyph: '"', placeholder: 'Quote a passage…' },
]

export default function Composer({ onSend }: Props) {
  const [body, setBody]   = useState('')
  const [kind, setKind]   = useState<MessageKind>('text')

  const send = () => {
    if (!body.trim()) return
    onSend(body.trim(), kind)
    setBody('')
    setKind('text')
  }

  const placeholder = KINDS.find(k2 => k2.k === kind)?.placeholder ?? ''

  return (
    <div className="ne-composer">
      <div className="ne-kind-row">
        {KINDS.map(({ k, label, glyph }) => (
          <button key={k} className={`ne-kind${kind === k ? ' active' : ''}`} onClick={() => setKind(k)}>
            <span className="ne-kind-g">{glyph}</span>{label}
          </button>
        ))}
        <span className="ne-fmt-hint mono">**bold** · *italic* · `code` · @mention · #tag</span>
      </div>
      <div className="ne-input-wrap">
        <span className="ne-avatar me">me</span>
        <textarea className="ne-input" placeholder={placeholder} value={body}
          onChange={e => setBody(e.target.value)}
          rows={Math.max(1, body.split('\n').length)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() } }}
        />
        <div className="ne-input-actions">
          <button className="ne-icon-btn" title="Attach">⌇</button>
          <button className="ne-icon-btn" title="Emoji">☺</button>
          <button className={`ne-send${body.trim() ? ' ready' : ''}`} onClick={send} disabled={!body.trim()}>
            <span className="mono">⌘⏎</span> send
          </button>
        </div>
      </div>
    </div>
  )
}
