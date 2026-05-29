# Phase B — Heatmap v2 (Configurable Instances) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each Heatmap widget instance independently configurable — tracking all activity, a specific tag, a specific note, or a habit with a weekly goal cadence.

**Architecture:** Widget config is stored in `LayoutItem.config` (already typed as `Record<string, unknown>`). The HeatmapWidget reads its config from the workspace layout via the workspace store. A new `HeatmapConfig` type governs the shape. A new API route `/api/activity/tag` handles tag-filtered activity queries directly against `items` (no schema change needed). The widget gains a gear icon that opens an inline config panel.

**Tech Stack:** Next.js App Router, Drizzle ORM (postgres-js), SWR, Zustand, React, TypeScript

---

## File Map

| File | Action | What changes |
|---|---|---|
| `app/src/types/index.ts` | Modify | Add `HeatmapConfig` type |
| `app/src/app/api/activity/tag/route.ts` | Create | Tag-filtered activity — queries items by tag, groups by date |
| `app/src/hooks/useActivity.ts` | Modify | Accept `HeatmapConfig` and dispatch to correct endpoint |
| `app/src/hooks/useWorkspaces.ts` | Modify | Add `updateWidgetConfig` + accept config in `addWidget` |
| `app/src/components/layout/WorkspaceGrid.tsx` | Modify | Pass `config` prop to each rendered widget |
| `app/src/components/widgets/HeatmapWidget.tsx` | Modify | Full v2 — reads config, shows gear, handles all 4 modes |
| `app/src/components/widgets/FeedWidget.tsx` | Modify | Tag chip right-click → "Track tag in heatmap" |

---

## Task 1 — `HeatmapConfig` type + tag-activity API route

**Files:**
- Modify: `app/src/types/index.ts`
- Create: `app/src/app/api/activity/tag/route.ts`

- [ ] **Step 1: Add `HeatmapConfig` to types**

In `app/src/types/index.ts`, add after the `HeatmapScale` type:

```typescript
export interface HeatmapConfig {
  mode: 'all' | 'tag' | 'note' | 'habit'
  tag?: string
  noteId?: string
  goalPerWeek?: number
}
```

- [ ] **Step 2: Create the tag-activity API route**

