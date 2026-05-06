# Polychamber — Roadmap

## What's fully working

| Area | Details |
|---|---|
| **All 6 widgets** | Feed, Heatmap, Calendar, Funnel, Focus, Reminders — render live data, persist mutations |
| **Note editor** | Full thread view, 4 message kinds, inline edit, reactions, tagging, auto-scroll |
| **Workspace grid** | Drag-to-swap, layout persistence, widget visibility toggles |
| **Settings modal** | Theme, density, font size — all live |
| **Persistence layer** | All API routes, SWR hooks, optimistic updates, DB cascades |
| **macOS shell** | Titlebar, traffic lights, Electron main + preload |

---

## Phase 1 — Wire the existing shell buttons
> Quick wins — ~1–2 days

Everything that renders but does nothing.

| Feature | What it needs |
|---|---|
| **+ New workspace** button | Modal to name it, create DB row, default layout |
| **Calendar week nav** `‹ ›` | Track `weekOffset` state, shift the weekStart query param |
| **Calendar inline note capture** | Wire Enter key → `createItem({ kind: 'note', ... })` |
| **Funnel archive** `✓` button | Call `deleteItem()` or move to `later` queue |
| **Focus session history** | Replace hardcoded rows with DB-fetched sessions for today |
| **Widget refresh** `↻` buttons | Call `mutate()` on the relevant SWR key |
| **Grid / scanlines toggles** | Move them into Settings modal |
| **Toolbar status strip** | Pull real counts from SWR (total notes, last `createdAt`, inbox count) |

---

## Phase 2 — Search (⌘K modal)
> ~2–3 days

The groundwork is already laid — items are in Postgres with full text.

| Feature | What it needs |
|---|---|
| **⌘K modal** | Command palette UI (input + results list) |
| **Full-text search** | `tsvector` column on `items.body` + GIN index, `/api/search?q=` route |
| **Filter by kind/source** | Pills to scope results (notes only, from Twitter, etc.) |
| **Open result** | Click result → open NoteEditor for that item |

---

## Phase 3 — Data ingestion
> The core product value — ~1–2 weeks

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

## Phase 4 — LLM pipeline
> Intelligence layer — ~1 week

The schema is ready — just needs a processing column and worker.

| Feature | What it needs |
|---|---|
| **Auto-tagging** | Run each new item through LLM → suggest/apply tags |
| **Summarization** | Generate `summary` field for long threads/notes |
| **Categorization** | Classify items into topic clusters |
| **Vector embeddings** | Add `embedding vector(1536)` column (single Drizzle migration), use `pgvector` |
| **Semantic search** | Replace Phase 2 full-text with vector similarity (`<=>` operator) |
| **Contextual surfacing** | "Related notes" panel in NoteEditor based on current thread embedding |

---

## Phase 5 — Polish & distribution
> Packaging — ~3–4 days

| Feature | What it needs |
|---|---|
| **System tray** | Electron `Tray` with quick-capture popup (open composer without full window) |
| **Background sync** | Electron `setInterval` or cron in main process; status reflected in toolbar strip |
| **⌘K global shortcut** | Register `globalShortcut` in Electron main — open app from anywhere |
| **Auto-updater** | `electron-updater` + GitHub releases |
| **Onboarding flow** | First-launch wizard: connect sources, set preferences |
| **Electron packaging** | `make build:electron` → signed `.dmg` via electron-builder |

---

## Priority order

```
Phase 1 (shell wiring) → Phase 2 (search) → Phase 3 (ingestion)
                                                      ↓
                                          Phase 4 (LLM) → Phase 5 (distribution)
```

Phase 3 is the highest-leverage work — without real data flowing in, the dashboard is a seeded demo. Everything else compounds on top of real data.

---

## Shell buttons (renders but not yet wired)

| Location | Button | Status |
|---|---|---|
| Toolbar | Layout | No action |
| Toolbar | All sources | No action |
| Toolbar | Today | No action |
| Toolbar | + Capture | No action |
| Toolbar | Status strip (SOURCES / SYNC / INBOX) | Static text |
| Toolbar | Search bar / ⌘K | Shortcut registered, no modal |
| Sidebar | + New workspace | No action |
| Calendar | ‹ › week navigation | No action |
| Calendar | Inline note input | Not wired to DB |
| Funnel | Archive ✓ | No action |
| All widgets | Refresh ↻ | No action |
| Note editor | More ⋯ | No action |
| Note editor | Reply ↳ | No action |
| Composer | Attach ⌇ | No action |
| Composer | Emoji ☺ | No action |
