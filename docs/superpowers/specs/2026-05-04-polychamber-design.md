# Polychamber — Design Spec
**Date:** 2026-05-04
**Status:** Approved

---

## 1. Overview

Polychamber is a desktop-first personal intelligence dashboard that aggregates fragmented data from social and productivity platforms (Twitter/X, Discord, Obsidian, Mac Notes, Reddit) into a single modular interface. The first build delivers the full UI shell with local PostgreSQL persistence. External data ingestion and LLM pipelines are future phases.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Desktop shell | Electron 36 | Hosts Next.js as child process in prod |
| Frontend | Next.js 15 (app router), React 19, TypeScript | |
| Styling | CSS custom properties (matches prototype exactly) | Inter + JetBrains Mono |
| Client state | Zustand | UI state: active workspace, open note, theme, drag |
| Server state | SWR | Fetches from Next.js API routes, optimistic updates |
| API | Next.js API routes | Same routes work in Electron and web |
| ORM | Drizzle ORM | Type-safe, migration-file based |
| Database | PostgreSQL 16 | Local via Docker Compose |
| Platform bridge | Electron contextBridge (minimal) | |

---

## 3. Project Structure

```
polychamber-app/
├── electron/
│   ├── main.ts              # App entry, window creation, Next.js child process
│   └── preload.ts           # contextBridge: openExternal, watchPath, platform
├── src/
│   ├── app/
│   │   ├── page.tsx         # Root — renders <WorkspaceApp />
│   │   └── api/
│   │       ├── items/       # GET /api/items, POST, PATCH, DELETE
│   │       ├── workspaces/  # GET /api/workspaces, PATCH (layout)
│   │       └── activity/    # GET /api/activity (heatmap data)
│   ├── components/
│   │   ├── widgets/
│   │   │   ├── WidgetShell.tsx
│   │   │   ├── HeatmapWidget.tsx
│   │   │   ├── FeedWidget.tsx
│   │   │   ├── CalendarWidget.tsx
│   │   │   ├── FunnelWidget.tsx
│   │   │   ├── FocusWidget.tsx
│   │   │   └── RemindersWidget.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── WorkspaceGrid.tsx
│   │   ├── note-editor/
│   │   │   ├── NoteEditor.tsx
│   │   │   ├── Message.tsx
│   │   │   ├── MessageContent.tsx
│   │   │   └── Composer.tsx
│   │   └── ui/
│   │       ├── SourceBadge.tsx
│   │       └── Kpi.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts    # Drizzle schema
│   │   │   ├── client.ts    # Drizzle + pg client
│   │   │   └── seed.ts      # Seeds DB with prototype mock data on first run
│   │   └── platform/
│   │       └── index.ts     # openExternal, watchPath — swappable for web
│   ├── hooks/
│   │   ├── useItems.ts      # SWR hook for items
│   │   ├── useWorkspaces.ts
│   │   └── useActivity.ts
│   └── store/
│       └── app.ts           # Zustand: activeWorkspace, openNoteId, theme, density, drag
├── docker-compose.yml
├── drizzle.config.ts
└── package.json
```

---

## 4. Data Model

### 4.1 Core tables

```sql
-- All content lives here. Thread replies use parent_id.
items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,   -- 'note' | 'reminder' | 'funnel_item' | 'focus_session'
  body        text NOT NULL,
  src         text,            -- 'tw' | 'dc' | 'ob' | 'mn' | 'rd' | null
  author      text,
  parent_id   uuid REFERENCES items(id),  -- null = root thread; non-null = reply
  starred     boolean NOT NULL DEFAULT false,
  tags        text[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
)

-- Kind-specific extension tables (1:1 with items)
item_reminder (
  item_id     uuid PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  due         text NOT NULL,   -- 'today' | 'tomorrow' | 'this wk' | 'next wk'
  priority    integer NOT NULL DEFAULT 3,  -- 1=high, 2=med, 3=low
  done        boolean NOT NULL DEFAULT false
)

item_funnel (
  item_id     uuid PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  media_kind  text NOT NULL,   -- 'paper' | 'video' | 'article' | 'thread'
  source      text NOT NULL,
  est         text NOT NULL,   -- human-readable: '26 min', '1h 12m'
  queue_tag   text NOT NULL    -- 'next' | 'soon' | 'later'
)

item_focus (
  item_id          uuid PRIMARY KEY REFERENCES items(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  duration_minutes integer
)

-- Structural
workspaces (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name    text NOT NULL UNIQUE,
  layout  jsonb NOT NULL   -- [{ id, type, x, y, w, h }]
)

-- One row per calendar day for the heatmap
activity (
  date               date PRIMARY KEY,
  count              integer NOT NULL DEFAULT 0,
  source_breakdown   jsonb NOT NULL DEFAULT '{}'
)
```

### 4.4 Calendar events table

Calendar events are structured time-blocks (meetings, focus sessions, social), not notes. They do not belong in `items`.

```sql
calendar_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  kind        text NOT NULL,   -- 'meet' | 'focus' | 'social'
  day_of_week integer NOT NULL, -- 0=Mon … 6=Sun
  start_hour  numeric NOT NULL, -- e.g. 9.5 = 09:30
  end_hour    numeric NOT NULL,
  week_start  date NOT NULL,   -- ISO week start (Monday)
  is_current  boolean NOT NULL DEFAULT false
)
```

Seeded with `CAL_EVENTS` from the prototype. Inline note capture from the calendar widget creates a regular `items` row (kind=note) with `created_at` set to the clicked time slot.

### 4.2 Query patterns

