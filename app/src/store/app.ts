import { create } from 'zustand'
import type { Theme, Density, HeatmapScale, CalendarEvent } from '@/types'

export type FontSize = 'small' | 'medium' | 'large'

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
  // Navigation
  activeWorkspace: string
  openNoteId: string | null
  openNoteLinkedEvent: CalendarEvent | null
  // Drag-to-swap
  drag: { id: string } | null
  dragOver: string | null
  // Widget visibility
  showHeatmap: boolean
  showFeed: boolean
  showCalendar: boolean
  showFunnel: boolean
  showFocus: boolean
  showReminders: boolean
  // Actions
  setTheme: (t: Theme) => void
  setDensity: (d: Density) => void
  setFontSize: (f: FontSize) => void
  setHeatmapScale: (s: HeatmapScale) => void
  setShowGrid: (v: boolean) => void
  setScanlines: (v: boolean) => void
  setSettingsOpen: (v: boolean) => void
  setActiveWorkspace: (w: string) => void
  setOpenNoteId: (id: string | null) => void
  setOpenNoteLinkedEvent: (e: CalendarEvent | null) => void
  setDrag: (drag: { id: string } | null) => void
  setDragOver: (id: string | null) => void
  setWidgetVisibility: (key: keyof AppState, v: boolean) => void
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
  openNoteLinkedEvent: null,
  settingsOpen: false,
  drag: null,
  dragOver: null,
  showHeatmap: true,
  showFeed: true,
  showCalendar: true,
  showFunnel: true,
  showFocus: true,
  showReminders: true,
  setTheme:            (theme)           => set({ theme }),
  setDensity:          (density)         => set({ density }),
  setFontSize:         (fontSize)        => set({ fontSize }),
  setHeatmapScale:     (heatmapScale)    => set({ heatmapScale }),
  setShowGrid:         (showGrid)        => set({ showGrid }),
  setScanlines:        (scanlines)       => set({ scanlines }),
  setActiveWorkspace:  (activeWorkspace) => set({ activeWorkspace }),
  setOpenNoteId:           (openNoteId)           => set({ openNoteId }),
  setOpenNoteLinkedEvent:  (openNoteLinkedEvent)  => set({ openNoteLinkedEvent }),
  setDrag:             (drag)            => set({ drag }),
  setDragOver:         (dragOver)        => set({ dragOver }),
  setSettingsOpen:     (settingsOpen)    => set({ settingsOpen }),
  setWidgetVisibility: (key, v)          => set({ [key]: v } as Partial<AppState>),
}))
