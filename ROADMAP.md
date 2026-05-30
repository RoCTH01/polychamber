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
| **Capture modal** | `+` button opens fast-entry modal — body, tag chips, optional queue bucket; item lands in Feed immediately |
| **Universal review queue** | Any item (note, saved content) can be queued Next/Soon/Later via context menu or capture modal |
| **Feed Me/New tabs** | Me = items you wrote (no src); New = untagged + unstarred inbox; queue actions on every row |
| **Heatmap v2** | Per-instance config (all activity / tag filter / habit tracker); gear panel; weekly habit progress bar |
| **Tag → heatmap shortcut** | Right-click any tag chip in Feed → "Track #tag in heatmap" adds a pre-configured instance |
| **Widget config persistence** | Each widget instance stores its own config in `ws.layout` JSONB; survives reload |
| **NotePanel — document + thread modes** | Right panel switches between full markdown editor (document mode) and chat-style thread; mode persists across note navigation |
| **Note titles** | Optional title field per note; shown prominently in Feed and as a styled heading in document mode |
| **Feed hover actions** | ✎ Edit and ⌨ Thread buttons appear on row hover; click-to-open removed in favour of explicit intent |
| **Debounced auto-save** | Document body and title auto-save 1.5s after last keystroke; dirty indicator `●` while pending; immediate flush on blur/close/mode-switch |
| **Thread timestamps** | Messages show full `MMM D · HH:MM` for older messages, `HH:MM` for today; panel header shows "edited X ago" |

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

### NotePanel redesign — document & thread mode

- **Document / thread mode split** — right panel now has a mode toggle; document mode is a full-width markdown editor for the note body; thread mode is the existing chat stream; mode persists in Zustand across note navigation
- **Optional note title** — nullable `title` column added to `items`; title input appears at the top of document mode (18px bold, placeholder "Untitled"); shown in Feed above the body preview when set (body dims to secondary colour); blank title saved as null
- **Feed hover buttons** — ✎ (open in document mode) and ⌨ (open in thread mode) appear on row hover; whole-row click-to-open removed in favour of explicit intent; context menu updated to match
- **Single-user message cleanup** — `who='me'` messages no longer show avatar or author header; timestamp shown on hover only; `isMe`/`isSrc` now inferred from `item.src` when no `itemMessage` record exists, eliminating "Unknown" / "?" fallbacks
- **Long message collapsing** — `text` messages over ~5 visual lines collapse with "Show more ↓" / "Show less ↑" toggle; uses `isLongText` pure utility
- **Debounced auto-save** — body and title auto-save 1.5s after last keystroke; dirty indicator `●` next to DOC label while changes are pending; immediate flush on blur, mode-switch, and close
- **Thread timestamps** — `formatMsgTime` utility: today's messages show `HH:MM`, older messages show `MMM D · HH:MM`
- **Last edited** — panel header meta row now shows "edited X ago" (`relativeTime` on `updatedAt`) instead of "opened HH:MM"
- **Author field hidden for own notes** — author input only shown for source notes (`note.src` set); user-created notes have no author attribution
- **Save bug fixed** — `createdAt`/`updatedAt` JSON strings were causing Drizzle to throw `toISOString is not a function` in PATCH; those fields are now stripped before the Drizzle `set()` call; `updateItem` now logs non-OK PATCH responses

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

## Foundation work ✓ Complete

| Change | Status |
|---|---|
| **`config` on `LayoutItem`** | ✓ — each widget instance stores its own config in the layout JSONB |
| **`updatedAt` on `items`** | ✓ — DB migration applied; touched on every PATCH |
| **Funnel kind constraint removed** | ✓ — any item kind can now have a funnel extension |
| **Tag-activity computed query** | ✓ — `/api/activity/tag?tag=X&days=N` route live |

---

## Phase A — Unified content pool ✓ Complete

- **Capture modal** — `+` button opens fast-entry modal; body, tag chips, queue bucket selector; Enter saves; item appears in Feed and Funnel immediately
- **Universal review queue** — any item can be queued Next/Soon/Later via context menu in Feed, Funnel, or NoteEditor header; PATCH funnel is now an upsert
- **Feed Me tab** — filters to items with no `src` (things you wrote yourself)
- **Feed New tab** — filters to untagged + unstarred items (inbox view)
- **Queue actions on Feed rows** — right-click → Queue: Next / Soon / Later (or Move to X if already queued)
- **Queue actions on NoteEditor header** — right-click note header → same queue options
- **Funnel widget** — now queries `hasFunnel: true` instead of `kind: 'funnel_item'`; shows all queued items regardless of origin kind

---

## Phase B — Heatmap v2 ✓ Complete

- **Configurable per-instance** — gear (⚙) icon in header opens config panel; each Heatmap widget tracks independently
- **All activity mode** — existing behaviour; global daily count with source breakdown footer
- **Tag filter mode** — tiles show frequency of items tagged `#X`; config stores the tag name; hits `/api/activity/tag`
- **Habit tracker mode** — binary tiles (did/didn't); configurable weekly goal (N×/week); weekly progress bar in footer; streak KPI shows days since last miss
- **Tag → heatmap shortcut** — right-click any tag chip in Feed → "Track #tag in heatmap" adds a pre-configured instance immediately
- **Config persists** — stored in `ws.layout` JSONB per widget instance; survives page reload

---

## Phase C — Note-to-note linking ✓ Complete

- **`item_links` edge table** — `(from_id, to_id, link_kind)` with cascade deletes and unique constraint; `from_id` is the specific message item so sibling replies don't orphan each other's links
- **`/` slash command** — Composer detects `/` after whitespace; SlashMenu shows Link, Reference, Task, Quote; letter filtering + arrow key navigation + Enter to select; refocuses textarea on close
- **Inline link chips** — `[[uuid:Title]]` tokens in message body; `parseLinks` utility; `fmt()` renders amber clickable chips mid-text; synced to `item_links` on create/edit
- **Reference blocks** — standalone child messages with `messageKind='note_ref'`; rendered as bordered card with LINKED NOTE label; auto-sent on note pick
- **NotePicker** — search-as-you-type over cached notes; arrow keys + Enter navigate; self-link excluded
- **Backlinks panel** — LINKED FROM section pinned below message stream; only shown when links exist; clicking a row opens the linking note; ordered by recency
- **SWR invalidation** — target note's backlinks panel refreshes immediately after any link is created

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
| Toolbar | Search bar / ⌘K | Shortcut registered, no modal — Phase D |
| Note panel | More ⋯ | No action |
| Composer | Attach ⌇ | No action |
| Composer | Emoji ☺ | No action |
