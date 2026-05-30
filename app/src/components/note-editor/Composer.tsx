'use client'

import { useState } from 'react'
import SlashMenu from './SlashMenu'
import NotePicker from './NotePicker'
import type { Item } from '@/types'

type ComposerMode = 'normal' | 'slash' | 'notePicker-link' | 'notePicker-reference'

interface Props {
  noteId: string
  onSend: (body: string, kind: string) => void
}

const KINDS = [
  { k: 'text',  label: 'msg',   glyph: '¶', placeholder: 'Reply to this thread…' },
  { k: 'task',  label: 'task',  glyph: '☐', placeholder: 'New task — what needs doing?' },
  { k: 'link',  label: 'link',  glyph: '⌘', placeholder: 'Paste a URL…' },
  { k: 'quote', label: 'quote', glyph: '"', placeholder: 'Quote a passage…' },
] as const
type KindKey = typeof KINDS[number]['k']

export default function Composer({ noteId, onSend }: Props) {
  const [body, setBody]         = useState('')
  const [kind, setKind]         = useState<KindKey>('text')
  const [mode, setMode]         = useState<ComposerMode>('normal')
  const [slashPos, setSlashPos] = useState(0)

  const send = () => {
    if (!body.trim()) return
    onSend(body.trim(), kind)
    setBody('')
    setKind('text')
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setBody(val)
    const last = val[val.length - 1]
    const prev = val.length > 1 ? val[val.length - 2] : null
    if (last === '/' && (prev === null || /[\s\n]/.test(prev))) {
      setMode('slash')
      setSlashPos(val.length - 1)
    } else if (mode === 'slash') {
      setMode('normal')
    }
  }

  const handleSlashSelect = (id: 'link' | 'reference' | 'task' | 'quote') => {
    const trimmed = body.slice(0, slashPos)
    if (id === 'link') {
      setBody(trimmed)
      setMode('notePicker-link')
    } else if (id === 'reference') {
      setBody(trimmed)
      setMode('notePicker-reference')
    } else {
      setBody(trimmed)
      setKind(id)
      setMode('normal')
    }
  }

  const handleNotePick = (note: Item) => {
    const displayTitle = note.author ?? note.body.slice(0, 40)
    if (mode === 'notePicker-link') {
      setBody(b => `${b}[[${note.id}:${displayTitle}]] `)
      setMode('normal')
    } else {
      // Reference block — auto-send so the user never sees 'uuid:Title' in textarea
      onSend(`${note.id}:${displayTitle}`, 'note_ref')
      setBody('')
      setKind('text')
      setMode('normal')
    }
  }

  const handleDismiss = () => {
    setBody(b => b.slice(0, slashPos))
    setMode('normal')
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
        <span className="ne-fmt-hint mono">**bold** · *italic* · `code` · / commands</span>
      </div>
      <div className="ne-input-wrap" style={{ position: 'relative' }}>
        {mode === 'slash' && (
          <SlashMenu onSelect={handleSlashSelect} onDismiss={handleDismiss} />
        )}
        {(mode === 'notePicker-link' || mode === 'notePicker-reference') && (
          <NotePicker excludeId={noteId} onSelect={handleNotePick} onDismiss={handleDismiss} />
        )}
        <span className="ne-avatar me">me</span>
        <textarea
          className="ne-input"
          placeholder={placeholder}
          value={body}
          onChange={handleChange}
          rows={Math.max(1, body.split('\n').length)}
          onKeyDown={e => {
            if (e.key === 'Escape' && mode !== 'normal') { handleDismiss(); return }
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
          }}
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
