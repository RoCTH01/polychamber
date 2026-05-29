'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import HeatmapWidget   from '../widgets/HeatmapWidget'
import FeedWidget      from '../widgets/FeedWidget'
import CalendarWidget  from '../widgets/CalendarWidget'
import FunnelWidget    from '../widgets/FunnelWidget'
import FocusWidget     from '../widgets/FocusWidget'
import RemindersWidget from '../widgets/RemindersWidget'
import { useContextMenu } from '@/components/ui/ContextMenu'
import type { WidgetType, DragHandlers } from '@/types'

const WIDGET_TYPES_LIST: { type: WidgetType; label: string }[] = [
  { type: 'heatmap',   label: 'Heatmap' },
  { type: 'feed',      label: 'Feed' },
  { type: 'calendar',  label: 'Calendar' },
  { type: 'funnel',    label: 'Funnel' },
  { type: 'focus',     label: 'Focus' },
  { type: 'reminders', label: 'Reminders' },
]

const WIDGET_MAP: Record<WidgetType, React.ComponentType<{ id: string; dragHandlers: DragHandlers; onClose: () => void; config?: Record<string, unknown> }>> = {
  heatmap:   HeatmapWidget,
  feed:      FeedWidget,
  calendar:  CalendarWidget,
  funnel:    FunnelWidget,
  focus:     FocusWidget,
  reminders: RemindersWidget,
}

type ResizeDir = 'e' | 's' | 'se'

interface ResizeActive {
  id: string
  dir: ResizeDir
  startX: number
  startY: number
  startW: number
  startH: number
  itemX: number
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Turn `getComputedStyle(gridEl).gridTemplateColumns/Rows` into px track sizes. */
function parseTrackSizes(gridEl: HTMLElement) {
  const style  = getComputedStyle(gridEl)
  const cols   = style.gridTemplateColumns.trim().split(/\s+/)
  const rows   = style.gridTemplateRows.trim().split(/\s+/)
  const gap    = parseFloat(style.rowGap) || parseFloat(style.gap) || 6
  return {
    colSize: parseFloat(cols[0]) || 80,
    rowSize: parseFloat(rows[0]) || 60,
    gap,
  }
}

/** Pixel position → zero-based grid column index, accounting for gap size. */
function pixelToCol(relX: number, colSize: number, gap: number) {
  return Math.max(0, Math.floor(relX / (colSize + gap)))
}
function pixelToRow(relY: number, rowSize: number, gap: number) {
  return Math.max(0, Math.floor(relY / (rowSize + gap)))
}

/** AABB overlap test for two grid rectangles (exclusive bounds). */
function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WorkspaceGrid() {
  const activeWs     = useAppStore(s => s.activeWorkspace)
  const showGrid     = useAppStore(s => s.showGrid)
  const scanlines    = useAppStore(s => s.scanlines)
  const drag         = useAppStore(s => s.drag)
  const setDrag      = useAppStore(s => s.setDrag)
  const setDragOver  = useAppStore(s => s.setDragOver)
  const { workspaces, updateLayout, addWidget } = useWorkspaces()
  const { open: openMenu } = useContextMenu()
  const ws = workspaces.find(w => w.name === activeWs)

  const visible = ws?.layout ?? []

  // ── Resize state ─────────────────────────────────────────────────────────
  const gridRef          = useRef<HTMLDivElement>(null)
  const resizeActiveRef  = useRef<ResizeActive | null>(null)
  const resizePreviewRef = useRef<{ id: string; w: number; h: number } | null>(null)
  const [resizePreview, setResizePreviewState] = useState<{ id: string; w: number; h: number } | null>(null)

  const setResizePreview = useCallback((p: typeof resizePreview) => {
    resizePreviewRef.current = p
    setResizePreviewState(p)
  }, [])

  const getTrackSizes = useCallback(() => {
    return gridRef.current ? parseTrackSizes(gridRef.current) : { colSize: 80, rowSize: 60, gap: 6 }
  }, [])

  const handleResizeStart = useCallback((e: React.MouseEvent, id: string, dir: ResizeDir) => {
    e.preventDefault()
    e.stopPropagation()
    const item = ws?.layout.find(it => it.id === id)
    if (!item) return
    resizeActiveRef.current = { id, dir, startX: e.clientX, startY: e.clientY, startW: item.w, startH: item.h, itemX: item.x }
    setResizePreview({ id, w: item.w, h: item.h })
  }, [ws, setResizePreview])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeActiveRef.current
      if (!r) return
      const { colSize, rowSize, gap } = getTrackSizes()
      const dx = e.clientX - r.startX
      const dy = e.clientY - r.startY
      let newW = r.startW
      let newH = r.startH
      if (r.dir === 'e' || r.dir === 'se') newW = Math.max(2, Math.min(12 - r.itemX, Math.round(r.startW + dx / (colSize + gap))))
      if (r.dir === 's' || r.dir === 'se') newH = Math.max(2, Math.round(r.startH + dy / (rowSize + gap)))
      setResizePreview({ id: r.id, w: newW, h: newH })
    }
    const onUp = () => {
      const r = resizeActiveRef.current
      const p = resizePreviewRef.current
      resizeActiveRef.current = null
      setResizePreview(null)
      if (r && p && ws) updateLayout(ws.id, ws.layout.map(it => it.id === r.id ? { ...it, w: p.w, h: p.h } : it))
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [ws, updateLayout, getTrackSizes, setResizePreview])

