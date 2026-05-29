# Phase C — Note-to-note linking

**Date:** 2026-05-29
**Status:** Approved

---

## Summary

Adds a PKM linking layer to Polychamber: notes can reference other notes, links are surfaced inline in the message stream, and every note shows which other notes link back to it.

---

## User flows

### Creating an inline link
1. User opens a note and types in the Composer.
2. Types `/` — a floating slash command picker appears above the input.
3. Selects **Link** — a note search dropdown appears (filters root notes by `author` + body prefix as you type).
4. Selects a note — `[[uuid:Title]]` token is inserted at the cursor position in the textarea.
5. Sends the message — `[[uuid:Title]]` renders as an amber chip inline with the text.
6. On send, the API parses the body of the new message item, deletes any existing inline `item_links` rows where `from_id = newItem.id`, and inserts fresh ones.

### Creating a reference block
1. Same flow, but user selects **Reference** instead of Link.
2. After picking a note, the Composer is marked as `kind='note_ref'` with `body='uuid:Title'`.
3. Sending creates a child message with `messageKind='note_ref'` — renders as a bordered card in the stream (not mixed into text).
4. API also inserts an `item_links` row with `link_kind='reference'`.

### Viewing backlinks
- The NoteEditor shows a **LINKED FROM** section pinned below the message stream.
- Only rendered when `backlinks.length > 0`.
- Each row shows the linking note's title and age, and is clickable (sets `openNoteId` to open it).

---

## Data layer

### New table: `item_links`

```sql
item_links (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id   uuid REFERENCES items(id) ON DELETE CASCADE,
  to_id     uuid REFERENCES items(id) ON DELETE CASCADE,
  link_kind text NOT NULL,   -- 'inline' | 'reference'
  UNIQUE(from_id, to_id)
)
```

- `from_id` is the **specific item (message) that contains the link** — not always the root note. This ensures that re-syncing inline links on PATCH only touches the edited message's edges, not edges from sibling replies in the same thread.
- Cascade on both ends: deleting either item cleans up the edge automatically.
- `UNIQUE(from_id, to_id)` deduplicates multiple chips pointing to the same note within a single message.

**Backlinks query** resolves root notes via a join:

```sql
SELECT DISTINCT root.*
FROM item_links il
JOIN items msg  ON msg.id  = il.from_id
JOIN items root ON root.id = COALESCE(msg.parent_id, msg.id)
WHERE il.to_id = :noteId
ORDER BY root.created_at DESC
```

### Body encoding — `[[uuid:Title]]`

Inline links are stored directly in the message body text as `[[uuid:Title]]`. Title is baked in at insert time using `note.author ?? note.body.slice(0, 40)`. Rendered at display time by parsing the token in `fmt()`. If the linked note is later deleted, the token renders as dimmed plain text.

---

## API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/item-links?noteId=X` | Returns notes that link TO `X` (backlinks). Joins `item_links` → `items` on `from_id`. |
| `POST` | `/api/item-links` | Create a link edge: `{ from_id, to_id, link_kind }`. Used when sending a Reference block. |
| `DELETE` | `/api/item-links/[id]` | Remove a specific edge (future: unlink via context menu). |
| `PATCH` | `/api/items/[id]` (updated) | When `body` is in the patch, re-parse `[[uuid:...]]` tokens → delete old inline edges where `from_id = itemId`, insert fresh ones. |

---

## Components

### New

| Component / Hook | Purpose |
|---|---|
| `SlashMenu.tsx` | Floating picker triggered by `/` in Composer. Options: Link, Reference, Task, Quote. Positioned above the input using absolute CSS. |
| `NotePicker.tsx` | Dropdown note search. Calls `useItems({ parentId: 'null' })` (SWR-cached, no duplicate fetch). Filters by `author` + body prefix. Emits selected `Item`. Filters out the current note (no self-links). Shows "no notes found" empty state. |
| `useItemLinks.ts` | SWR hook: `GET /api/item-links?noteId=X`. Returns `{ backlinks: Item[], isLoading }`. |
| `api/item-links/route.ts` | GET + POST handlers. |
| `api/item-links/[id]/route.ts` | DELETE handler. |

### Modified

| File | Change |
|---|---|
| `schema.ts` | Add `itemLinks` table definition. |
| `types/index.ts` | Add `'note_ref'` to `MessageKind`. Add `ItemLink` interface. |
| `Composer.tsx` | Detect `/` keydown → show `SlashMenu`. On Link selection → show `NotePicker` → insert `[[uuid:Title]]` at cursor. On Reference selection → show `NotePicker` → set composer mode to `note_ref`. |
| `MessageContent.tsx` | Extend `fmt()` regex to match `\[\[([^\]]+)\]\]` → render amber chip. Add `note_ref` rendering block (bordered card with title + body snippet). Chip and card are clickable (calls `onLinkClick(uuid)`). |
| `NoteEditor.tsx` | Call `useItemLinks(note.id)`. Render backlinks panel between stream and Composer when `backlinks.length > 0`. Each row clickable via `setOpenNoteId`. |
| `api/items/[id]/route.ts` | On PATCH: if `body` present, extract `[[uuid:...]]` tokens, delete old inline `item_links` rows where `from_id = itemId`, insert fresh rows. |

---

## Edge cases

| Scenario | Handling |
|---|---|
| Linked note deleted | CASCADE removes `item_links` row. `[[uuid:Title]]` token stays in body, `fmt()` renders it as dimmed plain text (detect by checking if UUID is not in a resolved map — handled gracefully with a fallback). |
| User edits message, removes chip | PATCH re-parses body → old inline links deleted, fresh ones inserted. |
| Self-link | `NotePicker` excludes the current note from results. |
| Multiple mentions of same note | `UNIQUE(from_id, to_id)` deduplicates at DB level. Multiple chips render fine in UI. |
| Circular links (A→B and B→A) | Valid — both appear in each other's backlinks panels. |
| Empty search in NotePicker | Shows "no notes found" message. |
| Network failure on link creation | SWR mutate with rollback on error (same pattern as existing `useItems` hooks). |

---

## Out of scope (Phase C)

- Autocomplete while typing (requires Phase D search infrastructure)
- Graph view / visual link map
- Unlink via context menu (can add in a follow-up; DELETE route is ready)
- Renaming a note updating stale chips in other notes' bodies