- **Unified feed:** `SELECT * FROM items WHERE parent_id IS NULL ORDER BY created_at DESC`
- **Thread replies:** `SELECT * FROM items WHERE parent_id = $noteId ORDER BY created_at`
- **Reminders due today:** `SELECT i.*, r.* FROM items i JOIN item_reminder r ON r.item_id = i.id WHERE r.due = 'today'`
- **Funnel queue:** `SELECT i.*, f.* FROM items i JOIN item_funnel f ON f.item_id = i.id WHERE f.queue_tag = $tag`
- **Heatmap:** `SELECT date, count FROM activity ORDER BY date DESC LIMIT 365`

### 4.3 Seed data

On first run (`seed.ts`), the prototype's mock data (15 notes, 9 funnel items, 6 reminders, 3 focus sessions, 365 activity rows, 3 workspaces) is inserted. Seed is idempotent — skipped if `workspaces` table is non-empty.

---

## 5. UI Components

### 5.1 Widgets

All widgets receive data via SWR hooks and communicate mutations through the same hooks. They never call the DB directly.

| Widget | Data source | Key interactions |
|---|---|---|
| HeatmapWidget | `useActivity()` | Tab switch (365d/90d/30d), hover tooltip, color scale variants |
| FeedWidget | `useItems({ kind: 'note' })` | Source filter tabs, click row → open NoteEditor |
| CalendarWidget | `useCalendarEvents()` (own table, see §4.4) | Inline note capture, week navigation |
| FunnelWidget | `useItems({ kind: 'funnel_item' })` | Tab switch (next/soon/later), move/archive actions |
| FocusWidget | Local timer (Zustand) + `useItems({ kind: 'focus_session' })` | Start/pause/reset. Session written to DB on pause or when navigating away. Live bar shows in-progress session separately. |
| RemindersWidget | `useItems({ kind: 'reminder' })` | Toggle done, inline add, open/all filter |

### 5.2 WorkspaceGrid

- 12-column CSS grid, 60px row height, matches prototype exactly
- Drag-to-swap: HTML5 drag API, swaps `x/y/w/h` between two widgets
- Layout persisted to `workspaces.layout` on every swap (PATCH `/api/workspaces/:id`)
- Widget visibility toggled via Zustand (mirrors prototype's TweaksPanel behavior)

### 5.3 NoteEditor

- Opens as a right-side panel (360px wide, slide-in animation)
- Renders the full message thread for the selected note
- Composer supports 4 message kinds: text, task, link, quote
- All mutations optimistic: message appended to local SWR cache immediately, confirmed by API response
- Inline markdown rendering: **bold**, *italic*, `code`, @mention, #tag, URLs

### 5.4 Sidebar

- Workspace switcher (Discord-style pill icons with active pip)
- Live clock in footer (updates every minute)
- "New workspace" button (creates workspace with default research layout)

### 5.5 Toolbar

- Source/sync/inbox status display (static for now, real-time in future ingestion phase)
- Theme toggle (dark/light)
- Search bar is visual-only in this build; ⌘K registers the shortcut but opens no modal (deferred to search phase)

---

## 6. Styling

CSS custom properties from the prototype are ported directly to `src/app/globals.css`. No CSS-in-JS, no Tailwind — the prototype's variable system (`--bg`, `--panel`, `--accent`, `--text`, etc.) is preserved as-is. Three themes (`dark`, `light`, `hc`) and four density levels (`compact`, `comfy`, `spacious`) via `data-theme` and `data-density` attributes on the root element.

Fonts loaded via `next/font/google`: Inter + JetBrains Mono.

---

## 7. Electron Integration

### 7.1 Dev mode
```
docker compose up -d        # PostgreSQL on :5432
npm run dev:next            # Next.js dev server on :3000
npm run dev:electron        # Electron loads http://localhost:3000
```

### 7.2 Production mode
- Next.js built with `output: 'standalone'`
- Electron `main.ts` spawns the standalone server as a child process
- Electron loads `http://localhost:PORT` (dynamic port to avoid conflicts)

### 7.3 contextBridge surface (preload.ts)
```ts
window.electronAPI = {
  openExternal: (url: string) => void,     // opens URLs in system browser
  watchPath:    (path: string) => void,    // future: Obsidian/Notes file watcher
  platform:     string,                    // 'darwin' | 'win32' | 'linux'
}
```

### 7.4 Platform abstraction
`src/lib/platform/index.ts` wraps all `window.electronAPI` calls. Web builds stub them. No component ever imports from `electron`.

---

## 8. API Routes

| Method | Route | Description |
|---|---|---|
| GET | `/api/items` | List items. Query params: `kind`, `src`, `parentId`, `limit`, `offset` |
| POST | `/api/items` | Create item + extension row in one transaction |
| PATCH | `/api/items/:id` | Update item fields or extension fields |
| DELETE | `/api/items/:id` | Delete item (cascades to extension) |
| GET | `/api/workspaces` | List all workspaces with layouts |
| PATCH | `/api/workspaces/:id` | Update layout jsonb |
| GET | `/api/activity` | Heatmap data. Query param: `days` (30/90/365) |
| POST | `/api/activity/upsert` | Upsert today's activity count (called on item create) |

---

## 9. Out of Scope (This Build)

- External data ingestion (Twitter API, Discord bot, Obsidian file watcher, Mac Notes)
- LLM pipeline (summarization, categorization, feature extraction)
- Vector database / semantic search
- ⌘K search modal
- System tray / background sync
- Auto-updater
- User accounts / multi-user

---

## 10. Future-Proofing Notes

- All React components are pure — no Electron imports anywhere in `src/`
- All data flows through Next.js API routes, which work identically in a web deployment
- Drizzle migrations are file-based — adding vector embedding columns later is a single migration
- The `items` unified model means the LLM pipeline can process all content types with one code path
