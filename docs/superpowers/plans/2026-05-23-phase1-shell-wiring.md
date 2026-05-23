# Phase 1 — Shell Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all dead Phase 1 shell buttons and replace global Zustand visibility flags with a per-workspace layout-as-truth model.

**Architecture:** Widget visibility is determined entirely by `ws.layout` — hiding removes an item from the array, adding appends one. Zustand's 6 `showX` flags and `setWidgetVisibility` are deleted. Pure utility functions live in `lib/utils.ts` for testability. All other wiring (calendar nav, focus history, refresh, settings, status strip) is layered on top.

**Tech Stack:** Next.js 15, React 19, Zustand 5, SWR 2, Drizzle ORM, Postgres, Vitest + @testing-library/react

---

## File Map

| File | Change |
|---|---|
| `app/src/lib/utils.ts` | **Create** — `weekStartFor`, `relativeTime` pure utilities |
| `app/src/lib/utils.test.ts` | **Create** — unit tests for utilities |
| `app/src/store/app.ts` | **Modify** — delete 6 visibility fields + `setWidgetVisibility` |
| `app/src/components/layout/WorkspaceGrid.tsx` | **Modify** — remove `VISIBILITY_KEY`, use layout directly, update `onClose` |
| `app/src/app/api/workspaces/route.ts` | **Modify** — add `POST` handler |
| `app/src/app/api/workspaces/route.test.ts` | **Create** — POST handler tests |
| `app/src/hooks/useWorkspaces.ts` | **Modify** — add `createWorkspace`, `addWidget` |
| `app/src/hooks/useActivity.ts` | **Modify** — expose `mutate` in return value |
| `app/src/hooks/useCalendarEvents.ts` | **Modify** — expose `mutate` in return value |
| `app/src/components/ui/NewWorkspaceModal.tsx` | **Create** — name-input modal |
| `app/src/components/layout/Sidebar.tsx` | **Modify** — wire `+` button to modal |
| `app/src/components/layout/Toolbar.tsx` | **Modify** — widget picker panel + live status strip |
| `app/src/components/SettingsModal.tsx` | **Modify** — add Display section (grid/scanlines toggles) |
| `app/src/components/widgets/WidgetShell.tsx` | **Modify** — add `onRefresh` prop |
| `app/src/components/widgets/CalendarWidget.tsx` | **Modify** — week nav state + note capture |
| `app/src/components/widgets/FocusWidget.tsx` | **Modify** — replace hardcoded sessions with live data |
| `app/src/components/widgets/HeatmapWidget.tsx` | **Modify** — pass refresh handler |
| `app/src/components/widgets/FeedWidget.tsx` | **Modify** — destructure + pass `mutate` |
| `app/src/components/widgets/FunnelWidget.tsx` | **Modify** — destructure + pass `mutate` |
| `app/src/components/widgets/RemindersWidget.tsx` | **Modify** — destructure + pass `mutate` |

---

## Task 1: Pure utility functions

**Files:**
- Create: `app/src/lib/utils.ts`
- Create: `app/src/lib/utils.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// app/src/lib/utils.test.ts
import { describe, test, expect } from 'vitest'
import { weekStartFor, relativeTime } from './utils'

describe('weekStartFor', () => {
  // Wednesday 2026-05-20 noon UTC — getDay()=3, dow=(3+6)%7=2 → Monday=May 18
  const wed = new Date('2026-05-20T12:00:00.000Z')

  test('offset 0 returns Monday of current week', () => {
    expect(weekStartFor(0, wed)).toBe('2026-05-18')
  })
  test('offset +1 returns next Monday', () => {
    expect(weekStartFor(1, wed)).toBe('2026-05-25')
  })
  test('offset -1 returns previous Monday', () => {
    expect(weekStartFor(-1, wed)).toBe('2026-05-11')
  })
})

describe('relativeTime', () => {
  test('< 1 minute returns "just now"', () => {
    const d = new Date(Date.now() - 30_000)
    expect(relativeTime(d)).toBe('just now')
  })
  test('45 minutes ago returns "45m ago"', () => {
    const d = new Date(Date.now() - 45 * 60_000)
    expect(relativeTime(d)).toBe('45m ago')
  })
  test('3 hours ago returns "3h ago"', () => {
    const d = new Date(Date.now() - 3 * 3_600_000)
    expect(relativeTime(d)).toBe('3h ago')
  })
  test('2 days ago returns "2d ago"', () => {
    const d = new Date(Date.now() - 2 * 86_400_000)
    expect(relativeTime(d)).toBe('2d ago')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd app && npx vitest run src/lib/utils.test.ts
```
Expected: FAIL — `Cannot find module './utils'`

