'use client'

import { useCallback } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import HeatmapWidget   from '../widgets/HeatmapWidget'
import FeedWidget      from '../widgets/FeedWidget'
import CalendarWidget  from '../widgets/CalendarWidget'
import FunnelWidget    from '../widgets/FunnelWidget'
import FocusWidget     from '../widgets/FocusWidget'
import RemindersWidget from '../widgets/RemindersWidget'
import type { WidgetType, DragHandlers } from '@/types'

const WIDGET_MAP: Record<WidgetType, React.ComponentType<{ id: string; dragHandlers: DragHandlers; onClose: () => void }>> = {
  heatmap:   HeatmapWidget,
  feed:      FeedWidget,
  calendar:  CalendarWidget,
  funnel:    FunnelWidget,
  focus:     FocusWidget,
  reminders: RemindersWidget,
}

const VISIBILITY_KEY: Record<WidgetType, keyof ReturnType<typeof useAppStore.getState>> = {
  heatmap:   'showHeatmap',
  feed:      'showFeed',
  calendar:  'showCalendar',
  funnel:    'showFunnel',
  focus:     'showFocus',
  reminders: 'showReminders',
}

export default function WorkspaceGrid() {
  const activeWs          = useAppStore(s => s.activeWorkspace)
  const showGrid          = useAppStore(s => s.showGrid)
  const scanlines         = useAppStore(s => s.scanlines)
  const drag              = useAppStore(s => s.drag)
  const dragOver          = useAppStore(s => s.dragOver)
  const setDrag           = useAppStore(s => s.setDrag)
  const setDragOver       = useAppStore(s => s.setDragOver)
  const setWidgetVis      = useAppStore(s => s.setWidgetVisibility)
  const store             = useAppStore()

  const { workspaces, updateLayout } = useWorkspaces()
  const ws = workspaces.find(w => w.name === activeWs)

  const visible = (ws?.layout ?? []).filter(it => {
    const key = VISIBILITY_KEY[it.type]
    return key ? store[key] : true
  })

  const onDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDrag({ id })
  }, [setDrag])

  const onDragEnd = useCallback(() => { setDrag(null); setDragOver(null) }, [setDrag, setDragOver])

  const onDragOver = useCallback((id: string) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (drag && drag.id !== id) setDragOver(id)
  }, [drag, setDragOver])

  const onDrop = useCallback((targetId: string) => (e: React.DragEvent) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId || !ws) return

    const items = [...ws.layout]
    const a = items.findIndex(i => i.id === sourceId)
    const b = items.findIndex(i => i.id === targetId)
    if (a < 0 || b < 0) return

    const A = items[a], B = items[b]
    items[a] = { ...A, x: B.x, y: B.y, w: B.w, h: B.h }
    items[b] = { ...B, x: A.x, y: A.y, w: A.w, h: A.h }

    updateLayout(ws.id, items)
    setDrag(null); setDragOver(null)
  }, [ws, updateLayout, setDrag, setDragOver])

  if (!ws) return null

  return (
    <div className={`workspace${showGrid ? '' : ' no-grid'}`}>
      <div className="grid">
        {visible.map(it => {
          const Comp      = WIDGET_MAP[it.type]
          const isDragging = drag?.id === it.id
          const isTarget   = dragOver === it.id
          return (
            <div key={it.id} style={{
              gridColumn: `${it.x + 1} / span ${it.w}`,
              gridRow:    `${it.y + 1} / span ${it.h}`,
              minWidth: 0, minHeight: 0, display: 'flex',
              opacity:  isDragging ? 0.35 : 1,
              outline:  isTarget ? '1.5px dashed var(--accent)' : 'none',
              outlineOffset: -1, borderRadius: 6,
              transition: 'opacity 0.15s',
            }}
              onDragOver={onDragOver(it.id)}
              onDrop={onDrop(it.id)}>
              <Comp id={it.id}
                dragHandlers={{ draggable: true, onDragStart: onDragStart(it.id), onDragEnd }}
                onClose={() => setWidgetVis(VISIBILITY_KEY[it.type] as keyof ReturnType<typeof useAppStore.getState>, false)}
              />
            </div>
          )
        })}
      </div>

      {scanlines && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'multiply',
        }} />
      )}
    </div>
  )
}
