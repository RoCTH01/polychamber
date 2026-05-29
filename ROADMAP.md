# Polychamber — Roadmap

## Product direction

Polychamber is a personal knowledge workspace — an alternative to Notion and Obsidian with a novel display model. Instead of navigating into one page at a time inside a folder hierarchy, your content is visible through multiple simultaneous lenses: a chronological feed, a priority queue, a calendar, an activity heatmap. Things you save don't go to die; they stay in your peripheral vision.

**Core loop: Capture → Surface → Revisit**

Everything is a first-class item — notes you write and content you save from outside are the same object. Widgets are different views of one unified content pool, not separate feature silos.

---

## What's fully working

| Area | Details |
|---|---|
| **All 6 widgets** | Feed, Heatmap, Calendar, Funnel, Focus, Reminders — render live data, persist mutations, refresh ↻ wired |
| **Note editor** | Full thread view, 4 message kinds, inline edit, reactions, tagging, auto-scroll |
| **Workspace grid** | Drag-to-swap, free placement, drag-to-resize, layout persistence; right-click blank area to add widget |
| **Layout as truth** | Widget visibility driven entirely by `ws.layout` — no global Zustand flags; close removes from array |
| **Widget picker** | Layout button opens dropdown to add any of 6 widget types; multiple instances per workspace supported |
| **New workspace** | Sidebar `+` opens modal to name + create workspace, switches to it immediately |
| **Calendar** | Week navigation `‹ ›` with `weekOffset` state; inline note capture on Enter |
| **Focus** | Live session history from DB (today's completed sessions + running timer) |
| **Settings modal** | Theme, density, font size, grid overlay, scanlines — all live |
| **Toolbar status strip** | Live NOTES count · LAST note time · INBOX count (untagged, unstarred) |
| **Persistence layer** | All API routes, SWR hooks, optimistic updates, DB cascades |
| **macOS shell** | Titlebar, traffic lights, Electron main + preload |
| **Context menu system** | Right-click menus on all interactive items across the app |
| **Calendar → note linking** | Events link to notes with full DB persistence and NoteEditor badge |

---

## Shipped this session

### Phase 1 — Shell wiring
- **Layout-as-truth** — removed 6 Zustand widget visibility flags; `ws.layout` array is now the sole source of truth for what's visible per workspace
- **Widget picker** — Layout button in toolbar opens a picker dropdown to add any of the 6 widget types; each instance gets a UUID so multiple of the same type can coexist
- **New workspace** — sidebar `+` opens a modal; `POST /api/workspaces` creates the DB row with an empty layout, then the app switches to it
- **Widget refresh** — ↻ button in every widget header triggers SWR `mutate` on that widget's data source
- **Calendar week nav** — `‹ ›` buttons shift `weekOffset` state; `weekStartStr` computed via `weekStartFor()` utility
- **Calendar note capture** — inline input submits a root note on Enter via `createItem`
- **Focus live history** — session rows now come from DB (`useItems({ kind: 'focus_session' })`), filtered to today's date
- **Settings display toggles** — grid overlay and scanlines moved into Settings modal with mutual-exclusive hint text
- **Toolbar live status strip** — NOTES / LAST / INBOX pulled from SWR in real time
- **Right-click blank workspace** — context menu to add any widget type directly from the grid background

### Grid & layout
- **Widget area bug fixed** — `display: flex` on cell wrappers caused widgets not to fill their grid cell width; removed, now block-level fills correctly
- **Viewport-proportional row heights** — rows clamp between 60px and 140px based on `(windowHeight - chrome) / totalRows`; fills the screen on sparse layouts, caps on large ones
- **Drag-to-resize** — right edge (width), bottom edge (height), and SE corner (both) handles on every widget; snaps to grid units; persists via `updateLayout`
- **Free placement drag** — widgets can be dropped anywhere on the grid, not just onto another widget; ghost preview cell shows valid drop target; overlap with another widget triggers swap; native browser drag ghost suppressed

### Widget UX
- **Funnel widget redesign** — replaced cryptic glyphs with labelled media-kind badges (PAPER / VIDEO / ARTICLE / THREAD), tab counts (`next 3`), empty state message
- **Funnel archive button wired** — `✕` now calls `deleteItem()`
- **Heatmap 90d/30d tile size fixed** — tiles were ballooning to fill widget width; 90d/30d now use fixed 11px tiles, 365d uses `minmax(0, 10px)` columns
- **Heatmap tile overflow fixed** — removed `aspectRatio` from week columns and tiles; switched to a flat CSS grid with `grid-auto-flow: column` and explicit `TILE_PX` row heights; eliminates the "DAILY" label overlap bug caused by conflicting aspect ratios
- **Heatmap DAILY label row** — reserved 14px header above the tile grid for the hover tooltip, preventing it from overlapping the KPI boxes

### Interaction model
- **Font size scale shifted up** — old "large" is now "small"; medium and large are proportionally bigger
- **Context menu system** — shared `ContextMenuProvider` + `useContextMenu()` hook; portal-rendered, edge-detected, Escape/click-outside to close; 80ms scale-in animation
- **Right-click menus wired across the app:** Feed rows, Funnel items, Reminder items, Note editor messages, Widget headers
- **Message hover toolbar** — stripped to just ☺ react button; all other actions moved to right-click

### Calendar → note linking
- **Schema migration** — `linked_note_id` (nullable FK → `items.id`, `ON DELETE SET NULL`) added to `calendar_events`
- **PATCH `/api/calendar-events/[id]`** — new route to set/clear the link
- **`createAndLinkNote`** — creates a root note titled with the event name + day, links it, revalidates SWR so page.tsx finds the new note immediately
- **Calendar widget right-click** — "New linked note" / "Open linked note" / "Unlink note" depending on link state
- **Note indicator dot** — small coloured dot on event blocks that have a linked note
- **NoteEditor event badge** — tinted bar in the note header showing event title, day, and time when opened from a calendar event

### Visual design refresh
- **Warm neutral color system** — dark theme shifted to near-neutral warm base (`oklch` hue 60) with amber accent; light and high-contrast themes updated to match
- **Widget titles sentence case** — all widget headers converted from ALL CAPS to sentence case
- **Widget header typography** — switched from mono to Inter, lighter background
- **Chip and tag typography** — lowercase Inter pills with rounded corners
- **Warm hover tints** — feed and funnel row hovers now use a subtle amber tint
- **Note editor** — body text enlarged to 13.5px with 1.65 line-height; tag chips switched to Inter lowercase pills
- **Feed widget** — author and tags use Inter (not mono); starred icon uses amber accent

### Responsive widgets (container queries)
- **Container query foundation** — `container-type: inline-size` on `.widget-body`; global text-overflow rules added
- **Toolbar collapse** — button labels hidden via `@media` at narrow window widths
- **Per-widget responsive tiers** — Feed, Heatmap, Calendar, Focus, Funnel, Reminders all respond to `@container` breakpoints
- **Widget header overflow** — fixed header text truncation and overflow at all sizes

---

## Foundation work — prerequisite for the new direction

These are schema and API changes that unlock the features below. None require rebuilding anything — all additive.

| Change | Why it's needed | Effort |
|---|---|---|
| **Add `config` to `LayoutItem`** | Every configurable widget (heatmap target, feed filter) stores its config per-instance in the layout JSON | Tiny — one field on an interface + JSONB |
| **Add `updatedAt` to `items`** | Per-note heatmap ("how often did I update my gym note?") and staleness surfacing | Small — migration + touch on every PATCH |
| **Loosen funnel kind constraint** | Any item should be queueable, not just `funnel_item` kind | Small — remove kind check in the API |
| **Tag-activity computed query** | Heatmap filtered by tag queries `items` directly by day; no schema change needed, just a new API param | Medium — new route or param on `/api/activity` |

---

## Phase A — Unified content pool
> ~3–4 days — makes the product direction real

**Funnel → Universal review queue**
- Remove the `funnel_item` kind gate; allow any item to have a `item_funnel` extension
- Add "Send to queue" to the Feed and Note editor context menus
- The Funnel widget shows all queued items regardless of original kind

**Feed → All content stream**
- Add a "Me" source filter for items with no `src` (things you wrote yourself)
- Add a "New" tab showing unreviewed/untagged items (replaces the toolbar INBOX count as the primary capture review surface)

**Capture modal**
- Wire the `+` button in the toolbar to a fast modal: type a thought or paste a URL, optionally pick a queue bucket (next/soon/later) and tags, hit Enter
- One action — item is in the system and optionally queued

---

## Phase B — Heatmap v2 (configurable instances)
> ~2–3 days

Each Heatmap widget gets a tracking target configured at add-time (and editable via a gear icon in the header):

| Mode | Tile color means |
|---|---|
| **All activity** (current default) | Volume of any content that day |
| **Tag** | Frequency of items tagged `#gym` (or any tag) |
| **Specific note** | How often a single note was updated |
| **Habit** | Hit / partial / missed against a weekly target cadence |

- Tag mode: computed query on `items` filtered by tag, grouped by `DATE(created_at)`
- Note mode: requires `updatedAt` (from foundation work); groups by `DATE(updated_at)`
- Habit mode: binary tiles; adds a "X/week goal" setting and a weekly progress indicator
- Streak KPI becomes meaningful: "12 days since you missed a gym session"
- Right-click a tag anywhere → "Track this tag" → adds a pre-configured heatmap instance

---

## Phase C — Note-to-note linking
> ~2 days

The PKM layer — ideas connecting to each other.

| Feature | What it needs |
|---|---|
| **`item_links` table** | `(from_id, to_id)` edge table with cascade deletes |
| **`[[wiki-link]]` syntax** | Parser in the note editor body; renders as a clickable chip |
| **Backlinks panel** | Section at the bottom of NoteEditor: "X notes link here" |
| **Link via context menu** | "Link to note…" option opens a search-and-select |

---

## Phase D — Search (⌘K modal)
> ~2 days

| Feature | What it needs |
|---|---|
| **⌘K modal** | Command palette UI (input + results list) |
| **Full-text search** | `tsvector` column on `items.body` + GIN index, `/api/search?q=` route |
| **Filter by kind/tag** | Pills to scope results |
| **Open result** | Click result → open NoteEditor for that item |

---

## Phase E — Data ingestion
> ~1–2 weeks — the core product value

Turns the app from a notes viewer into a live intelligence feed.

| Source | Mechanism |
|---|---|
| **Obsidian** | File watcher via Electron `chokidar` → parse markdown → ingest as `src: 'ob'` items |
| **Mac Notes** | AppleScript / `osascript` polling via Electron main process |
| **Twitter/X** | Twitter API v2 bookmarks + home timeline → cron sync |
| **Discord** | Discord bot token → monitor specified channels/DMs → polling |
| **Reddit** | Reddit API saved posts + upvoted → cron sync |

Each source needs: auth config UI, background sync worker, conflict/duplicate detection, and activity upsert on ingest.

---

## Phase F — LLM pipeline
> ~1 week — intelligence layer

| Feature | What it needs |
|---|---|
| **Auto-tagging** | Run each new item through LLM → suggest/apply tags |
| **Summarization** | Generate `summary` field for long threads/notes |
| **Vector embeddings** | `embedding vector(1536)` column, `pgvector` extension |
| **Semantic search** | Replace Phase D full-text with vector similarity |
| **Related notes panel** | "Notes similar to this" in NoteEditor based on embedding |
| **Contextual surfacing** | Surface items you haven't touched in a while but are relevant now |

---

## Phase G — Polish & distribution
> ~3–4 days

| Feature | What it needs |
|---|---|
| **System tray** | Electron `Tray` with quick-capture popup |
| **Background sync** | Electron `setInterval` or cron in main process; status in toolbar strip |
| **⌘K global shortcut** | `globalShortcut` in Electron main — open app from anywhere |
| **Auto-updater** | `electron-updater` + GitHub releases |
| **Onboarding flow** | First-launch wizard: connect sources, set preferences |
| **Electron packaging** | `make build:electron` → signed `.dmg` |

---

## Priority order

```
Foundation → Phase A (unified pool) → Phase B (heatmap v2) → Phase C (linking)
                                                                      ↓
                                             Phase D (search) → Phase E (ingestion)
                                                                      ↓
                                                    Phase F (LLM) → Phase G (distribution)
```

Foundation and Phase A establish what the product *is*. Phase E (ingestion) is still the highest-leverage feature — without real data flowing in, everything runs on seed data.

---

## Shell buttons not yet wired

| Location | Button | Status |
|---|---|---|
| Toolbar | + Capture | Stub — Phase A |
| Toolbar | Search bar / ⌘K | Shortcut registered, no modal — Phase D |
| Note editor | More ⋯ | No action |
| Note editor | Reply ↳ | Stub in right-click menu — Phase C |
| Composer | Attach ⌇ | No action |
| Composer | Emoji ☺ | No action |