- [ ] **Step 3: Implement utilities**

```typescript
// app/src/lib/utils.ts

export function weekStartFor(offset: number, now = new Date()): string {
  const dow = (now.getDay() + 6) % 7
  const start = new Date(now)
  start.setDate(now.getDate() - dow + offset * 7)
  start.setHours(0, 0, 0, 0)
  return start.toISOString().split('T')[0]
}

export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  return `${Math.floor(diffH / 24)}d ago`
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd app && npx vitest run src/lib/utils.test.ts
```
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/utils.ts app/src/lib/utils.test.ts
git commit -m "feat: add weekStartFor and relativeTime utilities"
```

---

## Task 2: Core model — layout as truth

**Files:**
- Modify: `app/src/store/app.ts`
- Modify: `app/src/components/layout/WorkspaceGrid.tsx`

- [ ] **Step 1: Remove visibility fields from `app/src/store/app.ts`**

Remove the following from `AppState` interface, the `create()` initializer, and the interface definitions:

```typescript
// DELETE these fields from AppState interface:
showHeatmap: boolean
showFeed: boolean
showCalendar: boolean
showFunnel: boolean
showFocus: boolean
showReminders: boolean
setWidgetVisibility: (key: keyof AppState, v: boolean) => void

// DELETE these from the create() initializer:
showHeatmap: true,
showFeed: true,
showCalendar: true,
showFunnel: true,
showFocus: true,
showReminders: true,
setWidgetVisibility: (key, v) => set({ [key]: v } as Partial<AppState>),
```

The store file should no longer reference those 7 entries anywhere.

- [ ] **Step 2: Update `WorkspaceGrid.tsx` — remove visibility filter**

Remove the `VISIBILITY_KEY` constant and the visibility filter. Replace the `visible` computation and the `onClose` handler.

**Remove** this constant entirely:
```typescript
const VISIBILITY_KEY: Record<WidgetType, keyof ReturnType<typeof useAppStore.getState>> = {
  heatmap:   'showHeatmap',
  feed:      'showFeed',
  calendar:  'showCalendar',
  funnel:    'showFunnel',
  focus:     'showFocus',
  reminders: 'showReminders',
}
```

**Remove** these two lines from the component body:
```typescript
const setWidgetVis = useAppStore(s => s.setWidgetVisibility)
const store        = useAppStore()
```

**Replace** the `visible` computation (was a filtered array using Zustand flags):
```typescript
// Before:
const visible = (ws?.layout ?? []).filter(it => {
  const key = VISIBILITY_KEY[it.type]
  return key ? (store[key] as boolean) : true
})

// After:
const visible = ws?.layout ?? []
```

**Replace** the `onClose` call in the `visible.map(...)` block:
```typescript
// Before:
onClose={() => setWidgetVis(
  VISIBILITY_KEY[it.type] as keyof ReturnType<typeof useAppStore.getState>,
  false,
)}

// After:
onClose={() => {
  if (ws) updateLayout(ws.id, ws.layout.filter(l => l.id !== it.id))
}}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors relating to `showHeatmap`, `setWidgetVisibility`, or `VISIBILITY_KEY`.

- [ ] **Step 4: Commit**

```bash
git add app/src/store/app.ts app/src/components/layout/WorkspaceGrid.tsx
git commit -m "refactor: layout-as-truth — remove Zustand widget visibility flags"
```

---

## Task 3: POST /api/workspaces

