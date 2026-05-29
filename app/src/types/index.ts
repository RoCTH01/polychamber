export type ItemKind = 'note' | 'reminder' | 'funnel_item' | 'focus_session'
export type Src = 'tw' | 'dc' | 'ob' | 'mn' | 'rd'
export type MessageWho = 'src' | 'me'
export type MessageKind = 'text' | 'task' | 'link' | 'quote'
export type WidgetType = 'heatmap' | 'feed' | 'calendar' | 'funnel' | 'focus' | 'reminders'
export type HeatmapScale = 'accent' | 'mono' | 'thermal'

export interface HeatmapConfig {
  mode: 'all' | 'tag' | 'habit'
  tag?: string
  goalPerWeek?: number
}
export type Theme = 'dark' | 'light' | 'hc'
export type Density = 'compact' | 'comfy' | 'spacious'

export interface ItemReminder {
  itemId?: string
  due: 'today' | 'tomorrow' | 'this wk' | 'next wk'
  priority: 1 | 2 | 3
  done: boolean
}

export interface ItemFunnel {
  itemId?: string
  mediaKind: 'paper' | 'video' | 'article' | 'thread'
  source: string
  est: string
  queueTag: 'next' | 'soon' | 'later'
}

export interface ItemFocus {
  itemId?: string
  startedAt: string
  endedAt: string | null
  durationMinutes: number | null
}

export interface ItemMessage {
  itemId?: string
  who: MessageWho
  messageKind: MessageKind | null
  reactions: Array<{ e: string; n: number }> | null
  linkMeta: { title: string; site: string; desc: string } | null
  done: boolean | null
}

export interface Item {
  id: string
  kind: ItemKind
  body: string
  src: Src | null
  author: string | null
  parentId: string | null
  starred: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  reminder?: ItemReminder
  funnel?: ItemFunnel
  focus?: ItemFocus
  message?: ItemMessage
}

export interface LayoutItem {
  id: string
  type: WidgetType
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, unknown>
}

export interface Workspace {
  id: string
  name: string
  layout: LayoutItem[]
}

export interface ActivityDay {
  date: string
  count: number
  sourceBreakdown: Record<string, number>
}

export interface CalendarEvent {
  id: string
  title: string
  kind: 'meet' | 'focus' | 'social'
  dayOfWeek: number
  startHour: number
  endHour: number
  weekStart: string
  isCurrent: boolean
  linkedNoteId: string | null
}

export interface DragHandlers {
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

export const SRC_LABEL: Record<string, string> = {
  tw: 'TW', dc: 'DC', ob: 'OB', mn: 'MN', rd: 'RD',
}
export const SRC_NAME: Record<string, string> = {
  tw: 'Twitter', dc: 'Discord', ob: 'Obsidian', mn: 'Notes', rd: 'Reddit',
}
