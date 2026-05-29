# Phase C — Note-to-note linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add note-to-note linking via a `/` slash command in the Composer, with inline chips, reference blocks, and a backlinks panel.

**Architecture:** A new `item_links(from_id, to_id, link_kind)` edge table stores links; `from_id` is the specific message item containing the link (not the root note), so editing one reply never orphans another reply's links. Inline links are encoded as `[[uuid:Title]]` tokens in the message body and synced to `item_links` on save. Reference blocks are child messages with `messageKind='note_ref'`. The backlinks panel queries through `parent_id` to resolve root notes.

**Tech Stack:** Next.js 15, Drizzle ORM 0.41, Postgres, React 19, SWR, Vitest

---

## File map

| Action | Path |
|---|---|
| Modify | `app/src/lib/db/schema.ts` |
| Modify | `app/src/types/index.ts` |
| Create | `app/src/lib/parseLinks.ts` |
| Create | `app/src/lib/parseLinks.test.ts` |
| Create | `app/src/app/api/item-links/route.ts` |
| Create | `app/src/app/api/item-links/[id]/route.ts` |
| Create | `app/src/app/api/item-links/route.test.ts` |
| Modify | `app/src/app/api/items/route.ts` |
| Modify | `app/src/app/api/items/[id]/route.ts` |
| Create | `app/src/hooks/useItemLinks.ts` |
| Create | `app/src/components/note-editor/SlashMenu.tsx` |
| Create | `app/src/components/note-editor/NotePicker.tsx` |
| Modify | `app/src/components/note-editor/Composer.tsx` |
| Modify | `app/src/components/note-editor/MessageContent.tsx` |
| Modify | `app/src/components/note-editor/Message.tsx` |
| Modify | `app/src/components/note-editor/NoteEditor.tsx` |
| Modify | `app/src/app/note-editor.css` |

---

## Task 1: Schema + types

**Files:**
- Modify: `app/src/lib/db/schema.ts`
- Modify: `app/src/types/index.ts`

- [ ] **Add `itemLinks` table to schema**

  Replace the import line at the top of `app/src/lib/db/schema.ts`:

  ```ts
  import {
    pgTable, uuid, text, boolean, integer, numeric,
    date, timestamp, jsonb, type AnyPgColumn, unique,
  } from 'drizzle-orm/pg-core'
  ```

  Append at the end of the file:

  ```ts
  export const itemLinks = pgTable('item_links', {
    id:       uuid('id').primaryKey().defaultRandom(),
    fromId:   uuid('from_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    toId:     uuid('to_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
    linkKind: text('link_kind').notNull(),
  }, (t) => [unique().on(t.fromId, t.toId)])
  ```

- [ ] **Add `note_ref` to `MessageKind` and `ItemLink` interface in `app/src/types/index.ts`**

  Change:
  ```ts
  export type MessageKind = 'text' | 'task' | 'link' | 'quote'
  ```
  To:
  ```ts
  export type MessageKind = 'text' | 'task' | 'link' | 'quote' | 'note_ref'
  ```

  Append after the `CalendarEvent` interface:
  ```ts
  export interface ItemLink {
    id: string
    fromId: string
    toId: string
    linkKind: 'inline' | 'reference'
  }
  ```

- [ ] **Push schema to DB**

  ```bash
  cd app && npm run db:push
  ```

  Expected: Drizzle confirms `item_links` table created.

- [ ] **Commit**

  ```bash
  git add app/src/lib/db/schema.ts app/src/types/index.ts
  git commit -m "feat: add item_links schema and note_ref MessageKind"
  ```

---

## Task 2: `parseLinks` utility

**Files:**
- Create: `app/src/lib/parseLinks.ts`
- Create: `app/src/lib/parseLinks.test.ts`

- [ ] **Write the failing tests first**

  Create `app/src/lib/parseLinks.test.ts`:

  ```ts
  import { describe, test, expect } from 'vitest'
  import { parseLinks } from './parseLinks'

  describe('parseLinks', () => {
    test('returns empty array for empty string', () => {
      expect(parseLinks('')).toEqual([])
    })

    test('returns empty array when no tokens present', () => {
      expect(parseLinks('hello world **bold** #tag')).toEqual([])
    })

    test('parses a single inline link token', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      expect(parseLinks(`before [[${id}:My Note]] after`)).toEqual([
        { uuid: id, title: 'My Note' },
      ])
    })

    test('parses multiple tokens', () => {
      const id1 = '550e8400-e29b-41d4-a716-446655440000'
      const id2 = '550e8400-e29b-41d4-a716-446655440001'
      expect(parseLinks(`[[${id1}:Note A]] and [[${id2}:Note B]]`)).toEqual([
        { uuid: id1, title: 'Note A' },
        { uuid: id2, title: 'Note B' },
      ])
    })

    test('ignores malformed tokens without colon', () => {
      expect(parseLinks('[[notauuid]]')).toEqual([])
    })

    test('handles empty title', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000'
      expect(parseLinks(`[[${id}:]]`)).toEqual([{ uuid: id, title: '' }])
    })
  })
  ```

