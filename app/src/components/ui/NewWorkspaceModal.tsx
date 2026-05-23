'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'

interface Props { onClose: () => void }

export default function NewWorkspaceModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { createWorkspace } = useWorkspaces()
  const setActiveWorkspace = useAppStore(s => s.setActiveWorkspace)
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    if (!name.trim() || loading) return
    setLoading(true)
    await createWorkspace(name.trim())
    setActiveWorkspace(name.trim())
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="New workspace">
        <div className="settings-header">
          <h2>New workspace</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section-label">Name</div>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="e.g. writing, research, shipping…"
              style={{
                width: '100%', height: 32, padding: '0 10px',
                background: 'var(--panel-hi)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            style={{
              height: 32, padding: '0 16px',
              background: name.trim() ? 'var(--accent)' : 'var(--panel-hi)',
              color: name.trim() ? 'var(--bg)' : 'var(--text-4)',
              border: 'none', borderRadius: 4,
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
              cursor: name.trim() ? 'default' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}
