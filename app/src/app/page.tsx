'use client'

import { useEffect } from 'react'
import Sidebar        from '@/components/layout/Sidebar'
import Toolbar        from '@/components/layout/Toolbar'
import WorkspaceGrid  from '@/components/layout/WorkspaceGrid'
import NoteEditor     from '@/components/note-editor/NoteEditor'
import SettingsModal        from '@/components/SettingsModal'
import CaptureModal from '@/components/ui/CaptureModal'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { useAppStore } from '@/store/app'
import { useItems }    from '@/hooks/useItems'

export default function Page() {
  const theme          = useAppStore(s => s.theme)
  const density        = useAppStore(s => s.density)
  const fontSize       = useAppStore(s => s.fontSize)
  const settingsOpen   = useAppStore(s => s.settingsOpen)
  const captureOpen    = useAppStore(s => s.captureOpen)
  const activeWs       = useAppStore(s => s.activeWorkspace)
  const openNoteId         = useAppStore(s => s.openNoteId)
  const setOpenNote        = useAppStore(s => s.setOpenNoteId)
  const openNoteLinkedEvent = useAppStore(s => s.openNoteLinkedEvent)
  const setOpenNoteLinkedEvent = useAppStore(s => s.setOpenNoteLinkedEvent)

  // Fetch root notes so we can find the open one
  const { items, updateItem } = useItems({ parentId: 'null' })
  const openNote = items.find(n => n.id === openNoteId) ?? null

  // Sync theme/density to <html> for any styles outside .app (e.g. body bg)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme',   theme)
    document.documentElement.setAttribute('data-density', density)
  }, [theme, density])

  return (
    <ContextMenuProvider>
    <div className="app" data-theme={theme} data-density={density} data-font-size={fontSize}>
      {/* macOS titlebar — traffic lights live in the left 72px */}
      <div className="titlebar">
        <div className="titlebar-traffic" />
        <div className="titlebar-drag" />
        <span className="titlebar-title">{activeWs}</span>
      </div>

      <Sidebar />
      <div className="app-main">
        <Toolbar />
        <WorkspaceGrid />
      </div>
      {openNote && (
        <NoteEditor
          note={openNote}
          linkedEvent={openNoteLinkedEvent}
          onClose={() => { setOpenNote(null); setOpenNoteLinkedEvent(null) }}
          onUpdate={updated => updateItem(updated.id, updated)}
        />
      )}

      {settingsOpen && <SettingsModal />}
      {captureOpen && <CaptureModal />}
    </div>
    </ContextMenuProvider>
  )
}
