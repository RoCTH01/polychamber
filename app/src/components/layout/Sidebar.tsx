'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'

export default function Sidebar() {
  const activeWs      = useAppStore(s => s.activeWorkspace)
  const setActiveWs   = useAppStore(s => s.setActiveWorkspace)
  const { workspaces } = useWorkspaces()

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className="sidebar">
      <div className="sb-logo" title="Polychamber">P/C</div>
      <div className="sb-divider" />
      {workspaces.map(ws => (
        <div key={ws.id}
          className={`sb-ws${ws.name === activeWs ? ' active' : ''}`}
          onClick={() => setActiveWs(ws.name)}
          title={ws.name}>
          <span className="sb-pip" />
          {ws.name.slice(0, 2).toUpperCase()}
          <span className="sb-tip">{ws.name}</span>
        </div>
      ))}
      <div className="sb-add" title="New workspace">+</div>
      <div className="sb-foot">
        <div className="sb-divider" />
        <div className="sb-status">
          <span className="sb-pulse" title="online" />
          <span className="tab">{time}</span>
        </div>
      </div>
    </div>
  )
}