  // Lock cursor globally during resize
  useEffect(() => {
    if (!resizePreview) return
    const dir = resizeActiveRef.current?.dir
    const cursor = dir === 'e' ? 'ew-resize' : dir === 's' ? 'ns-resize' : 'nwse-resize'
    document.body.style.cursor     = cursor
    document.body.style.userSelect = 'none'
    return () => { document.body.style.cursor = ''; document.body.style.userSelect = '' }
  }, [resizePreview])

  // ── Drag-to-place / drag-to-swap state ───────────────────────────────────
  // Cursor cell during drag (updated by grid-level onDragOver)
  const [dragCell, setDragCell] = useState<{ x: number; y: number } | null>(null)
  // How many cells from the widget's top-left the drag started (so ghost tracks the grab point)
  const dragOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  /** Widget directly under the cursor (becomes the swap target). Excludes the dragged item. */
  const hoverWidget = drag && dragCell
    ? (visible.find(it =>
        it.id !== drag.id &&
        dragCell.x >= it.x && dragCell.x < it.x + it.w &&
        dragCell.y >= it.y && dragCell.y < it.y + it.h,
      ) ?? null)
    : null

  /** Clamped top-left for the free-placement ghost. Only computed when NOT hovering a swap target. */
  const ghostPosition = (() => {
    if (!drag || !dragCell || hoverWidget) return null
    const item = visible.find(it => it.id === drag.id)
    if (!item) return null
    return {
      x: Math.max(0, Math.min(12 - item.w, dragCell.x - dragOffsetRef.current.dx)),
      y: Math.max(0, dragCell.y - dragOffsetRef.current.dy),
      w: item.w,
      h: item.h,
    }
  })()

  /** True if the ghost placement collides with any other widget. */
  const ghostOverlaps = ghostPosition && drag
    ? visible.some(it => {
        if (it.id === drag.id) return false
        return rectsOverlap(ghostPosition.x, ghostPosition.y, ghostPosition.w, ghostPosition.h, it.x, it.y, it.w, it.h)
      })
    : false

  // ── Viewport height (for clamped row sizing) ────────────────────────────
  const [windowHeight, setWindowHeight] = useState(
    () => (typeof window !== 'undefined' ? window.innerHeight : 900),
  )
  useEffect(() => {
    const onResize = () => setWindowHeight(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // ── Row count (resize-preview + ghost-preview aware) ─────────────────────
  const totalRows = Math.max(
    visible.length > 0
      ? Math.max(...visible.map(it =>
          resizePreview?.id === it.id ? it.y + resizePreview.h : it.y + it.h,
        ))
      : 12,
    // Expand grid to accommodate ghost only when the ghost can actually be placed
    ghostPosition && !ghostOverlaps ? ghostPosition.y + ghostPosition.h : 0,
  )

  // ── Row pixel height: fills viewport when small, caps at MAX_ROW_PX ───────
  // Chrome = titlebar (36) + toolbar (36) + workspace padding top+bottom (24)
  const CHROME_PX  = 96
  const MIN_ROW_PX = 60
  const MAX_ROW_PX = 140
  const rowPx = Math.max(
    MIN_ROW_PX,
    Math.min(MAX_ROW_PX, Math.floor((windowHeight - CHROME_PX) / totalRows)),
  )

  // ── Drag handlers ─────────────────────────────────────────────────────────

  const onDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)

    // Suppress the browser's native drag ghost — our .ghost-cell is the only visual
    const phantom = document.createElement('div')
    phantom.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0'
    document.body.appendChild(phantom)
    e.dataTransfer.setDragImage(phantom, 0, 0)
    requestAnimationFrame(() => document.body.removeChild(phantom))

    setDrag({ id })

    // Record cursor offset within the widget (in grid-cell units) so the ghost is anchored correctly
    const item = ws?.layout.find(it => it.id === id)
    if (item && gridRef.current) {
      const { colSize, rowSize, gap } = parseTrackSizes(gridRef.current)
      const rect = gridRef.current.getBoundingClientRect()
      const cursorCol = pixelToCol(e.clientX - rect.left, colSize, gap)
      const cursorRow = pixelToRow(e.clientY - rect.top,  rowSize, gap)
      dragOffsetRef.current = {
        dx: Math.max(0, Math.min(item.w - 1, cursorCol - item.x)),
        dy: Math.max(0, Math.min(item.h - 1, cursorRow - item.y)),
      }
    } else {
      dragOffsetRef.current = { dx: 0, dy: 0 }
    }
  }, [setDrag, ws])