Create file `app/src/app/api/activity/tag/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { items } from '@/lib/db/schema'
import { and, gte, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const sp   = request.nextUrl.searchParams
  const tag  = sp.get('tag')
  const days = Math.min(parseInt(sp.get('days') ?? '90'), 365)

  if (!tag) return NextResponse.json({ error: 'tag required' }, { status: 400 })

  const since = new Date()
  since.setDate(since.getDate() - days)

  const rows = await db
    .select({
      date:  sql<string>`DATE(${items.createdAt} AT TIME ZONE 'UTC')`.as('date'),
      count: sql<number>`COUNT(*)::int`.as('count'),
    })
    .from(items)
    .where(and(
      sql`${tag} = ANY(${items.tags})`,
      gte(items.createdAt, since),
    ))
    .groupBy(sql`DATE(${items.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${items.createdAt} AT TIME ZONE 'UTC') DESC`)

  return NextResponse.json({ activity: rows })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/types/index.ts app/src/app/api/activity/tag/route.ts
git commit -m "feat: HeatmapConfig type + tag-filtered activity API route"
```

---

## Task 2 — `useActivity` hook: support tag mode

**Files:**
- Modify: `app/src/hooks/useActivity.ts`

- [ ] **Step 1: Replace the full hook**

```typescript
import useSWR from 'swr'
import { useMemo } from 'react'
import type { ActivityDay, HeatmapConfig } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function padToDays(data: { date: string; count: number }[] | undefined, days: number): ActivityDay[] {
  const map = new Map((data ?? []).map(d => [d.date, d.count]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: ActivityDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, count: map.get(dateStr) ?? 0, sourceBreakdown: {} })
  }
  return result
}

export function useActivity(days: number = 365, config?: HeatmapConfig) {
  const mode = config?.mode ?? 'all'

  // tag mode hits /api/activity/tag
  const tagKey = mode === 'tag' && config?.tag
    ? `/api/activity/tag?tag=${encodeURIComponent(config.tag)}&days=${days}`
    : null

  // all-activity mode hits the existing /api/activity
  const allKey = mode === 'all' || mode === 'habit'
    ? `/api/activity?days=${days}`
    : null

  const { data: allData,  mutate: mutateAll } = useSWR<{ activity: ActivityDay[] }>(allKey,  fetcher)
  const { data: tagData,  mutate: mutateTag } = useSWR<{ activity: { date: string; count: number }[] }>(tagKey, fetcher)

  const activity = useMemo<ActivityDay[]>(() => {
    if (mode === 'tag') return padToDays(tagData?.activity, days)
    // all / habit: use full ActivityDay shape from existing endpoint
    const map = new Map((allData?.activity ?? []).map(d => [d.date, d]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: ActivityDay[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      result.push(map.get(dateStr) ?? { date: dateStr, count: 0, sourceBreakdown: {} })
    }
    return result
  }, [allData?.activity, tagData?.activity, days, mode])

  const mutate = () => { mutateAll?.(); mutateTag?.() }

  return { activity, mutate }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/hooks/useActivity.ts
git commit -m "feat: useActivity accepts HeatmapConfig — routes tag mode to new endpoint"
```

---

## Task 3 — `useWorkspaces`: `updateWidgetConfig` + config-aware `addWidget`

**Files:**
- Modify: `app/src/hooks/useWorkspaces.ts`

- [ ] **Step 1: Add `updateWidgetConfig` function and update `addWidget` signature**

Add this function inside `useWorkspaces`, after `addWidget`:

```typescript
const updateWidgetConfig = async (wsId: string, widgetId: string, config: Record<string, unknown>) => {
  const ws = data?.workspaces.find(w => w.id === wsId)
  if (!ws) return
  const layout = ws.layout.map(item =>
    item.id === widgetId ? { ...item, config } : item
  )
  await updateLayout(wsId, layout)
}
```

Update `addWidget` to accept an optional `config` param:

```typescript
const addWidget = async (wsId: string, currentLayout: LayoutItem[], type: WidgetType, config?: Record<string, unknown>) => {
  const bottom = currentLayout.reduce((max, it) => Math.max(max, it.y + it.h), 0)
  const { w, h } = DEFAULT_SIZES[type]
  const newItem: LayoutItem = { id: crypto.randomUUID(), type, x: 0, y: bottom, w, h, ...(config ? { config } : {}) }
  await updateLayout(wsId, [...currentLayout, newItem])
}
```

Add `updateWidgetConfig` to the return object:
```typescript
return {
  workspaces: data?.workspaces ?? [],
  isLoading,
  updateLayout,
  createWorkspace,
  addWidget,
  updateWidgetConfig,
  mutate,
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/hooks/useWorkspaces.ts
git commit -m "feat: updateWidgetConfig + config param on addWidget"
```

---

## Task 4 — WorkspaceGrid: pass `config` prop to widgets

**Files:**
- Modify: `app/src/components/layout/WorkspaceGrid.tsx`

- [ ] **Step 1: Update WIDGET_MAP type to accept config**

Find the `WIDGET_MAP` definition:

```typescript
const WIDGET_MAP: Record<WidgetType, React.ComponentType<{ id: string; dragHandlers: DragHandlers; onClose: () => void }>> = {
```

Change to:

```typescript
const WIDGET_MAP: Record<WidgetType, React.ComponentType<{ id: string; dragHandlers: DragHandlers; onClose: () => void; config?: Record<string, unknown> }>> = {
```

- [ ] **Step 2: Pass config when rendering each widget**

Find where widgets are rendered from `WIDGET_MAP`. It will look something like:

```tsx
const Widget = WIDGET_MAP[item.type]
// ...
<Widget id={item.id} dragHandlers={...} onClose={...} />
```

Add the `config` prop:

```tsx
<Widget id={item.id} dragHandlers={dragHandlers} onClose={onClose} config={item.config} />
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/layout/WorkspaceGrid.tsx
git commit -m "feat: WorkspaceGrid passes config prop to widgets"
```

---

## Task 5 — HeatmapWidget v2

**Files:**
- Modify: `app/src/components/widgets/HeatmapWidget.tsx`

- [ ] **Step 1: Replace the full HeatmapWidget**

```typescript
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import WidgetShell from './WidgetShell'
import Kpi from '../ui/Kpi'
import { useActivity } from '@/hooks/useActivity'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useAppStore } from '@/store/app'
import type { DragHandlers, ActivityDay, HeatmapConfig } from '@/types'

interface Props {
  id: string
  dragHandlers: DragHandlers
  onClose: () => void
  config?: Record<string, unknown>
}

const SRC_BREAKDOWN = [
  { src: 'tw', label: 'Twitter' }, { src: 'ob', label: 'Obsidian' },
  { src: 'dc', label: 'Discord' }, { src: 'mn', label: 'Notes' }, { src: 'rd', label: 'Reddit' },
]
const SRC_LABEL: Record<string, string> = { tw: 'TW', ob: 'OB', dc: 'DC', mn: 'MN', rd: 'RD' }

function parseConfig(raw?: Record<string, unknown>): HeatmapConfig {
  if (!raw) return { mode: 'all' }
  return raw as HeatmapConfig
}

export default function HeatmapWidget({ id, dragHandlers, onClose, config: rawConfig }: Props) {
  const heatmapScale   = useAppStore(s => s.heatmapScale)
  const activeWs       = useAppStore(s => s.activeWorkspace)
  const { workspaces, updateWidgetConfig } = useWorkspaces()
  const ws = workspaces.find(w => w.name === activeWs)

  const hmConfig = parseConfig(rawConfig)
  const [view, setView]         = useState('365d')
  const [configOpen, setConfigOpen] = useState(false)
  const configRef = useRef<HTMLDivElement>(null)

  // Local editable config state (only committed on Apply)
  const [draftMode,    setDraftMode]    = useState<HeatmapConfig['mode']>(hmConfig.mode)
  const [draftTag,     setDraftTag]     = useState(hmConfig.tag ?? '')
  const [draftGoal,    setDraftGoal]    = useState(hmConfig.goalPerWeek ?? 3)

  // Sync draft state when config prop changes
  useEffect(() => {
    setDraftMode(hmConfig.mode)
    setDraftTag(hmConfig.tag ?? '')
    setDraftGoal(hmConfig.goalPerWeek ?? 3)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawConfig])

  // Close config panel on outside click
  useEffect(() => {
    if (!configOpen) return
    const handler = (e: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(e.target as Node)) setConfigOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [configOpen])

  const days = view === '90d' ? 90 : view === '30d' ? 30 : 365
  const { activity: allDays, mutate } = useActivity(days, hmConfig)

  const [hover, setHover] = useState<ActivityDay | null>(null)

  const weeks = useMemo(() => {
    const w: (ActivityDay | null)[][] = []
    let cur: (ActivityDay | null)[] = []
    allDays.forEach((d, i) => {
      const dow = new Date(d.date + 'T00:00:00').getDay()
      if (i === 0) for (let p = 0; p < dow; p++) cur.push(null)
      cur.push(d)
      if (cur.length === 7) { w.push(cur); cur = [] }
    })
    if (cur.length) { while (cur.length < 7) cur.push(null); w.push(cur) }
    return w
  }, [allDays])

  const total  = allDays.reduce((a, d) => a + d.count, 0)
  const maxVal = Math.max(...allDays.map(d => d.count), 1)
  const streak = useMemo(() => {
    let s = 0
    for (let i = allDays.length - 1; i >= 0; i--) {
      if (allDays[i].count > 0) s++; else break
    }
    return s
  }, [allDays])

  const srcTotals = useMemo(() => {
    const acc: Record<string, number> = {}
    allDays.forEach(d => Object.entries(d.sourceBreakdown ?? {}).forEach(([k, v]) => { acc[k] = (acc[k] ?? 0) + v }))
    return acc
  }, [allDays])

  const scaleColor = (count: number) => {
    if (count === 0) return 'var(--panel-hi)'
    // habit mode: binary — hit (accent) or dim
    if (hmConfig.mode === 'habit') {
      return count > 0 ? 'var(--accent)' : 'var(--panel-hi)'
    }
    const t = Math.min(1, count / maxVal)
    const stop = Math.ceil(t * 4)
    if (heatmapScale === 'mono') {
      const l = [0.30, 0.45, 0.60, 0.75, 0.92][stop]
      return `oklch(${l} 0.005 240)`
    }
    if (heatmapScale === 'thermal') {
      const hues = [null, 250, 200, 80, 30]
      const ls   = [null, 0.55, 0.65, 0.78, 0.72]
      return `oklch(${ls[stop]} 0.13 ${hues[stop]})`
    }
    const ls = [0.30, 0.42, 0.55, 0.68, 0.80]
    const cs = [0.02, 0.04, 0.06, 0.08, 0.10]
    return `oklch(${ls[stop]} ${cs[stop]} 220)`
  }

  const applyConfig = async () => {
    if (!ws) return
    const newConfig: HeatmapConfig = { mode: draftMode }
    if (draftMode === 'tag' && draftTag.trim())   newConfig.tag = draftTag.trim()
    if (draftMode === 'habit') newConfig.goalPerWeek = draftGoal
    await updateWidgetConfig(ws.id, id, newConfig as Record<string, unknown>)
    setConfigOpen(false)
  }

  const modeLabel = () => {
    if (hmConfig.mode === 'tag')   return `#${hmConfig.tag}`
    if (hmConfig.mode === 'habit') return `habit ${hmConfig.goalPerWeek ?? 3}×/wk`
    if (hmConfig.mode === 'note')  return 'note'
    return 'all sources'
  }

  return (
    <WidgetShell id={id} title="Activity" meta={`${view} · ${modeLabel()}`}
      tabs={['365d', '90d', '30d']} tab={view} onTab={setView}
      dragHandlers={dragHandlers} onClose={onClose}
      onRefresh={mutate}
      extraHeaderActions={
        <div ref={configRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setConfigOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 12, padding: '0 4px', lineHeight: 1 }}
            title="Configure heatmap"
          >
            ⚙
          </button>
          {configOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 300,
              background: 'var(--panel-2)', border: '1px solid var(--border)',
              borderRadius: 6, padding: 12, width: 220,
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.07em' }}>TRACKING MODE</div>
              {(['all', 'tag', 'habit'] as const).map(m => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontFamily: 'var(--font-ui)' }}>
                  <input type="radio" checked={draftMode === m} onChange={() => setDraftMode(m)} style={{ accentColor: 'var(--accent)' }} />
                  {m === 'all'   ? 'All activity'   : ''}
                  {m === 'tag'   ? 'Tag filter'     : ''}
                  {m === 'habit' ? 'Habit tracker'  : ''}
                </label>
              ))}
              {draftMode === 'tag' && (
                <input
                  value={draftTag}
                  onChange={e => setDraftTag(e.target.value)}
                  placeholder="tag name (e.g. gym)"
                  style={{
                    height: 28, padding: '0 8px',
                    background: 'var(--panel-hi)', border: '1px solid var(--border)',
                    borderRadius: 4, color: 'var(--text)',
                    fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-xs)', outline: 'none',
                  }}
                />
              )}
              {draftMode === 'habit' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>Goal:</span>
                  <input
                    type="number" min={1} max={7}
                    value={draftGoal}
                    onChange={e => setDraftGoal(Number(e.target.value))}
                    style={{
                      width: 40, height: 28, padding: '0 6px',
                      background: 'var(--panel-hi)', border: '1px solid var(--border)',
                      borderRadius: 4, color: 'var(--text)',
                      fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', outline: 'none',
                    }}
                  />
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>×/week</span>
                </div>
              )}
              <button
                onClick={applyConfig}
                style={{
                  height: 28, background: 'var(--accent)', color: 'var(--bg)',
                  border: 'none', borderRadius: 4, cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-xs)',
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* KPI row */}
        <div className="hm-kpi-row row gap-12" style={{ flexShrink: 0 }}>
          <Kpi label="TOTAL"     value={total.toLocaleString()} />
          <Kpi label="STREAK"    value={`${streak}d`} accent />
          <Kpi label="DAILY AVG" value={(total / Math.max(allDays.length, 1)).toFixed(1)} />
          <Kpi label="PEAK DAY"  value={maxVal} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>less</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0, 1, 3, 6, 10].map(c => (
                <div key={c} style={{ width: 9, height: 9, background: scaleColor(c), borderRadius: 2 }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>more</span>
          </div>
        </div>

        {/* Tile-graph header */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: 14, paddingLeft: 22 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.07em' }}>DAILY</span>
          {hover && (
            <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
              {hover.count} entries · {new Date(hover.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Heatmap grid */}
        {(() => {
          const TILE_GAP = 3
          const TILE_PX  = view === '365d' ? 10 : 11
          const gridH    = 7 * TILE_PX + 6 * TILE_GAP
          const flatDays = weeks.flatMap(wk => wk)

          return (
            <div style={{ position: 'relative', flexShrink: 0, paddingLeft: 22, height: gridH }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: view === '365d'
                  ? `repeat(${weeks.length}, minmax(0, ${TILE_PX}px))`
                  : `repeat(${weeks.length}, ${TILE_PX}px)`,
                gridTemplateRows: `repeat(7, ${TILE_PX}px)`,
                gridAutoFlow: 'column',
                gap: TILE_GAP,
                width: '100%',
                height: '100%',
              }}>
                {flatDays.map((d, i) => (
                  <div key={i} style={{
                    width: '100%', height: '100%',
                    borderRadius: 2,
                    background: d ? scaleColor(d.count) : 'transparent',
                    outline: hover && d && hover.date === d.date ? '1px solid var(--text-2)' : 'none',
                    outlineOffset: 1,
                  }}
                    onMouseEnter={() => d && setHover(d)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </div>
              <div style={{
                position: 'absolute', left: 0, top: 0, height: gridH,
                display: 'grid', gridTemplateRows: `repeat(7, ${TILE_PX}px)`, gap: TILE_GAP,
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', width: 18,
              }}>
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>{l}</div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Source breakdown — only relevant for "all" mode */}
        {hmConfig.mode === 'all' && (
          <div className="hm-sources" style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
              {SRC_BREAKDOWN.map(s => (
                <div key={s.src} className="row gap-6">
                  <span className={`src-icon src-${s.src}`}>{SRC_LABEL[s.src]}</span>
                  <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
                    {(srcTotals[s.src] ?? 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habit mode: weekly progress */}
        {hmConfig.mode === 'habit' && (
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            {(() => {
              const goal = hmConfig.goalPerWeek ?? 3
              // Count days with activity in the current week (Mon–Sun)
              const today = new Date()
              const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() - dayOfWeek)
              weekStart.setHours(0, 0, 0, 0)
              const thisWeekCount = allDays.filter(d => {
                const date = new Date(d.date + 'T00:00:00')
                return date >= weekStart && d.count > 0
              }).length
              const pct = Math.min(1, thisWeekCount / goal)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>THIS WEEK</span>
                    <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: thisWeekCount >= goal ? 'var(--accent)' : 'var(--text-2)' }}>
                      {thisWeekCount}/{goal}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--panel-hi)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: thisWeekCount >= goal ? 'var(--accent)' : 'var(--text-3)', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/widgets/HeatmapWidget.tsx
git commit -m "feat: HeatmapWidget v2 — configurable modes (all/tag/habit), gear config panel"
```

---

## Task 6 — WidgetShell: accept `extraHeaderActions` prop

The `⚙` gear button in HeatmapWidget is passed via an `extraHeaderActions` prop. WidgetShell needs to render it.

**Files:**
- Modify: `app/src/components/widgets/WidgetShell.tsx`

- [ ] **Step 1: Read the current WidgetShell props**

Open `app/src/components/widgets/WidgetShell.tsx` and find the `Props` interface.

- [ ] **Step 2: Add `extraHeaderActions` to the Props interface**

```typescript
extraHeaderActions?: React.ReactNode
```

- [ ] **Step 3: Render it in the header**

Find the header section (where the title, meta, and ↻ refresh button are rendered). Add `{extraHeaderActions}` immediately before or after the refresh button — after is cleaner:

```tsx
{onRefresh && <button className="widget-refresh" onClick={onRefresh}>↻</button>}
{extraHeaderActions}
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/widgets/WidgetShell.tsx
git commit -m "feat: WidgetShell accepts extraHeaderActions prop"
```

---

## Task 7 — Feed: right-click tag chip → "Track in heatmap"

**Files:**
- Modify: `app/src/components/widgets/FeedWidget.tsx`

- [ ] **Step 1: Add `useWorkspaces` import to FeedWidget**

At the top of `FeedWidget.tsx`, add:
```typescript
import { useWorkspaces } from '@/hooks/useWorkspaces'
```

- [ ] **Step 2: Add workspace hooks inside the component**

In `FeedWidget`, add:
```typescript
const activeWs = useAppStore(s => s.activeWorkspace)
const { workspaces, addWidget } = useWorkspaces()
const ws = workspaces.find(w => w.name === activeWs)
```

- [ ] **Step 3: Add tag context menu in `NoteRow`**

`NoteRow` is a sub-component. Pass `onTagContextMenu` as a prop:

Change the `NoteRow` props interface to:
```typescript
{ note: Item; first: boolean; active: boolean; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void; onTagContextMenu: (e: React.MouseEvent, tag: string) => void }
```

In the tag chip render inside `NoteRow`, add `onContextMenu`:
```tsx
{note.tags.map(t => (
  <span key={t} className="chip" onContextMenu={e => { e.stopPropagation(); onTagContextMenu(e, t) }}>
    {t}
  </span>
))}
```

- [ ] **Step 4: Pass handler from FeedWidget**

Define the handler in `FeedWidget`:
```typescript
const handleTagContextMenu = (e: React.MouseEvent, tag: string) => {
  openMenu(e, [
    {
      label: `Track #${tag} in heatmap`,
      action: () => {
        if (ws) addWidget(ws.id, ws.layout, 'heatmap', { mode: 'tag', tag })
      },
    },
  ])
}
```

Pass it to `NoteRow`:
```tsx
<NoteRow key={n.id} note={n} first={i === 0}
  active={openNoteId === n.id}
  onClick={() => setOpenNote(openNoteId === n.id ? null : n.id)}
  onContextMenu={e => handleContextMenu(e, n)}
  onTagContextMenu={handleTagContextMenu}
/>
```

- [ ] **Step 5: Commit**

```bash
git add app/src/components/widgets/FeedWidget.tsx
git commit -m "feat: right-click tag chip → track tag in heatmap"
```

---

## Verification

- [ ] Open the app. Add a Heatmap widget from the layout picker — it renders in default "all activity" mode.
- [ ] Click the ⚙ gear icon — config panel opens with mode radio buttons.
- [ ] Select "Tag filter", type a tag name (e.g. `gym`), click Apply — meta label updates to `· #gym`, tiles reflect only items tagged `gym`.
- [ ] Select "Habit tracker", set goal to 3, click Apply — meta label updates to `· habit 3×/wk`, tiles are binary (hit/empty), weekly progress bar appears at bottom.
- [ ] Add a second Heatmap widget — it opens with "all activity" independently of the first.
- [ ] Right-click a tag chip on a Feed row → context menu shows "Track #tagname in heatmap" → clicking adds a new Heatmap widget pre-configured for that tag.
- [ ] Config persists across page refresh (stored in workspace layout JSONB).