- [ ] **Run tests to confirm they fail**

  ```bash
  cd app && npm run test:run -- src/lib/parseLinks.test.ts
  ```

  Expected: FAIL — `parseLinks` not found.

- [ ] **Implement `parseLinks`**

  Create `app/src/lib/parseLinks.ts`:

  ```ts
  export interface ParsedLink {
    uuid: string
    title: string
  }

  // Matches [[xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:Any Title Here]]
  const LINK_RE = /\[\[([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}):([^\]]*)\]\]/g

  export function parseLinks(body: string): ParsedLink[] {
    const links: ParsedLink[] = []
    let m
    const re = new RegExp(LINK_RE.source, 'g')
    while ((m = re.exec(body)) !== null) {
      links.push({ uuid: m[1], title: m[2] })
    }
    return links
  }
  ```

- [ ] **Run tests to confirm they pass**

  ```bash
  cd app && npm run test:run -- src/lib/parseLinks.test.ts
  ```

  Expected: 6 passing.

- [ ] **Commit**

  ```bash
  git add app/src/lib/parseLinks.ts app/src/lib/parseLinks.test.ts
  git commit -m "feat: parseLinks utility for [[uuid:Title]] tokens"
  ```

---

## Task 3: `item-links` API routes

**Files:**
- Create: `app/src/app/api/item-links/route.ts`
- Create: `app/src/app/api/item-links/[id]/route.ts`
- Create: `app/src/app/api/item-links/route.test.ts`

- [ ] **Write failing tests**

  Create `app/src/app/api/item-links/route.test.ts`:

  ```ts
  import { describe, test, expect, vi, beforeEach } from 'vitest'
  import { NextRequest } from 'next/server'

  const mockExecute = vi.fn()
  const mockInsertValues = vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }))
  const mockInsert = vi.fn(() => ({ values: mockInsertValues }))
  const mockDelete = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))

  vi.mock('@/lib/db/client', () => ({ db: { execute: mockExecute, insert: mockInsert, delete: mockDelete } }))
  vi.mock('@/lib/db/schema', () => ({ itemLinks: {} }))

  beforeEach(() => vi.clearAllMocks())

  describe('GET /api/item-links', () => {
    test('returns 400 when noteId is missing', async () => {
      const { GET } = await import('./route')
      const req = new NextRequest('http://localhost/api/item-links')
      const res = await GET(req)
      expect(res.status).toBe(400)
    })

    test('returns backlinks array when noteId is provided', async () => {
      mockExecute.mockResolvedValue({ rows: [{ id: 'abc', body: 'hello', author: 'Alice', created_at: '2026-01-01', parent_id: null }] })
      const { GET } = await import('./route')
      const req = new NextRequest('http://localhost/api/item-links?noteId=xyz')
      const res = await GET(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.backlinks).toHaveLength(1)
      expect(data.backlinks[0].id).toBe('abc')
    })
  })

  describe('POST /api/item-links', () => {
    test('returns 400 when fields are missing', async () => {
      const { POST } = await import('./route')
      const req = new NextRequest('http://localhost/api/item-links', {
        method: 'POST',
        body: JSON.stringify({ from_id: 'a' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })

    test('creates link and returns 201', async () => {
      const { POST } = await import('./route')
      const req = new NextRequest('http://localhost/api/item-links', {
        method: 'POST',
        body: JSON.stringify({ from_id: 'a', to_id: 'b', link_kind: 'inline' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      expect(res.status).toBe(201)
      expect(mockInsertValues).toHaveBeenCalledWith({ fromId: 'a', toId: 'b', linkKind: 'inline' })
    })
  })
  ```

- [ ] **Run to confirm failure**

  ```bash
  cd app && npm run test:run -- src/app/api/item-links/route.test.ts
  ```

  Expected: FAIL — module not found.

