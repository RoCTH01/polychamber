'use client'

import { useMemo, useRef, useState } from 'react'
import SlashMenu, { SLASH_OPTIONS } from './SlashMenu'
import NotePicker from './NotePicker'
import type { Item, MessageKind } from '@/types'

type ComposerMode = 'normal' | 'slash' | 'notePicker-link' | 'notePicker-reference'

interface Props {
  noteId: string
  onSend: (body: string, kind: MessageKind) => void
}

const KINDS = [
  { k: 'text',  label: 'msg',   glyph: '¶', placeholder: 'Reply to this thread…' },
  { k: 'task',  label: 'task',  glyph: '☐', placeholder: 'New task — what needs doing?' },
  { k: 'link',  label: 'link',  glyph: '⌘', placeholder: 'Paste a URL…' },
  { k: 'quote', label: 'quote', glyph: '"', placeholder: 'Quote a passage…' },
] as const
type KindKey = typeof KINDS[number]['k']

export default function Composer({ noteId, onSend }: Props) {
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)
  const [body, setBody]             = useState('')
  const [kind, setKind]             = useState<KindKey>('text')
  const [mode, setMode]             = useState<ComposerMode>('normal')
  const [slashPos, setSlashPos]     = useState(0)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)

  // Filter options by query — reset selection to 0 when query changes
  const filteredOptions = useMemo(
    () => SLASH_OPTIONS.filter(opt =>
      opt.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
      opt.id.toLowerCase().includes(slashQuery.toLowerCase())
    ),
    [slashQuery],
  )

  const send = () => {
    if (!body.trim()) return
    onSend(body.trim(), kind)
    setBody('')
    setKind('text')
  }

  const resetSlash = () => {
    setSlashQuery('')
    setSlashIndex(0)
  }

  const refocus = () => {
    // Return focus to the textarea after a menu closes
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setBody(val)

    if (mode === 'normal') {
      const last = val[val.length - 1]
      const prev = val.length > 1 ? val[val.length - 2] : null
      if (last === '/' && (prev === null || /[\s\n]/.test(prev))) {
        setMode('slash')
        setSlashPos(val.length - 1)
        resetSlash()
      }
    } else if (mode === 'slash') {
      if (val.length <= slashPos) {
        // User deleted the / itself — dismiss
        setMode('normal')
        resetSlash()
      } else {
        const afterSlash = val.slice(slashPos + 1)
        // Allow only letters as query; anything else (space, number, symbol) dismisses
        if (/^[a-zA-Z]*$/.test(afterSlash)) {
          const matches = SLASH_OPTIONS.filter(opt =>
            opt.label.toLowerCase().includes(afterSlash.toLowerCase()) ||
            opt.id.toLowerCase().includes(afterSlash.toLowerCase())
          )
          if (afterSlash !== '' && matches.length === 0) {
            // No options match — dismiss
            setMode('normal')
            resetSlash()
          } else {
            setSlashQuery(afterSlash)
            setSlashIndex(0)  // Reset to first match on every query change
          }
        } else {
          setMode('normal')
          resetSlash()
        }
      }
    }
  }

  const handleSlashSelect = (id: 'link' | 'reference' | 'task' | 'quote') => {
    const trimmed = body.slice(0, slashPos)
    resetSlash()
    if (id === 'link') {
      setBody(trimmed)
      setMode('notePicker-link')
      // NotePicker has its own autoFocus — no refocus needed here
    } else if (id === 'reference') {
      setBody(trimmed)
      setMode('notePicker-reference')
    } else {
      setBody(trimmed)
      setKind(id)
      setMode('normal')
      refocus()
    }
  }

  const handleNotePick = (note: Item) => {
    const displayTitle = note.author ?? note.body.slice(0, 40)
    if (mode === 'notePicker-link') {
      setBody(b => `${b}[[${note.id}:${displayTitle}]] `)
      setMode('normal')
      refocus()  // Return focus so user can keep typing or hit ⌘⏎ to send
    } else {
      // Reference block — auto-send so the user never sees 'uuid:Title' in textarea
      onSend(`${note.id}:${displayTitle}`, 'note_ref')
      setBody('')
      setKind('text')
      setMode('normal')
      refocus()
    }
  }

  const handleDismiss = () => {
    setBody(b => b.slice(0, slashPos))
    setMode('normal')
    resetSlash()
    refocus()
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
        {mode === 'slash' && filteredOptions.length > 0 && (
          <SlashMenu
            options={filteredOptions}
            selectedIndex={Math.min(slashIndex, filteredOptions.length - 1)}
            onSelect={handleSlashSelect}
            onHover={setSlashIndex}
            onDismiss={handleDismiss}
          />
        )}
        {(mode === 'notePicker-link' || mode === 'notePicker-reference') && (
          <NotePicker excludeId={noteId} onSelect={handleNotePick} onDismiss={handleDismiss} />
        )}
        <textarea
          ref={textareaRef}
          className="ne-input"
          placeholder={placeholder}
          value={body}
          onChange={handleChange}
          rows={Math.max(1, body.split('\n').length)}
          onKeyDown={e => {
            if (mode === 'slash' && filteredOptions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSlashIndex(i => (i + 1) % filteredOptions.length)
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSlashIndex(i => (i - 1 + filteredOptions.length) % filteredOptions.length)
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                const opt = filteredOptions[Math.min(slashIndex, filteredOptions.length - 1)]
                if (opt) handleSlashSelect(opt.id)
                return
              }
            }
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
