import { create } from 'zustand'
import type { Theme, Density, HeatmapScale } from '@/types'

interface AppState {
  // Appearance
  theme: Theme
  density: Density
  heatmapScale: HeatmapScale
  showGrid: boolean
  scanlines: boolean
  // Navigation
  activeWorkspace: string
  openNoteId: string | null
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
  setHeatmapScale: (s: HeatmapScale) => void
  setShowGrid: (v: boolean) => void
  setScanlines: (v: boolean) => void
  setActiveWorkspace: (w: string) => void
  setOpenNoteId: (id: string | null) => void
  setDrag: (drag: { id: string } | null) => void
  setDragOver: (id: string | null) => void
  setWidgetVisibility: (key: keyof AppState, v: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  density: 'compact',
  heatmapScale: 'accent',
  showGrid: true,
  scanlines: false,
  activeWorkspace: 'research',
  openNoteId: null,
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
  setHeatmapScale:     (heatmapScale)    => set({ heatmapScale }),
  setShowGrid:         (showGrid)        => set({ showGrid }),
  setScanlines:        (scanlines)       => set({ scanlines }),
  setActiveWorkspace:  (activeWorkspace) => set({ activeWorkspace }),
  setOpenNoteId:       (openNoteId)      => set({ openNoteId }),
  setDrag:             (drag)            => set({ drag }),
  setDragOver:         (dragOver)        => set({ dragOver }),
  setWidgetVisibility: (key, v)          => set({ [key]: v } as Partial<AppState>),
}))
