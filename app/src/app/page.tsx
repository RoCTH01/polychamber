'use client'

import { useEffect } from 'react'
import Sidebar        from '@/components/layout/Sidebar'
import Toolbar        from '@/components/layout/Toolbar'
import WorkspaceGrid  from '@/components/layout/WorkspaceGrid'
import NoteEditor     from '@/components/note-editor/NoteEditor'
import SettingsModal  from '@/components/SettingsModal'
import { useAppStore } from '@/store/app'
import { useItems }    from '@/hooks/useItems'

export default function Page() {
  const theme        = useAppStore(s => s.theme)
  const density      = useAppStore(s => s.density)
  const fontSize     = useAppStore(s => s.fontSize)
  const settingsOpen = useAppStore(s => s.settingsOpen)
  const openNoteId   = useAppStore(s => s.openNoteId)
  const setOpenNote  = useAppStore(s => s.setOpenNoteId)

  // Fetch root notes so we can find the open one
  const { items, updateItem } = useItems({ parentId: 'null' })
  const openNote = items.find(n => n.id === openNoteId) ?? null

  // Sync theme / density / font-size to root data-* attributes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme',     theme)
    document.documentElement.setAttribute('data-density',   density)
    if (fontSize === 'medium') {
      document.documentElement.removeAttribute('data-font-size')
    } else {
      document.documentElement.setAttribute('data-font-size', fontSize)
    }
  }, [theme, density, fontSize])

  return (
    <div className="app" data-theme={theme} data-density={density}>
      {/* macOS titlebar — traffic lights live in the left 72px */}
      <div className="titlebar">
        <div className="titlebar-traffic" />
        <div className="titlebar-drag" />
        <span className="titlebar-title">Polychamber</span>
      </div>

      <Sidebar />
      <div className="app-main">
        <Toolbar />
        <WorkspaceGrid />
      </div>
      {openNote && (
        <NoteEditor
          note={openNote}
          onClose={() => setOpenNote(null)}
          onUpdate={updated => updateItem(updated.id, updated)}
        />
      )}

      {settingsOpen && <SettingsModal />}
    </div>
  )
}
