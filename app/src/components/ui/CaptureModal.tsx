'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useItems } from '@/hooks/useItems'
import type { ItemFunnel } from '@/types'

type QueueTag = 'next' | 'soon' | 'later'

export default function CaptureModal() {
  const setCaptureOpen = useAppStore(s => s.setCaptureOpen)
  const [body, setBody]         = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags]         = useState<string[]>([])
  const [queue, setQueue]       = useState<QueueTag | null>(null)
  const [loading, setLoading]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const { createItem } = useItems()

  useEffect(() => { textareaRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCaptureOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCaptureOpen])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const handleSubmit = async () => {
    if (!body.trim() || loading) return
    setLoading(true)
    try {
      const funnel: ItemFunnel | undefined = queue
        ? { mediaKind: 'article', source: 'me', est: '', queueTag: queue }
        : undefined
      await createItem({ kind: 'note', body: body.trim(), tags, funnel })
      setCaptureOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const QUEUE_OPTS: { value: QueueTag; label: string }[] = [
    { value: 'next',  label: 'Next' },
    { value: 'soon',  label: 'Soon' },
    { value: 'later', label: 'Later' },
  ]

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) setCaptureOpen(false) }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick capture"
        style={{
          background: 'var(--panel-2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 16, width: 480, maxWidth: '90vw',
          display: 'flex', flexDirection: 'column', gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder="Capture a thought, paste a URL…"
          rows={3}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--panel-hi)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text)',
            fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
            lineHeight: 1.55, resize: 'none', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {tags.map(t => (
            <span key={t} className="chip" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>
              {t} ✕
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
              if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1])
            }}
            placeholder="add tag…"
            style={{
              height: 22, padding: '0 6px', border: '1px solid var(--border-subtle)',
              background: 'transparent', borderRadius: 11,
              color: 'var(--text-3)', fontFamily: 'var(--font-ui)',
              fontSize: 'var(--fs-xs)', outline: 'none', minWidth: 60,
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>Queue:</span>
          {QUEUE_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setQueue(q => q === opt.value ? null : opt.value)}
              style={{
                height: 24, padding: '0 10px',
                background: queue === opt.value ? 'var(--accent)' : 'var(--panel-hi)',
                color: queue === opt.value ? 'var(--bg)' : 'var(--text-3)',
                border: `1px solid ${queue === opt.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 4, fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-xs)', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || loading}
            style={{
              marginLeft: 'auto', height: 28, padding: '0 16px',
              background: body.trim() ? 'var(--accent)' : 'var(--panel-hi)',
              color: body.trim() ? 'var(--bg)' : 'var(--text-4)',
              border: 'none', borderRadius: 4,
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
              cursor: body.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Saving…' : 'Capture'}
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)' }}>
          Enter to save · Shift+Enter for newline · Esc to close
        </div>
      </div>
    </div>
  )
}