**Files:**
- Modify: `app/src/app/api/workspaces/route.ts`
- Create: `app/src/app/api/workspaces/route.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// app/src/app/api/workspaces/route.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockReturning = vi.fn()
const mockValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockValues }))

vi.mock('@/lib/db/client', () => ({ db: { insert: mockInsert } }))
vi.mock('@/lib/db/schema', () => ({ workspaces: {} }))

beforeEach(() => vi.clearAllMocks())

describe('POST /api/workspaces', () => {
  test('creates workspace with empty layout and returns 201', async () => {
    mockReturning.mockResolvedValue([{ id: 'abc', name: 'my-ws', layout: [] }])
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'my-ws' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('my-ws')
    expect(data.layout).toEqual([])
    expect(mockValues).toHaveBeenCalledWith({ name: 'my-ws', layout: [] })
  })

  test('returns 400 when name is missing', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('returns 400 when name is blank whitespace', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd app && npx vitest run src/app/api/workspaces/route.test.ts
```
Expected: FAIL — `POST is not a function` (export doesn't exist yet)

- [ ] **Step 3: Add POST handler to `app/src/app/api/workspaces/route.ts`**

Add this after the existing `GET` export:

```typescript
import { NextRequest, NextResponse } from 'next/server'
// (NextRequest already imported if you updated the import line)

export async function POST(request: NextRequest) {
  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  const [ws] = await db
    .insert(workspaces)
    .values({ name: name.trim(), layout: [] })
    .returning()
  return NextResponse.json(ws, { status: 201 })
}
```

Also update the existing import line to include `NextRequest`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd app && npx vitest run src/app/api/workspaces/route.test.ts
```
Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add app/src/app/api/workspaces/route.ts app/src/app/api/workspaces/route.test.ts
git commit -m "feat: POST /api/workspaces — create workspace with empty layout"
```

---

## Task 4: Hook updates — createWorkspace, addWidget, expose mutate

**Files:**
- Modify: `app/src/hooks/useWorkspaces.ts`
- Modify: `app/src/hooks/useActivity.ts`
- Modify: `app/src/hooks/useCalendarEvents.ts`

- [ ] **Step 1: Add DEFAULT_SIZES, `createWorkspace`, and `addWidget` to `useWorkspaces.ts`**

Add the constant and two new functions. The full updated file:

```typescript
import useSWR from 'swr'
import type { Workspace, LayoutItem, WidgetType } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  heatmap:   { w: 8, h: 7 },
  feed:      { w: 5, h: 9 },
  calendar:  { w: 7, h: 9 },
  funnel:    { w: 7, h: 7 },
  focus:     { w: 4, h: 7 },
  reminders: { w: 5, h: 7 },
}

export function useWorkspaces() {
  const { data, isLoading, mutate } = useSWR<{ workspaces: Workspace[] }>('/api/workspaces', fetcher)

  const updateLayout = async (id: string, layout: LayoutItem[]) => {
    await mutate(
      { workspaces: (data?.workspaces ?? []).map(ws => ws.id === id ? { ...ws, layout } : ws) },
      false,
    )
    await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout }),
    })
    mutate()
  }

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const ws: Workspace = await res.json()
    await mutate()
    return ws
  }

  const addWidget = async (wsId: string, currentLayout: LayoutItem[], type: WidgetType) => {
    const bottom = currentLayout.reduce((max, it) => Math.max(max, it.y + it.h), 0)
    const { w, h } = DEFAULT_SIZES[type]
    const newItem: LayoutItem = { id: crypto.randomUUID(), type, x: 0, y: bottom, w, h }
    await updateLayout(wsId, [...currentLayout, newItem])
  }

  return {
    workspaces: data?.workspaces ?? [],
    isLoading,
    updateLayout,
    createWorkspace,
    addWidget,
    mutate,
  }
}
```

- [ ] **Step 2: Expose `mutate` in `useActivity.ts`**

```typescript
// app/src/hooks/useActivity.ts
import useSWR from 'swr'
import type { ActivityDay } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useActivity(days: number = 365) {
  const { data, isLoading, mutate } = useSWR<{ activity: ActivityDay[] }>(`/api/activity?days=${days}`, fetcher)
  return { activity: data?.activity ?? [], isLoading, mutate }
}
```

- [ ] **Step 3: Expose `mutate` in `useCalendarEvents.ts`**

Add `mutate` to the return object. Read the current file and add `mutate` to the destructuring from `useSWR` if it isn't already there (the hook already has `mutate` internally — just expose it):

```typescript
// In the return statement at the bottom of useCalendarEvents:
return { events: data?.events ?? [], isLoading, linkNote, createAndLinkNote, mutate }
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add app/src/hooks/useWorkspaces.ts app/src/hooks/useActivity.ts app/src/hooks/useCalendarEvents.ts
git commit -m "feat: useWorkspaces — createWorkspace + addWidget; expose mutate in useActivity + useCalendarEvents"
```

---

## Task 5: NewWorkspaceModal

**Files:**
- Create: `app/src/components/ui/NewWorkspaceModal.tsx`

- [ ] **Step 1: Create the modal component**

```typescript
// app/src/components/ui/NewWorkspaceModal.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'

interface Props { onClose: () => void }

export default function NewWorkspaceModal({ onClose }: Props) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { createWorkspace } = useWorkspaces()
  const setActiveWorkspace = useAppStore(s => s.setActiveWorkspace)
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSubmit = async () => {
    if (!name.trim() || loading) return
    setLoading(true)
    await createWorkspace(name.trim())
    setActiveWorkspace(name.trim())
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="New workspace">
        <div className="settings-header">
          <h2>New workspace</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>
        <div className="settings-body">
          <div className="settings-section">
            <div className="settings-section-label">Name</div>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="e.g. writing, research, shipping…"
              style={{
                width: '100%', height: 32, padding: '0 10px',
                background: 'var(--panel-hi)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || loading}
            style={{
              height: 32, padding: '0 16px',
              background: name.trim() ? 'var(--accent)' : 'var(--panel-hi)',
              color: name.trim() ? 'var(--bg)' : 'var(--text-4)',
              border: 'none', borderRadius: 4,
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
              cursor: name.trim() ? 'default' : 'not-allowed',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Creating…' : 'Create workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/src/components/ui/NewWorkspaceModal.tsx
git commit -m "feat: NewWorkspaceModal — name input, create + switch on submit"
```

---

## Task 6: Sidebar — wire + button

**Files:**
- Modify: `app/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Update Sidebar to open NewWorkspaceModal**

Full updated file:

```typescript
// app/src/components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import NewWorkspaceModal from '@/components/ui/NewWorkspaceModal'

export default function Sidebar() {
  const activeWs        = useAppStore(s => s.activeWorkspace)
  const setActiveWs     = useAppStore(s => s.setActiveWorkspace)
  const settingsOpen    = useAppStore(s => s.settingsOpen)
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen)
  const { workspaces }  = useWorkspaces()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="sidebar">
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
      <div className="sb-add" title="New workspace" onClick={() => setModalOpen(true)}>+</div>

      <div className="sb-foot">
        <div className="sb-divider" />
        <button
          className={`sb-settings${settingsOpen ? ' active' : ''}`}
          title="Settings"
          onClick={() => setSettingsOpen(!settingsOpen)}>
          ⚙
        </button>
      </div>

      {modalOpen && <NewWorkspaceModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/src/components/layout/Sidebar.tsx
git commit -m "feat: sidebar + button opens NewWorkspaceModal"
```

---

## Task 7: Toolbar — widget picker panel

**Files:**
- Modify: `app/src/components/layout/Toolbar.tsx`

- [ ] **Step 1: Replace Toolbar with widget picker + remove dead buttons**

The dead `All sources` and `Today` buttons are removed (deferred to Phase 2). The `Layout` button becomes the widget picker trigger.

```typescript
// app/src/components/layout/Toolbar.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useItems } from '@/hooks/useItems'
import { relativeTime } from '@/lib/utils'
import Icon from '../ui/Icon'
import type { WidgetType } from '@/types'

const WIDGET_TYPES: { type: WidgetType; label: string; icon: string }[] = [
  { type: 'heatmap',   label: 'Heatmap',   icon: '▦' },
  { type: 'feed',      label: 'Feed',       icon: '≡' },
  { type: 'calendar',  label: 'Calendar',   icon: '▤' },
  { type: 'funnel',    label: 'Funnel',     icon: '⬓' },
  { type: 'focus',     label: 'Focus',      icon: '◎' },
  { type: 'reminders', label: 'Reminders',  icon: '☐' },
]

export default function Toolbar() {
  const activeWs = useAppStore(s => s.activeWorkspace)
  const { workspaces, addWidget } = useWorkspaces()
  const ws = workspaces.find(w => w.name === activeWs)

  const { items: rootNotes } = useItems({ kind: 'note', parentId: 'null' })
  const noteCount  = rootNotes.length
  const inboxCount = rootNotes.filter(n => !n.starred && n.tags.length === 0).length
  const latestNote = rootNotes[0]
  const lastStr    = latestNote ? relativeTime(new Date(latestNote.createdAt)) : '—'

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const onMouse = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPickerOpen(false) }
    document.addEventListener('mousedown', onMouse)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onMouse); window.removeEventListener('keydown', onKey) }
  }, [pickerOpen])

  // ⌘K shortcut — visual-only in this build
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') e.preventDefault()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="toolbar">
      <div style={{ position: 'relative' }} ref={pickerRef}>
        <button className="tb-btn" onClick={() => setPickerOpen(p => !p)}>
          <Icon name="grid" /><span className="tb-label"> Layout</span>
        </button>
        {pickerOpen && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4,
            background: 'var(--panel-2)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 0', minWidth: 160, zIndex: 200,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {WIDGET_TYPES.map(({ type, label, icon }) => (
              <button key={type}
                onClick={() => { if (ws) addWidget(ws.id, ws.layout, type); setPickerOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 12px',
                  background: 'transparent', border: 0,
                  color: 'var(--text)', fontFamily: 'var(--font-ui)',
                  fontSize: 'var(--fs-sm)', cursor: 'default', textAlign: 'left',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--panel-hi)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--accent)', width: 16 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="tb-divider" />
      <button className="tb-btn tb-btn-capture"><Icon name="plus" /><span className="tb-label"> Capture</span></button>
      <div className="tb-divider" />
      <span className="mono tb-status" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
        NOTES <span style={{ color: 'var(--text-2)' }}>{noteCount}</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        LAST <span style={{ color: 'var(--text-2)' }}>{lastStr}</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        INBOX <span style={{ color: inboxCount > 0 ? 'var(--accent)' : 'var(--text-2)' }}>{inboxCount || '—'}</span>
      </span>
      <div className="tb-spacer" />
      <div className="tb-search">
        <Icon name="search" />
        <span>Search across all sources…</span>
        <span className="kbd">⌘K</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/src/components/layout/Toolbar.tsx
git commit -m "feat: toolbar widget picker + live status strip (NOTES / LAST / INBOX)"
```

---

## Task 8: SettingsModal — Display section

**Files:**
- Modify: `app/src/components/SettingsModal.tsx`

- [ ] **Step 1: Add Display section with Grid + Scanlines toggles**

Add these imports at the top (they're already in the store — just need to read them):

After the existing `setFontSize` lines, add:
```typescript
const showGrid   = useAppStore(s => s.showGrid)
const scanlines  = useAppStore(s => s.scanlines)
const setShowGrid  = useAppStore(s => s.setShowGrid)
const setScanlines = useAppStore(s => s.setScanlines)
```

Add a new section in `settings-body`, after the Font Size section:

```tsx
{/* Display */}
<div className="settings-section">
  <div className="settings-section-label">Display</div>
  <div className="seg">
    <button
      className={`seg-btn${showGrid ? ' active' : ''}`}
      onClick={() => setShowGrid(!showGrid)}>
      Grid overlay
    </button>
    <button
      className={`seg-btn${scanlines ? ' active' : ''}`}
      onClick={() => setScanlines(!scanlines)}>
      Scanlines
    </button>
  </div>
  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)', marginTop: -4 }}>
    {showGrid && !scanlines && 'Grid lines visible on workspace background.'}
    {scanlines && 'CRT scanline overlay on top of all content.'}
    {!showGrid && !scanlines && 'Clean workspace — no overlays.'}
    {showGrid && scanlines && 'Grid and scanlines both active.'}
  </div>
</div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/src/components/SettingsModal.tsx
git commit -m "feat: settings Display section — grid overlay and scanlines toggles"
```

---

## Task 9: WidgetShell — refresh button

**Files:**
- Modify: `app/src/components/widgets/WidgetShell.tsx`

- [ ] **Step 1: Add `onRefresh` prop and wire the ↻ button**

Add `onRefresh?: () => void` to the Props interface:

```typescript
interface Props {
  id: string
  title: string
  meta?: string
  tabs?: string[]
  tab?: string
  onTab?: (tab: string) => void
  actions?: React.ReactNode
  dragHandlers?: DragHandlers
  onClose?: () => void
  onRefresh?: () => void   // ← add this
  children: React.ReactNode
  noPad?: boolean
}
```

Update the destructuring to include `onRefresh`:
```typescript
export default function WidgetShell({ id, title, meta, tabs, tab, onTab, actions, dragHandlers, onClose, onRefresh, children, noPad }: Props) {
```

Update the ↻ button to call it:
```tsx
<button className="w-act" title="Refresh" onClick={e => { e.stopPropagation(); onRefresh?.() }}>↻</button>
```

- [ ] **Step 2: Wire `onRefresh` in all 6 widgets**

**HeatmapWidget** — uses three `useActivity` calls. Add a combined refresh handler:

In `HeatmapWidget.tsx`, destructure `mutate` from each `useActivity` call:
```typescript
const { activity: days365, mutate: mutate365 } = useActivity(365)
const { activity: days90,  mutate: mutate90  } = useActivity(90)
const { activity: days30,  mutate: mutate30  } = useActivity(30)
```
Then pass to WidgetShell:
```tsx
<WidgetShell ... onRefresh={() => { mutate365(); mutate90(); mutate30() }}>
```

**FeedWidget** — add `mutate` to destructuring:
```typescript
const { items, updateItem, deleteItem, mutate } = useItems({ parentId: 'null' })
```
Pass: `<WidgetShell ... onRefresh={mutate}>`

**CalendarWidget** — add `mutate` to destructuring:
```typescript
const { events, createAndLinkNote, linkNote, mutate } = useCalendarEvents(weekStartStr)
```
Pass: `<WidgetShell ... onRefresh={mutate}>`

**FunnelWidget** — add `mutate`:
```typescript
const { items, updateItem, deleteItem, mutate } = useItems({ kind: 'funnel_item' })
```
Pass: `<WidgetShell ... onRefresh={mutate}>`

**FocusWidget** — add `mutate`:
```typescript
const { items: sessions, createItem, mutate } = useItems({ kind: 'focus_session' })
```
Pass: `<WidgetShell ... onRefresh={mutate}>`

**RemindersWidget** — add `mutate`:
```typescript
const { items, updateItem, createItem, deleteItem, mutate } = useItems({ kind: 'reminder' })
```
Pass: `<WidgetShell ... onRefresh={mutate}>`

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/src/components/widgets/WidgetShell.tsx \
        app/src/components/widgets/HeatmapWidget.tsx \
        app/src/components/widgets/FeedWidget.tsx \
        app/src/components/widgets/CalendarWidget.tsx \
        app/src/components/widgets/FunnelWidget.tsx \
        app/src/components/widgets/FocusWidget.tsx \
        app/src/components/widgets/RemindersWidget.tsx
git commit -m "feat: widget refresh buttons — WidgetShell onRefresh prop wired to SWR mutate"
```

---

## Task 10: Calendar — week navigation + note capture

**Files:**
- Modify: `app/src/components/widgets/CalendarWidget.tsx`

- [ ] **Step 1: Add weekOffset state and wire ‹ › buttons**

Add to imports:
```typescript
import { weekStartFor } from '@/lib/utils'
import { useItems } from '@/hooks/useItems'
```

Add state at the top of the component (after the existing declarations):
```typescript
const [weekOffset, setWeekOffset] = useState(0)
const [noteInput, setNoteInput] = useState('')
```

Replace the hardcoded `weekStartStr` computation:
```typescript
// Remove these lines:
const now = new Date()
const dow = (now.getDay() + 6) % 7
const weekStart = new Date(now)
weekStart.setDate(now.getDate() - dow)
weekStart.setHours(0, 0, 0, 0)
const weekStartStr = weekStart.toISOString().split('T')[0]

// Replace with:
const weekStartStr = weekStartFor(weekOffset)
const now = new Date()
const weekStart = new Date(weekStartStr + 'T00:00:00')
```

Add `useItems` for note creation (add near the top of the component where other hooks are):
```typescript
const { createItem } = useItems({ kind: 'note', parentId: 'null' })
```

Update the ‹ › buttons in WidgetShell `actions`:
```tsx
actions={
  <>
    <button className="w-act" onClick={e => { e.stopPropagation(); setWeekOffset(o => o - 1) }}>‹</button>
    <button className="w-act" onClick={e => { e.stopPropagation(); setWeekOffset(o => o + 1) }}>›</button>
  </>
}
```

- [ ] **Step 2: Wire the inline note capture input**

Replace the existing static input in the capture row:
```tsx
<input
  placeholder="Quick note…"
  value={noteInput}
  onChange={e => setNoteInput(e.target.value)}
  onKeyDown={async e => {
    if (e.key === 'Enter' && noteInput.trim()) {
      await createItem({ kind: 'note', body: noteInput.trim() })
      setNoteInput('')
    }
  }}
  style={{ flex: 1, height: 20, background: 'transparent', border: 0, outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/src/components/widgets/CalendarWidget.tsx
git commit -m "feat: calendar week navigation (weekOffset state) + inline note capture"
```

---

## Task 11: Focus widget — live session history

**Files:**
- Modify: `app/src/components/widgets/FocusWidget.tsx`

- [ ] **Step 1: Replace hardcoded prevSessions with live data**

The `useItems({ kind: 'focus_session' })` hook is already in the component. Replace the hardcoded `prevSessions` array:

**Remove** this:
```typescript
const prevSessions = [
  { label: 'Eval harness', minutes: 92 },
  { label: 'Reading',      minutes: 34 },
]
```

**Add** this after the `sessions` hook line:
```typescript
const today = new Date().toDateString()
const completedToday = sessions
  .filter(s => s.focus && new Date(s.focus.startedAt).toDateString() === today)
  .map(s => ({ label: s.body, minutes: s.focus!.durationMinutes ?? 0 }))
```

**Replace** the `prevSessions` reference in the `map`:
```tsx
{[...completedToday, { label: 'Agents prototype (live)', minutes: Math.floor(seconds / 60), live: true }].map((s, i) => (
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd app && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/src/components/widgets/FocusWidget.tsx
git commit -m "feat: focus widget session history — replace hardcoded rows with live DB data"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| Core model — layout as truth | Task 2 |
| New workspace creation | Tasks 3, 4, 5, 6 |
| Layout button — widget picker | Tasks 4, 7 |
| Calendar week navigation | Task 10 |
| Calendar inline note capture | Task 10 |
| Focus session history | Task 11 |
| Widget refresh buttons | Tasks 4, 9 |
| Grid/scanlines in Settings | Task 8 |
| Toolbar status strip | Task 7 |

**Placeholder scan:** No TBDs or incomplete steps. All code blocks contain real implementations.

**Type consistency:**
- `addWidget(wsId: string, currentLayout: LayoutItem[], type: WidgetType)` — used identically in Task 4 (definition) and Task 7 (call site).
- `onRefresh?: () => void` — defined in Task 9 WidgetShell, consumed in Task 9 all widgets.
- `weekStartFor(offset, now?)` — defined in Task 1, used in Task 10.
- `relativeTime(date)` — defined in Task 1, used in Task 7.
- `mutate` on `useCalendarEvents` — exposed in Task 4, used in Task 9 widget wiring.
- `mutate` on `useActivity` — exposed in Task 4, used in Task 9 widget wiring.
