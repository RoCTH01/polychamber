'use client'

import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'

export default function Sidebar() {
  const activeWs       = useAppStore(s => s.activeWorkspace)
  const setActiveWs    = useAppStore(s => s.setActiveWorkspace)
  const settingsOpen   = useAppStore(s => s.settingsOpen)
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen)
  const { workspaces } = useWorkspaces()

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
        <button
          className={`sb-settings${settingsOpen ? ' active' : ''}`}
          title="Settings"
          onClick={() => setSettingsOpen(!settingsOpen)}>
          ⚙
        </button>
      </div>
    </div>
  )
}
