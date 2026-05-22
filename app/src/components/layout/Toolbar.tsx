'use client'

import { useEffect } from 'react'
import Icon from '../ui/Icon'

export default function Toolbar() {
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
      <button className="tb-btn"><Icon name="grid" /><span className="tb-label"> Layout</span></button>
      <button className="tb-btn"><Icon name="filter" /><span className="tb-label"> All sources</span></button>
      <button className="tb-btn"><Icon name="clock" /><span className="tb-label"> Today</span></button>
      <div className="tb-divider" />
      <button className="tb-btn tb-btn-capture"><Icon name="plus" /><span className="tb-label"> Capture</span></button>
      <div className="tb-divider" />
      <span className="mono tb-status" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
        SOURCES <span style={{ color: 'var(--accent)' }}>5/5</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        SYNC <span style={{ color: 'var(--text-2)' }}>live</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        INBOX <span style={{ color: 'var(--text-2)' }}>—</span>
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