- [ ] **Create GET + POST handler**

  Create `app/src/app/api/item-links/route.ts`:

  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { db } from '@/lib/db/client'
  import { itemLinks } from '@/lib/db/schema'
  import { sql } from 'drizzle-orm'

  export async function GET(request: NextRequest) {
    const noteId = request.nextUrl.searchParams.get('noteId')
    if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })

    const result = await db.execute(sql`
      SELECT DISTINCT ON (root.id) root.*
      FROM item_links il
      INNER JOIN items msg  ON msg.id  = il.from_id
      INNER JOIN items root ON root.id = COALESCE(msg.parent_id, msg.id)
      WHERE il.to_id = ${noteId}
      ORDER BY root.id, root.created_at DESC
    `)

    const backlinks = result.rows.map((r: Record<string, unknown>) => ({
      id:        r.id,
      kind:      r.kind,
      body:      r.body,
      src:       r.src,
      author:    r.author,
      parentId:  r.parent_id,
      starred:   r.starred,
      tags:      r.tags,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return NextResponse.json({ backlinks })
  }

  export async function POST(request: NextRequest) {
    const body = await request.json()
    const { from_id, to_id, link_kind } = body
    if (!from_id || !to_id || !link_kind) {
      return NextResponse.json({ error: 'from_id, to_id, link_kind required' }, { status: 400 })
    }

    await db.insert(itemLinks)
      .values({ fromId: from_id, toId: to_id, linkKind: link_kind })
      .onConflictDoNothing()

    return NextResponse.json({ ok: true }, { status: 201 })
  }
  ```

- [ ] **Create DELETE handler**

  Create `app/src/app/api/item-links/[id]/route.ts`:

  ```ts
  import { NextRequest, NextResponse } from 'next/server'
  import { db } from '@/lib/db/client'
  import { itemLinks } from '@/lib/db/schema'
  import { eq } from 'drizzle-orm'

  type Ctx = { params: Promise<{ id: string }> }

  export async function DELETE(_request: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    await db.delete(itemLinks).where(eq(itemLinks.id, id))
    return NextResponse.json({ ok: true })
  }
  ```

- [ ] **Run tests**

  ```bash
  cd app && npm run test:run -- src/app/api/item-links/route.test.ts
  ```

  Expected: 4 passing.

- [ ] **Commit**

  ```bash
  git add app/src/app/api/item-links/
  git commit -m "feat: item-links API routes (GET backlinks, POST, DELETE)"
  ```

---

## Task 4: Sync inline links in POST + PATCH `/api/items`

**Files:**
- Modify: `app/src/app/api/items/route.ts`
- Modify: `app/src/app/api/items/[id]/route.ts`

- [ ] **Update POST `/api/items` to sync inline links on item creation**

  In `app/src/app/api/items/route.ts`, add these imports at the top:

  ```ts
  import { itemLinks } from '@/lib/db/schema'
  import { parseLinks } from '@/lib/parseLinks'
  ```

  After `return NextResponse.json(item, { status: 201 })` — but BEFORE it — insert after the activity upsert block:

  ```ts
  // Sync inline [[uuid:Title]] links from body
  const inlineLinks = parseLinks(itemBody ?? '')
  if (inlineLinks.length > 0) {
    await db.insert(itemLinks)
      .values(inlineLinks.map(l => ({ fromId: item.id, toId: l.uuid, linkKind: 'inline' as const })))
      .onConflictDoNothing()
  }

  // For note_ref messages, create a reference link edge
  if (message?.messageKind === 'note_ref' && itemBody) {
    const toId = itemBody.split(':')[0]
    if (toId) {
      await db.insert(itemLinks)
        .values({ fromId: item.id, toId, linkKind: 'reference' as const })
        .onConflictDoNothing()
    }
  }
  ```

- [ ] **Update PATCH `/api/items/[id]` to re-sync inline links on body edit**

  In `app/src/app/api/items/[id]/route.ts`, add imports:

  ```ts
  import { itemLinks } from '@/lib/db/schema'
  import { parseLinks } from '@/lib/parseLinks'
  ```

  Change the existing import line:
  ```ts
  import { eq } from 'drizzle-orm'
  ```
  to:
  ```ts
  import { eq, and } from 'drizzle-orm'
  ```

  After the existing `if (Object.keys(itemPatch).length)` block, add:

  ```ts
  // Re-sync inline links whenever body changes
  if (itemPatch.body !== undefined) {
    await db.delete(itemLinks).where(
      and(eq(itemLinks.fromId, id), eq(itemLinks.linkKind, 'inline'))
    )
    const fresh = parseLinks(itemPatch.body)
    if (fresh.length > 0) {
      await db.insert(itemLinks)
        .values(fresh.map(l => ({ fromId: id, toId: l.uuid, linkKind: 'inline' as const })))
        .onConflictDoNothing()
    }
  }
  ```

- [ ] **Verify all existing tests still pass**

  ```bash
  cd app && npm run test:run
  ```

  Expected: All previously passing tests still pass.

- [ ] **Commit**

  ```bash
  git add app/src/app/api/items/route.ts app/src/app/api/items/[id]/route.ts
  git commit -m "feat: sync item_links on item create and body edit"
  ```

---

## Task 5: `useItemLinks` hook

**Files:**
- Create: `app/src/hooks/useItemLinks.ts`

- [ ] **Create the hook**

  ```ts
  import useSWR from 'swr'
  import type { Item } from '@/types'

  const fetcher = (url: string) =>
    fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

  export function useItemLinks(noteId: string) {
    const { data, error, isLoading, mutate } = useSWR<{ backlinks: Item[] }>(
      `/api/item-links?noteId=${noteId}`,
      fetcher,
    )

    return {
      backlinks: data?.backlinks ?? [],
      isLoading,
      error,
      mutate,
    }
  }
  ```

- [ ] **Commit**

  ```bash
  git add app/src/hooks/useItemLinks.ts
  git commit -m "feat: useItemLinks SWR hook for backlinks"
  ```

---

## Task 6: `SlashMenu` component + CSS

**Files:**
- Create: `app/src/components/note-editor/SlashMenu.tsx`
- Modify: `app/src/app/note-editor.css`

- [ ] **Create `SlashMenu.tsx`**

  ```tsx
  'use client'

  type SlashOptionId = 'link' | 'reference' | 'task' | 'quote'

  interface SlashOption {
    id: SlashOptionId
    icon: string
    label: string
    hint: string
  }

  const OPTIONS: SlashOption[] = [
    { id: 'link',      icon: '↗', label: 'Link',      hint: 'inline chip' },
    { id: 'reference', icon: '⬡', label: 'Reference',  hint: 'block' },
    { id: 'task',      icon: '☑', label: 'Task',       hint: 'task' },
    { id: 'quote',     icon: '"', label: 'Quote',      hint: 'quote' },
  ]

  interface Props {
    onSelect: (id: SlashOptionId) => void
    onDismiss: () => void
  }

  export default function SlashMenu({ onSelect, onDismiss }: Props) {
    return (
      <div className="ne-slash-menu" role="menu"
        onKeyDown={e => { if (e.key === 'Escape') onDismiss() }}>
        {OPTIONS.map(opt => (
          <button key={opt.id} className="ne-slash-opt" role="menuitem"
            onMouseDown={e => { e.preventDefault(); onSelect(opt.id) }}>
            <span className="ne-slash-icon">{opt.icon}</span>
            <span className="ne-slash-label">{opt.label}</span>
            <span className="ne-slash-hint mono">{opt.hint}</span>
          </button>
        ))}
      </div>
    )
  }
  ```

  `onMouseDown` with `e.preventDefault()` prevents the textarea from losing focus when the user clicks a menu item.

- [ ] **Add slash menu CSS to `app/src/app/note-editor.css`**

  Append:

  ```css
  /* Slash command menu */
  .ne-slash-menu {
    position: absolute; bottom: calc(100% + 4px); left: 32px;
    background: var(--panel-hi); border: 1px solid var(--border);
    border-radius: 7px; box-shadow: 0 8px 20px rgba(0,0,0,0.35);
    width: 200px; overflow: hidden; z-index: 20;
    animation: ne-slide-in 0.12s ease;
  }
  .ne-slash-opt {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 6px 10px; background: transparent; border: 0;
    text-align: left; cursor: default;
    color: var(--text-2); font: 11.5px/1 var(--font-ui);
  }
  .ne-slash-opt:hover { background: var(--panel-2); color: var(--text); }
  .ne-slash-opt:first-child { color: var(--accent); }
  .ne-slash-opt:first-child:hover { background: var(--accent-soft); }
  .ne-slash-icon { font-size: 12px; width: 16px; text-align: center; flex-shrink: 0; }
  .ne-slash-label { flex: 1; }
  .ne-slash-hint { font-size: 9.5px; color: var(--text-4); }
  ```

- [ ] **Commit**

  ```bash
  git add app/src/components/note-editor/SlashMenu.tsx app/src/app/note-editor.css
  git commit -m "feat: SlashMenu component with CSS"
  ```

---

## Task 7: `NotePicker` component + CSS

**Files:**
- Create: `app/src/components/note-editor/NotePicker.tsx`
- Modify: `app/src/app/note-editor.css`

- [ ] **Create `NotePicker.tsx`**

  ```tsx
  'use client'

  import { useState } from 'react'
  import { useItems } from '@/hooks/useItems'
  import type { Item } from '@/types'

  interface Props {
    excludeId: string
    onSelect: (note: Item) => void
    onDismiss: () => void
  }

  export default function NotePicker({ excludeId, onSelect, onDismiss }: Props) {
    const [query, setQuery] = useState('')
    const { items } = useItems({ parentId: 'null' })

    const filtered = items
      .filter(n => n.id !== excludeId)
      .filter(n => {
        if (!query) return true
        const q = query.toLowerCase()
        const searchable = (n.author ?? n.body).toLowerCase()
        return searchable.includes(q)
      })
      .slice(0, 8)

    return (
      <div className="ne-note-picker" role="listbox">
        <div className="ne-note-picker-search">
          <input
            autoFocus
            className="ne-note-picker-input"
            placeholder="Search notes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') onDismiss() }}
          />
        </div>
        {filtered.length === 0 && (
          <div className="ne-note-picker-empty">No notes found</div>
        )}
        {filtered.map(note => (
          <button key={note.id} className="ne-note-picker-row" role="option"
            onMouseDown={e => { e.preventDefault(); onSelect(note) }}>
            <span className="ne-note-picker-title">
              {note.author ?? note.body.slice(0, 60)}
            </span>
          </button>
        ))}
      </div>
    )
  }
  ```

  `useItems({ parentId: 'null' })` is already called in `page.tsx` so SWR returns the cached result — no extra network request.

- [ ] **Add note picker CSS to `app/src/app/note-editor.css`**

  Append:

  ```css
  /* Note picker dropdown */
  .ne-note-picker {
    position: absolute; bottom: calc(100% + 4px); left: 32px;
    background: var(--panel-hi); border: 1px solid var(--border);
    border-radius: 7px; box-shadow: 0 8px 20px rgba(0,0,0,0.35);
    width: 260px; overflow: hidden; z-index: 20;
    animation: ne-slide-in 0.12s ease;
  }
  .ne-note-picker-search { padding: 6px 8px; border-bottom: 1px solid var(--border-subtle); }
  .ne-note-picker-input {
    width: 100%; background: var(--bg); border: 1px solid var(--border-subtle);
    border-radius: 4px; padding: 4px 8px; font: 11.5px/1.4 var(--font-ui);
    color: var(--text); outline: none; box-sizing: border-box;
  }
  .ne-note-picker-input:focus { border-color: var(--accent-line); }
  .ne-note-picker-empty { padding: 10px 12px; font-size: 11.5px; color: var(--text-4); }
  .ne-note-picker-row {
    display: flex; align-items: center; width: 100%; padding: 7px 12px;
    background: transparent; border: 0; text-align: left; cursor: default;
  }
  .ne-note-picker-row:hover { background: var(--panel-2); }
  .ne-note-picker-title {
    font-size: 12px; color: var(--text-2);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  ```

- [ ] **Commit**

  ```bash
  git add app/src/components/note-editor/NotePicker.tsx app/src/app/note-editor.css
  git commit -m "feat: NotePicker dropdown component with CSS"
  ```

---

## Task 8: Update `Composer`

**Files:**
- Modify: `app/src/components/note-editor/Composer.tsx`

- [ ] **Replace `Composer.tsx` entirely**

  ```tsx
  'use client'

  import { useState } from 'react'
  import SlashMenu from './SlashMenu'
  import NotePicker from './NotePicker'
  import type { Item } from '@/types'

  type ComposerMode = 'normal' | 'slash' | 'notePicker-link' | 'notePicker-reference'

  interface Props {
    noteId: string
    onSend: (body: string, kind: string) => void
  }

  const KINDS = [
    { k: 'text',  label: 'msg',   glyph: '¶', placeholder: 'Reply to this thread…' },
    { k: 'task',  label: 'task',  glyph: '☐', placeholder: 'New task — what needs doing?' },
    { k: 'link',  label: 'link',  glyph: '⌘', placeholder: 'Paste a URL…' },
    { k: 'quote', label: 'quote', glyph: '"', placeholder: 'Quote a passage…' },
  ] as const
  type KindKey = typeof KINDS[number]['k']

  export default function Composer({ noteId, onSend }: Props) {
    const [body, setBody]       = useState('')
    const [kind, setKind]       = useState<KindKey>('text')
    const [mode, setMode]       = useState<ComposerMode>('normal')
    const [slashPos, setSlashPos] = useState(0)

    const send = () => {
      if (!body.trim()) return
      onSend(body.trim(), kind)
      setBody('')
      setKind('text')
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value
      setBody(val)
      const last = val[val.length - 1]
      const prev = val.length > 1 ? val[val.length - 2] : null
      if (last === '/' && (prev === null || /[\s\n]/.test(prev))) {
        setMode('slash')
        setSlashPos(val.length - 1)
      } else if (mode === 'slash') {
        setMode('normal')
      }
    }

    const handleSlashSelect = (id: 'link' | 'reference' | 'task' | 'quote') => {
      const trimmed = body.slice(0, slashPos)
      if (id === 'link') {
        setBody(trimmed)
        setMode('notePicker-link')
      } else if (id === 'reference') {
        setBody(trimmed)
        setMode('notePicker-reference')
      } else {
        setBody(trimmed)
        setKind(id)
        setMode('normal')
      }
    }

    const handleNotePick = (note: Item) => {
      const displayTitle = note.author ?? note.body.slice(0, 40)
      if (mode === 'notePicker-link') {
        setBody(b => `${b}[[${note.id}:${displayTitle}]] `)
        setMode('normal')
      } else {
        // Reference block — auto-send so the user never sees 'uuid:Title' in textarea
        onSend(`${note.id}:${displayTitle}`, 'note_ref')
        setBody('')
        setKind('text')
        setMode('normal')
      }
    }

    const handleDismiss = () => {
      setBody(b => b.slice(0, slashPos))
      setMode('normal')
    }

    const placeholder = KINDS.find(k2 => k2.k === kind)?.placeholder ?? ''

    return (
      <div className="ne-composer">
        <div className="ne-kind-row">
          {KINDS.map(({ k, label, glyph }) => (
            <button key={k} className={`ne-kind${kind === k ? ' active' : ''}`} onClick={() => setKind(k)}>
              <span className="ne-kind-g">{glyph}</span>{label}
            </button>
          ))}
          <span className="ne-fmt-hint mono">**bold** · *italic* · `code` · / commands</span>
        </div>
        <div className="ne-input-wrap" style={{ position: 'relative' }}>
          {mode === 'slash' && (
            <SlashMenu onSelect={handleSlashSelect} onDismiss={handleDismiss} />
          )}
          {(mode === 'notePicker-link' || mode === 'notePicker-reference') && (
            <NotePicker excludeId={noteId} onSelect={handleNotePick} onDismiss={handleDismiss} />
          )}
          <span className="ne-avatar me">me</span>
          <textarea
            className="ne-input"
            placeholder={placeholder}
            value={body}
            onChange={handleChange}
            rows={Math.max(1, body.split('\n').length)}
            onKeyDown={e => {
              if (e.key === 'Escape' && mode !== 'normal') { handleDismiss(); return }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
            }}
          />
          <div className="ne-input-actions">
            <button className="ne-icon-btn" title="Attach">⌇</button>
            <button className="ne-icon-btn" title="Emoji">☺</button>
            <button className={`ne-send${body.trim() ? ' ready' : ''}`} onClick={send} disabled={!body.trim()}>
              <span className="mono">⌘⏎</span> send
            </button>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Update `NoteEditor.tsx` to pass `noteId` to Composer**

  In `app/src/components/note-editor/NoteEditor.tsx`, change:
  ```tsx
  <Composer onSend={send} />
  ```
  to:
  ```tsx
  <Composer onSend={send} noteId={note.id} />
  ```

- [ ] **Run all tests**

  ```bash
  cd app && npm run test:run
  ```

  Expected: all passing.

- [ ] **Commit**

  ```bash
  git add app/src/components/note-editor/Composer.tsx app/src/components/note-editor/NoteEditor.tsx
  git commit -m "feat: Composer slash command integration (SlashMenu + NotePicker)"
  ```

---

## Task 9: Update `MessageContent` + CSS

**Files:**
- Modify: `app/src/components/note-editor/MessageContent.tsx`
- Modify: `app/src/components/note-editor/Message.tsx`
- Modify: `app/src/app/note-editor.css`

- [ ] **Update `MessageContent.tsx`**

  Replace the entire file:

  ```tsx
  import type { ItemMessage } from '@/types'

  interface Props {
    body: string
    message?: ItemMessage
    onToggleTask?: () => void
    onLinkClick?: (noteId: string) => void
  }

  /** Light inline markdown + [[uuid:Title]] note chips */
  function fmt(text: string, onLinkClick?: (id: string) => void): React.ReactNode[] {
    const out: React.ReactNode[] = []
    const re = /(\[\[[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[^\]]*\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@\w+|#\w+|https?:\/\/\S+)/g
    let last = 0; let m; let key = 0
    while ((m = re.exec(text))) {
      if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>)
      const tok = m[0]
      if (tok.startsWith('[[')) {
        const inner = tok.slice(2, -2)
        const colon = inner.indexOf(':')
        const uuid  = colon >= 0 ? inner.slice(0, colon) : ''
        const title = colon >= 0 ? inner.slice(colon + 1) : inner
        out.push(
          <button key={key++} className="ne-note-chip"
            onClick={() => uuid && onLinkClick?.(uuid)}>
            ↗ {title || 'untitled'}
          </button>
        )
      } else if (tok.startsWith('**'))   out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
      else if (tok.startsWith('*'))    out.push(<em key={key++}>{tok.slice(1, -1)}</em>)
      else if (tok.startsWith('`'))    out.push(<code key={key++} className="ne-code-inline">{tok.slice(1, -1)}</code>)
      else if (tok.startsWith('@'))    out.push(<span key={key++} className="ne-mention">{tok}</span>)
      else if (tok.startsWith('#'))    out.push(<span key={key++} className="ne-hashtag">{tok}</span>)
      else if (tok.startsWith('http')) out.push(<a key={key++} className="ne-link" onClick={e => e.preventDefault()} href={tok}>{tok}</a>)
      last = m.index + tok.length
    }
    if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>)
    return out
  }

  export default function MessageContent({ body, message, onToggleTask, onLinkClick }: Props) {
    const kind = message?.messageKind

    if (kind === 'note_ref') {
      const colon = body.indexOf(':')
      const uuid  = colon >= 0 ? body.slice(0, colon) : ''
      const title = colon >= 0 ? body.slice(colon + 1) : body
      return (
        <div className="ne-note-ref" onClick={() => uuid && onLinkClick?.(uuid)}>
          <div className="ne-note-ref-label mono">LINKED NOTE</div>
          <div className="ne-note-ref-title">↗ {title || 'untitled'}</div>
        </div>
      )
    }

    if (kind === 'task') {
      return (
        <div className="ne-task">
          <button onClick={onToggleTask} className={`ne-task-box${message?.done ? ' done' : ''}`}>
            {message?.done ? '✓' : ''}
          </button>
          <span className={`ne-task-text${message?.done ? ' done' : ''}`}>{fmt(body, onLinkClick)}</span>
        </div>
      )
    }

    if (kind === 'link' && message?.linkMeta) {
      return (
        <div>
          <a className="ne-link" href={body} onClick={e => e.preventDefault()}>{body}</a>
          <div className="ne-link-card">
            <div className="ne-link-card-site mono">{message.linkMeta.site}</div>
            <div className="ne-link-card-title">{message.linkMeta.title}</div>
            <div className="ne-link-card-desc">{message.linkMeta.desc}</div>
          </div>
        </div>
      )
    }

    if (kind === 'link')  return <a className="ne-link" href={body} onClick={e => e.preventDefault()}>{body}</a>
    if (kind === 'quote') return <blockquote className="ne-quote">{fmt(body, onLinkClick)}</blockquote>

    return <div className="ne-text">{fmt(body, onLinkClick)}</div>
  }
  ```

- [ ] **Add `onLinkClick` to `Message.tsx`**

  In `app/src/components/note-editor/Message.tsx`, add to the `Props` interface:

  ```tsx
  onLinkClick?: (noteId: string) => void
  ```

  And add it to the destructured props:

  ```tsx
  export default function Message({ item, rootSrc, rootAuthor, grouped, onToggleTask, onUpdate, onDelete, onReact, onLinkClick }: Props) {
  ```

  Pass it through to `MessageContent` — change the existing `<MessageContent ...>` call:

  ```tsx
  <MessageContent body={item.body} message={msg ?? undefined} onToggleTask={onToggleTask} onLinkClick={onLinkClick} />
  ```

- [ ] **Add note chip + reference block CSS to `app/src/app/note-editor.css`**

  Append:

  ```css
  /* Inline note link chip */
  .ne-note-chip {
    display: inline-flex; align-items: center; gap: 3px;
    background: var(--accent-soft); border: 1px solid var(--accent-line);
    border-radius: 4px; padding: 1px 6px;
    font: 11px/1.4 var(--font-ui); color: var(--accent);
    cursor: default; vertical-align: middle; margin: 0 2px;
  }
  .ne-note-chip:hover { filter: brightness(1.1); }

  /* Reference block */
  .ne-note-ref {
    background: var(--panel-2); border: 1px solid var(--border-subtle);
    border-left: 2px solid var(--accent); border-radius: 0 5px 5px 0;
    padding: 8px 10px; cursor: default; margin: 2px 0;
  }
  .ne-note-ref:hover { background: var(--panel-hi); }
  .ne-note-ref-label { font-size: 9.5px; color: var(--text-4); letter-spacing: 0.06em; margin-bottom: 3px; }
  .ne-note-ref-title { font-size: 12.5px; font-weight: 600; color: var(--accent); }
  ```

- [ ] **Run all tests**

  ```bash
  cd app && npm run test:run
  ```

  Expected: all passing.

- [ ] **Commit**

  ```bash
  git add app/src/components/note-editor/MessageContent.tsx app/src/components/note-editor/Message.tsx app/src/app/note-editor.css
  git commit -m "feat: inline note chip and reference block rendering in MessageContent"
  ```

---

## Task 10: Update `NoteEditor` — backlinks panel + `onLinkClick`

**Files:**
- Modify: `app/src/components/note-editor/NoteEditor.tsx`
- Modify: `app/src/app/note-editor.css`

- [ ] **Update `NoteEditor.tsx`**

  Add imports at the top (after existing imports):

  ```tsx
  import { useItemLinks } from '@/hooks/useItemLinks'
  import { useAppStore } from '@/store/app'
  import { relativeTime } from '@/lib/utils'
  ```

  Inside the component, after the existing `const { open: openMenu } = useContextMenu()` line, add:

  ```tsx
  const setOpenNote  = useAppStore(s => s.setOpenNoteId)
  const { backlinks } = useItemLinks(note.id)
  ```

  In the `allItems.map(...)` block, update every `<Message>` call to add `onLinkClick`:

  ```tsx
  <Message key={item.id} item={item}
    rootSrc={note.src} rootAuthor={note.author}
    grouped={grouped}
    onToggleTask={() => {
      if (item.id === note.id) onUpdate({ ...note, message: { ...note.message!, done: !note.message?.done } })
      else updateItem(item.id, { message: { ...item.message!, done: !item.message?.done } } as Partial<Item>)
    }}
    onUpdate={patch => {
      if (item.id === note.id) onUpdate({ ...note, ...patch })
      else updateItem(item.id, patch)
    }}
    onDelete={() => { if (item.id !== note.id) deleteItem(item.id) }}
    onReact={() => {}}
    onLinkClick={noteId => setOpenNote(noteId)}
  />
  ```

  After the closing `</div>` of `ne-stream` and before `<Composer ...>`, add the backlinks panel:

  ```tsx
  {backlinks.length > 0 && (
    <div className="ne-backlinks">
      <div className="ne-backlinks-header mono">
        <span>LINKED FROM</span>
        <span className="ne-backlinks-count">{backlinks.length}</span>
      </div>
      {backlinks.map(bl => (
        <button key={bl.id} className="ne-backlinks-row"
          onClick={() => setOpenNote(bl.id)}>
          <span className="ne-backlinks-arrow">↗</span>
          <span className="ne-backlinks-title">
            {bl.author ?? bl.body.slice(0, 50)}
          </span>
          <span className="ne-backlinks-age mono">
            {relativeTime(new Date(bl.createdAt))}
          </span>
        </button>
      ))}
    </div>
  )}
  ```

- [ ] **Add backlinks panel CSS to `app/src/app/note-editor.css`**

  Append:

  ```css
  /* Backlinks panel */
  .ne-backlinks { flex-shrink: 0; border-top: 1px solid var(--border-subtle); background: var(--bg); }
  .ne-backlinks-header {
    display: flex; align-items: center; gap: 8px; padding: 5px 12px 4px;
    font-size: 9.5px; color: var(--text-4); letter-spacing: 0.06em;
    border-bottom: 1px solid var(--border-subtle);
  }
  .ne-backlinks-count {
    background: var(--accent-soft); color: var(--accent);
    padding: 1px 5px; border-radius: 9px;
  }
  .ne-backlinks-row {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 5px 12px; background: transparent; border: 0; text-align: left; cursor: default;
  }
  .ne-backlinks-row:hover { background: var(--panel-2); }
  .ne-backlinks-arrow { color: var(--accent); font-size: 11px; flex-shrink: 0; }
  .ne-backlinks-title {
    font-size: 11.5px; color: var(--text-2); flex: 1;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ne-backlinks-age { font-size: 9.5px; color: var(--text-4); flex-shrink: 0; }
  ```

- [ ] **Run all tests**

  ```bash
  cd app && npm run test:run
  ```

  Expected: all passing.

- [ ] **Start the dev server and manually verify the full flow**

  ```bash
  cd app && npm run dev:next
  ```

  Check:
  1. Open a note → Composer shows `/ commands` hint text in the fmt hint area.
  2. Type `/` in the composer → SlashMenu appears with Link, Reference, Task, Quote.
  3. Select **Link** → NotePicker appears, type a partial note title, click a result → `[[uuid:Title]]` token inserted into textarea, renders as amber chip on send.
  4. Type `/` again → select **Reference** → NotePicker → select note → reference block card auto-sends and appears in stream.
  5. Open the target note → LINKED FROM panel appears at bottom with the source note listed.
  6. Click a backlink row → opens that note in the NoteEditor.
  7. Click an inline chip → opens the linked note.

- [ ] **Commit**

  ```bash
  git add app/src/components/note-editor/NoteEditor.tsx app/src/app/note-editor.css
  git commit -m "feat: backlinks panel and onLinkClick in NoteEditor — Phase C complete"
  ```

---

## Self-review checklist

- [x] Schema: `item_links` table with cascade deletes and UNIQUE(from_id, to_id) — Task 1
- [x] `[[uuid:Title]]` body encoding — parseLinks utility Task 2, fmt() Task 9
- [x] Backlinks panel (LINKED FROM, only when links exist) — Task 10
- [x] Link via `/` slash command → both inline and reference — Tasks 6, 7, 8
- [x] `from_id` = specific message item (not root) — Tasks 3, 4
- [x] Backlinks query joins through parent_id to resolve root notes — Task 3
- [x] Re-sync on PATCH body edit — Task 4
- [x] Cascade cleanup when either note deleted — Task 1 (schema)
- [x] Self-link prevention — NotePicker excludes current noteId — Task 7
- [x] Deleted note chip renders gracefully — fmt() renders uuid as title fallback — Task 9
