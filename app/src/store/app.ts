import { create } from 'zustand'
import type { Theme, Density, HeatmapScale, CalendarEvent } from '@/types'

export type FontSize = 'small' | 'medium' | 'large'
export type NoteMode = 'document' | 'thread'

interface AppState {
  // Appearance
  theme: Theme
  density: Density
  fontSize: FontSize
  heatmapScale: HeatmapScale
  showGrid: boolean
  scanlines: boolean
  // Settings modal
  settingsOpen: boolean
  // Capture modal
  captureOpen: boolean
  // Navigation
  activeWorkspace: string
  openNoteId: string | null
  openNoteMode: NoteMode
  openNoteLinkedEvent: CalendarEvent | null
  // Drag-to-swap
  drag: { id: string } | null
  dragOver: string | null
  // Actions
  setTheme: (t: Theme) => void
  setDensity: (d: Density) => void
  setFontSize: (f: FontSize) => void
  setHeatmapScale: (s: HeatmapScale) => void
  setShowGrid: (v: boolean) => void
  setScanlines: (v: boolean) => void
  setSettingsOpen: (v: boolean) => void
  setCaptureOpen: (v: boolean) => void
  setActiveWorkspace: (w: string) => void
  setOpenNoteId: (id: string | null) => void
  setOpenNoteMode: (mode: NoteMode) => void
  setOpenNoteLinkedEvent: (e: CalendarEvent | null) => void
  setDrag: (drag: { id: string } | null) => void
  setDragOver: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  density: 'compact',
  fontSize: 'small',
  heatmapScale: 'accent',
  showGrid: true,
  scanlines: false,
  activeWorkspace: 'research',
  openNoteId: null,
  openNoteMode: 'thread',
  openNoteLinkedEvent: null,
  settingsOpen: false,
  captureOpen: false,
  drag: null,
  dragOver: null,
  setTheme:            (theme)           => set({ theme }),
  setDensity:          (density)         => set({ density }),
  setFontSize:         (fontSize)        => set({ fontSize }),
  setHeatmapScale:     (heatmapScale)    => set({ heatmapScale }),
  setShowGrid:         (showGrid)        => set({ showGrid }),
  setScanlines:        (scanlines)       => set({ scanlines }),
  setSettingsOpen:     (settingsOpen)    => set({ settingsOpen }),
  setCaptureOpen:      (captureOpen)     => set({ captureOpen }),
  setActiveWorkspace:  (activeWorkspace) => set({ activeWorkspace }),
  setOpenNoteId:           (openNoteId)           => set({ openNoteId }),
  setOpenNoteMode:         (openNoteMode)         => set({ openNoteMode }),
  setOpenNoteLinkedEvent:  (openNoteLinkedEvent)  => set({ openNoteLinkedEvent }),
  setDrag:             (drag)            => set({ drag }),
  setDragOver:         (dragOver)        => set({ dragOver }),
}))