  const onDragEnd = useCallback(() => {
    setDrag(null)
    setDragOver(null)
    setDragCell(null)
  }, [setDrag, setDragOver])

  // Grid-level: track cursor position and update dragCell
  const onGridDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!drag || !gridRef.current) return
    const { colSize, rowSize, gap } = parseTrackSizes(gridRef.current)
    const rect = gridRef.current.getBoundingClientRect()
    const col = pixelToCol(e.clientX - rect.left, colSize, gap)
    const row = pixelToRow(e.clientY - rect.top,  rowSize, gap)
    setDragCell(prev => (prev?.x === col && prev?.y === row) ? prev : { x: col, y: row })
  }, [drag])

  // Grid-level: commit placement or swap on drop
  const onGridDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId || !ws) { setDrag(null); setDragCell(null); return }

    if (hoverWidget) {
      // ── Swap ──────────────────────────────────────────────────────────────
      const items = [...ws.layout]
      const a = items.findIndex(i => i.id === sourceId)
      const b = items.findIndex(i => i.id === hoverWidget.id)
      if (a >= 0 && b >= 0) {
        const A = items[a], B = items[b]
        items[a] = { ...A, x: B.x, y: B.y, w: B.w, h: B.h }
        items[b] = { ...B, x: A.x, y: A.y, w: A.w, h: A.h }
        updateLayout(ws.id, items)
      }
    } else if (ghostPosition && !ghostOverlaps) {
      // ── Free placement ────────────────────────────────────────────────────
      updateLayout(ws.id, ws.layout.map(it =>
        it.id === sourceId ? { ...it, x: ghostPosition.x, y: ghostPosition.y } : it,
      ))
    }

    setDrag(null)
    setDragOver(null)
    setDragCell(null)
  }

  const handleGridContextMenu = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.widget')) return
    openMenu(e, WIDGET_TYPES_LIST.map(({ type, label }) => ({
      label: `Add ${label}`,
      action: () => addWidget(ws!.id, ws!.layout, type),
    })))
  }, [openMenu, addWidget, ws])

  if (!ws) return null

  return (
    <div className={`workspace${showGrid ? '' : ' no-grid'}`}>
      <div
        className="grid"
        ref={gridRef}
        style={{ gridTemplateRows: `repeat(${totalRows}, ${rowPx}px)` }}
        onContextMenu={handleGridContextMenu}
        onDragOver={onGridDragOver}
        onDrop={onGridDrop}
      >
        {/* ── Ghost drop preview ── */}
        {ghostPosition && !ghostOverlaps && (
          <div className="ghost-cell" style={{
            gridColumn: `${ghostPosition.x + 1} / span ${ghostPosition.w}`,
            gridRow:    `${ghostPosition.y + 1} / span ${ghostPosition.h}`,
          }} />
        )}

        {visible.map(it => {
          const Comp        = WIDGET_MAP[it.type]
          const isDragging  = drag?.id === it.id
          const isSwapTarget = hoverWidget?.id === it.id
          const isResizing  = resizePreview?.id === it.id
          const effectiveW  = isResizing ? resizePreview.w : it.w
          const effectiveH  = isResizing ? resizePreview.h : it.h

          return (
            <div key={it.id} className="grid-cell"
              style={{
                gridColumn:   `${it.x + 1} / span ${effectiveW}`,
                gridRow:      `${it.y + 1} / span ${effectiveH}`,
                minWidth: 0,  minHeight: 0,
                opacity:      isDragging ? 0.3 : 1,
                outline:      isSwapTarget ? '1.5px dashed var(--accent)' : 'none',
                outlineOffset: -1, borderRadius: 6,
                transition:   isDragging || isResizing ? 'none' : 'opacity 0.15s',
              }}
            >
              <Comp
                id={it.id}
                dragHandlers={{
                  draggable:   !isResizing,
                  onDragStart: onDragStart(it.id),
                  onDragEnd,
                }}
                onClose={() => {
                  if (ws) updateLayout(ws.id, ws.layout.filter(l => l.id !== it.id))
                }}
                config={it.config}
              />

              {/* Resize handles */}
              <div className="resize-handle resize-e"  onMouseDown={e => handleResizeStart(e, it.id, 'e')}  title="Drag to resize width" />
              <div className="resize-handle resize-s"  onMouseDown={e => handleResizeStart(e, it.id, 's')}  title="Drag to resize height" />
              <div className="resize-handle resize-se" onMouseDown={e => handleResizeStart(e, it.id, 'se')} title="Drag to resize" />
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
