# Phase 1 — Shell Wiring Design

**Date:** 2026-05-23  
**Scope:** Wire all remaining dead shell buttons; replace global visibility flags with layout-as-truth.

---

## 1. Core model change — layout as truth

**Problem:** Widget visibility is currently tracked via Zustand booleans (`showHeatmap`, `showFeed`, etc.). These are global — hiding a widget in one workspace hides it in all workspaces. This conflicts with the intended model where each workspace is an independent arrangement of widget instances.

**Solution:** Delete all Zustand visibility flags. A widget is visible if and only if it has an entry in `ws.layout`. WorkspaceGrid's `VISIBILITY_KEY` map and the filter that uses it are removed entirely.

Each `LayoutItem` has `{ id: string (UUID), type: WidgetType, x, y, w, h }`. Multiple instances of the same type in one workspace are supported — they simply have different UUIDs. This is the foundation for the future configurable-widget vision where the same widget type (e.g. Feed) can appear multiple times with different filters.

**Hide widget:** Calls `updateLayout` with that item filtered out of the layout array. No Zustand write.  
**Add widget:** Calls `updateLayout` with a new item appended.

**Affected files:**
- `store/app.ts` — remove 6 visibility fields + `setWidgetVisibility`
- `components/layout/WorkspaceGrid.tsx` — remove `VISIBILITY_KEY`, remove visibility filter, update `onClose` handler

---

## 2. New workspace creation

**UI:** Sidebar `+` button opens a modal (backdrop + centered card, same style as SettingsModal). Single text input for workspace name, Enter to submit, Escape to cancel.

**API:** New `POST /api/workspaces` route accepting `{ name: string }`, inserting a row with `layout: []`, returning the created workspace.

**On submit:**
1. POST to `/api/workspaces`
2. Revalidate SWR workspaces key via `mutate()`
3. Set `activeWorkspace` in Zustand to the new workspace name

New workspaces start empty. Widgets are added via the Layout picker (Section 3).

**Affected files:**
- `app/api/workspaces/route.ts` — add POST handler
- `hooks/useWorkspaces.ts` — add `createWorkspace` function
- `components/layout/Sidebar.tsx` — wire `+` button, add modal state
- `components/ui/NewWorkspaceModal.tsx` — new modal component

---

## 3. Layout button — widget picker

**UI:** Toolbar Layout button opens a dropdown panel below the button. The panel lists all 6 widget types (icon + label). Clicking a type adds a new instance to the current workspace layout and closes the panel. Dismissed by clicking outside or Escape.

**New instance placement:**
- `id`: `crypto.randomUUID()`
- `x`: 0
- `y`: bottom of current layout (max of `item.y + item.h` across all layout items, or 0 if empty)
- Default sizes per type:

| Type | w | h |
|---|---|---|
| heatmap | 8 | 7 |
| feed | 5 | 9 |
| calendar | 7 | 9 |
| funnel | 7 | 7 |
| focus | 4 | 7 |
| reminders | 5 | 7 |

**Affected files:**
- `components/layout/Toolbar.tsx` — add panel state, widget picker UI, call `addWidget`
- `hooks/useWorkspaces.ts` — add `addWidget(type: WidgetType)` helper

---

## 4. Calendar week navigation

`CalendarWidget` gains local `weekOffset: number` state (default 0). ‹/› buttons decrement/increment it. `weekStartStr` is recalculated as `now + weekOffset * 7 days`. The existing `useCalendarEvents(weekStartStr)` hook accepts this without changes. The month/week label in the header updates automatically.

**Affected files:** `components/widgets/CalendarWidget.tsx`

---

## 5. Calendar inline note capture

The existing input at the bottom of CalendarWidget gets an `onKeyDown` handler. On Enter (non-empty value): calls `createItem({ kind: 'note', body: inputValue })` then clears the input. Uses the existing `useItems` hook already available in the widget.

**Affected files:** `components/widgets/CalendarWidget.tsx`

---

## 6. Focus session history

Replace the hardcoded `prevSessions` array with real data. `useItems({ kind: 'focus_session' })` already returns all sessions. Filter to items where `focus.startedAt` is today. Map to `{ label: item.body, minutes: item.focus.durationMinutes }`. The live session row (computed from the running timer) stays as-is.

**Affected files:** `components/widgets/FocusWidget.tsx`

---

## 7. Widget refresh buttons

Add `onRefresh?: () => void` prop to `WidgetShell`. The ↻ button calls it. Each widget passes its SWR `mutate` function as `onRefresh`. No hook changes needed.

**Affected files:**
- `components/widgets/WidgetShell.tsx` — add `onRefresh` prop, wire button
- All 6 widget files — pass `mutate` as `onRefresh`

---

## 8. Grid/scanlines toggles in Settings

Add a "Display" section to SettingsModal with toggle buttons (matching `seg-btn` style) for:
- **Grid overlay** — wired to `showGrid` / `setShowGrid` in Zustand
- **Scanlines** — wired to `scanlines` / `setScanlines` in Zustand

These remain in Zustand (visual preferences, not workspace-specific).

Remove the dead Grid/Scanlines toolbar buttons. The Layout toolbar button becomes the widget picker (Section 3).

**Affected files:**
- `components/SettingsModal.tsx` — add Display section
- `components/layout/Toolbar.tsx` — remove dead Grid/Scanlines buttons

---

## 9. Toolbar status strip — live counts

Replace hardcoded status text with live SWR data from `useItems`. Three values:

| Label | Value |
|---|---|
| `NOTES` | Count of root notes (`kind: 'note'`, `parentId: null`) |
| `LAST` | `createdAt` of most recent note, as relative time (e.g. `14m ago`) |
| `INBOX` | Count of root notes where `starred === false` and `tags.length === 0` |

Format: `NOTES 47 · LAST 14m ago · INBOX 3` — same monospace strip style as current.

**Affected files:** `components/layout/Toolbar.tsx`

---

## Implementation order

1. Core model (Section 1) — unblocks everything else
2. New workspace + Layout picker (Sections 2–3) — both touch `useWorkspaces`
3. Settings Display section (Section 8) — independent
4. Calendar week nav + note capture (Sections 4–5) — same file
5. Focus session history (Section 6) — independent
6. Widget refresh buttons (Section 7) — touches all widget files
7. Toolbar status strip (Section 9) — independent

---

## What this does NOT include

- `+ Capture` toolbar button (deferred, low priority)
- Toolbar `Today`, `All sources` buttons (deferred to Phase 2 with search/filter)
- Note editor `More ⋯` and `Reply ↳` (deferred)
- Composer Attach/Emoji buttons (deferred)
