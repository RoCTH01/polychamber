'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useItems } from '@/hooks/useItems'
import { relativeTime } from '@/lib/utils'
import Icon from '../ui/Icon'
import type { WidgetType } from '@/types'

const WIDGET_TYPES: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'heatmap',   label: 'Heatmap',   icon: '▦' },
  { type: 'feed',      label: 'Feed',       icon: '≡' },
  { type: 'calendar',  label: 'Calendar',   icon: '▤' },
  { type: 'funnel',    label: 'Funnel',     icon: '⬓' },
  { type: 'focus',     label: 'Focus',      icon: '◎' },
  { type: 'reminders', label: 'Reminders',  icon: '☐' },
]

export default function Toolbar() {
  const activeWs = useAppStore(s => s.activeWorkspace)
  const setCaptureOpen = useAppStore(s => s.setCaptureOpen)
  const { workspaces, addWidget } = useWorkspaces()
  const ws = workspaces.find(w => w.name === activeWs)

  const { items: rootNotes } = useItems({ kind: 'note', parentId: 'null' })
  const noteCount  = rootNotes.length
  const inboxCount = rootNotes.filter(n => !n.starred && n.tags.length === 0).length
  const latestNote = rootNotes[0]
  const lastStr    = latestNote ? relativeTime(new Date(latestNote.createdAt)) : '—'

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onMouse = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false) }
    document.addEventListener('mousedown', onMouse)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onMouse); window.removeEventListener('keydown', onKey) }
  }, [pickerOpen])

  // ⌘K shortcut — visual-only in this build
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="toolbar">
      <div style={{ position: 'relative' }} ref={pickerRef}>
        <button className="tb-btn" onClick={() => setPickerOpen(p => !p)}>
          <Icon name="grid" /><span className="tb-label"> Layout</span>
        </button>
        {pickerOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'var(--panel-2)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 0', minWidth: 160, zIndex: 200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {WIDGET_TYPES.map(({ type, label, icon }) => (
              <button key={type}
                onClick={() => { if (ws) { addWidget(ws.id, ws.layout, type) } setPickerOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 12px',
                  background: 'transparent', border: 0,
                  color: 'var(--text)', fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--fs-sm)', cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-hi)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--accent)', width: 16 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="tb-divider" />
      <button className="tb-btn tb-btn-capture" onClick={() => setCaptureOpen(true)}><Icon name="plus" /><span className="tb-label"> Capture</span></button>
      <div className="tb-divider" />
      <span className="mono tb-status" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
        NOTES <span style={{ color: 'var(--text-2)' }}>{noteCount}</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        LAST <span style={{ color: 'var(--text-2)' }}>{lastStr}</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        INBOX <span style={{ color: inboxCount > 0 ? 'var(--accent)' : 'var(--text-2)' }}>{inboxCount || '—'}</span>
      </span>
      <div className="tb-spacer" />
      <div className="tb-search">
        <Icon name="search" />
        <span>Search across all sources…</span>
        <span className="kbd">⌘K</span>
      </div>
    </div>
  )
}
