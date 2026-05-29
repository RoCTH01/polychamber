# Phase A — Unified Content Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Funnel a universal review queue for any item, add Me/New tabs to the Feed, and wire the `+` Capture button to a fast-entry modal.

**Architecture:** Three independent improvements that share a common theme — removing the silos between item kinds. The API gains two new filter params (`hasFunnel`, `noSrc`) and the Funnel's PATCH route becomes an upsert. The Capture modal is a new component wired into the existing store/page pattern.

**Tech Stack:** Next.js App Router, Drizzle ORM (postgres-js), SWR, Zustand, React, TypeScript

---

## File Map

| File | Action | What changes |
|---|---|---|
| `app/src/app/api/items/route.ts` | Modify | Add `hasFunnel` + `noSrc` GET params; loosen POST funnel gate (already done) |
| `app/src/app/api/items/[id]/route.ts` | Modify | PATCH funnel becomes an upsert (insert-or-update) |
| `app/src/hooks/useItems.ts` | Modify | Expose `hasFunnel` and `noSrc` params |
| `app/src/components/widgets/FunnelWidget.tsx` | Modify | Query `hasFunnel: true` instead of `kind: 'funnel_item'` |
| `app/src/components/widgets/FeedWidget.tsx` | Modify | Add Me/New tabs; add queue actions to context menu |
| `app/src/components/note-editor/NoteEditor.tsx` | Modify | Add queue actions to root-note header context menu |
| `app/src/store/app.ts` | Modify | Add `captureOpen` boolean + setter |
| `app/src/components/ui/CaptureModal.tsx` | Create | New fast-entry modal component |
| `app/src/components/layout/Toolbar.tsx` | Modify | Wire `+` Capture button to open modal |
| `app/src/app/page.tsx` | Modify | Render `<CaptureModal>` when `captureOpen` |

---

## Task 1 — API: `hasFunnel` + `noSrc` GET params + PATCH funnel upsert

**Files:**
- Modify: `app/src/app/api/items/route.ts`
- Modify: `app/src/app/api/items/[id]/route.ts`

- [ ] **Step 1: Add `hasFunnel` and `noSrc` to the GET route**

Replace the GET function in `app/src/app/api/items/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { items, itemReminder, itemFunnel, itemFocus, itemMessage } from '@/lib/db/schema'
import { eq, isNull, isNotNull, desc, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const kind      = sp.get('kind')
  const src       = sp.get('src')
  const parentId  = sp.get('parentId')
  const hasFunnel = sp.get('hasFunnel') === 'true'
  const noSrc     = sp.get('noSrc') === 'true'
  const limit     = Math.min(parseInt(sp.get('limit') ?? '100'), 500)
  const offset    = parseInt(sp.get('offset') ?? '0')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conditions: any[] = []
  if (kind) conditions.push(eq(items.kind, kind))
  if (src)  conditions.push(eq(items.src, src))
  if (sp.has('parentId')) {
    conditions.push(parentId === 'null' ? isNull(items.parentId) : eq(items.parentId, parentId!))
  }
  if (hasFunnel) conditions.push(isNotNull(itemFunnel.itemId))
  if (noSrc)     conditions.push(isNull(items.src))

  const rows = await db
    .select()
    .from(items)
    .leftJoin(itemReminder, eq(items.id, itemReminder.itemId))
    .leftJoin(itemFunnel,   eq(items.id, itemFunnel.itemId))
    .leftJoin(itemFocus,    eq(items.id, itemFocus.itemId))
    .leftJoin(itemMessage,  eq(items.id, itemMessage.itemId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(items.createdAt))
    .limit(limit)
    .offset(offset)

  const result = rows.map(({ items: item, item_reminder, item_funnel, item_focus, item_message }) => ({
    ...item,
    reminder: item_reminder ?? undefined,
    funnel:   item_funnel   ?? undefined,
    focus:    item_focus    ?? undefined,
    message:  item_message  ?? undefined,
  }))

  return NextResponse.json({ items: result })
}
```

- [ ] **Step 2: Fix PATCH to upsert the funnel extension**

In `app/src/app/api/items/[id]/route.ts`, change the funnel update line from:

```typescript
if (funnel)   await db.update(itemFunnel).set(funnel).where(eq(itemFunnel.itemId, id))
```

to:

```typescript
if (funnel) {
  await db.insert(itemFunnel)
    .values({ itemId: id, mediaKind: funnel.mediaKind ?? 'article', source: funnel.source ?? 'me', est: funnel.est ?? '', queueTag: funnel.queueTag })
    .onConflictDoUpdate({ target: itemFunnel.itemId, set: { mediaKind: funnel.mediaKind ?? 'article', source: funnel.source ?? 'me', est: funnel.est ?? '', queueTag: funnel.queueTag } })
}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/app/api/items/route.ts app/src/app/api/items/\[id\]/route.ts
git commit -m "feat: add hasFunnel/noSrc API params; upsert funnel on PATCH"
```

---

## Task 2 — Hook: expose `hasFunnel` and `noSrc` in `useItems`

**Files:**
- Modify: `app/src/hooks/useItems.ts`

- [ ] **Step 1: Add params to the interface and URL builder**

Replace the `UseItemsParams` interface and the `sp` builder section:

```typescript
interface UseItemsParams {
  kind?: string
  src?: string
  parentId?: string | 'null'
  limit?: number
  offset?: number
  hasFunnel?: boolean
  noSrc?: boolean
}

// inside useItems(), in the sp builder:
  const sp = new URLSearchParams()
  if (params?.kind)                  sp.set('kind', params.kind)
  if (params?.src)                   sp.set('src', params.src)
  if (params?.parentId !== undefined) sp.set('parentId', params.parentId)
  if (params?.limit)                 sp.set('limit', String(params.limit))
  if (params?.offset)                sp.set('offset', String(params.offset))
  if (params?.hasFunnel)             sp.set('hasFunnel', 'true')
  if (params?.noSrc)                 sp.set('noSrc', 'true')
```

- [ ] **Step 2: Commit**

```bash
git add app/src/hooks/useItems.ts
git commit -m "feat: expose hasFunnel and noSrc params in useItems"
```

---

## Task 3 — Funnel widget: query all queued items regardless of kind

**Files:**
- Modify: `app/src/components/widgets/FunnelWidget.tsx`

- [ ] **Step 1: Change the data query**

In `FunnelWidget.tsx`, find the line:

```typescript
const { items, updateItem, deleteItem, mutate } = useItems({ kind: 'funnel_item' })
```

Change it to:

```typescript
const { items, updateItem, deleteItem, mutate } = useItems({ hasFunnel: true })
```

- [ ] **Step 2: Update the meta count label**

The `meta` prop currently says `${items.length} queued` — this is still accurate, no change needed.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/widgets/FunnelWidget.tsx
git commit -m "feat: funnel queries all queued items via hasFunnel param"
```

---

## Task 4 — Feed widget: Me/New tabs + queue context menu

**Files:**
- Modify: `app/src/components/widgets/FeedWidget.tsx`

- [ ] **Step 1: Replace the full FeedWidget component**

```typescript
'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import { useAppStore } from '@/store/app'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { SRC_LABEL } from '@/types'
import type { Item, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void }

const SOURCES = ['All', 'Me', 'New', 'TW', 'DC', 'OB', 'MN', 'RD']

export default function FeedWidget({ id, dragHandlers, onClose }: Props) {
  const [src, setSrc] = useState('All')
  const openNoteId  = useAppStore(s => s.openNoteId)
  const setOpenNote = useAppStore(s => s.setOpenNoteId)
  const { open: openMenu } = useContextMenu()

  const { items, updateItem, deleteItem, mutate } = useItems({ parentId: 'null' })

  const filtered = (() => {
    if (src === 'Me')  return items.filter(n => n.src === null)
    if (src === 'New') return items.filter(n => !n.starred && n.tags.length === 0)
    if (src === 'All') return items
    return items.filter(n => n.src && SRC_LABEL[n.src] === src)
  })()

  const queueItem = async (note: Item, queueTag: 'next' | 'soon' | 'later') => {
    await updateItem(note.id, {
      funnel: { mediaKind: 'article', source: note.src ?? 'me', est: '', queueTag },
    } as Partial<Item>)
  }

  const handleContextMenu = (e: React.MouseEvent, note: Item) => {
    const alreadyQueued = !!note.funnel
    openMenu(e, [
      { label: 'Open',              action: () => setOpenNote(note.id) },
      { divider: true },
      { label: note.starred ? 'Unstar' : 'Star', checked: note.starred, action: () => updateItem(note.id, { starred: !note.starred }) },
      { label: 'Copy text',         action: () => navigator.clipboard.writeText(note.body) },
      { divider: true },
      { label: alreadyQueued ? 'Move to Next'  : 'Queue: Next',  action: () => queueItem(note, 'next') },
      { label: alreadyQueued ? 'Move to Soon'  : 'Queue: Soon',  action: () => queueItem(note, 'soon') },
      { label: alreadyQueued ? 'Move to Later' : 'Queue: Later', action: () => queueItem(note, 'later') },
      { divider: true },
      { label: 'Delete',            danger: true, action: () => deleteItem(note.id) },
    ])
  }

  return (
    <WidgetShell id={id} title="Feed" meta={`${filtered.length} entries · live`}
      tabs={SOURCES} tab={src} onTab={setSrc}
      dragHandlers={dragHandlers} onClose={onClose} onRefresh={mutate} noPad>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((n, i) => (
          <NoteRow key={n.id} note={n} first={i === 0}
            active={openNoteId === n.id}
            onClick={() => setOpenNote(openNoteId === n.id ? null : n.id)}
            onContextMenu={e => handleContextMenu(e, n)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '24px var(--pad)', textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
            nothing here
          </div>
        )}
      </div>
    </WidgetShell>
  )
}

function NoteRow({ note, first, active, onClick, onContextMenu }: { note: Item; first: boolean; active: boolean; onClick: () => void; onContextMenu: (e: React.MouseEvent) => void }) {
  return (
    <div className={`feed-row${active ? ' active' : ''}`} style={{
      padding: 'calc(var(--pad) * 0.85) var(--pad)',
      borderTop: first ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }} onClick={onClick} onContextMenu={onContextMenu}>
      <div className="row gap-8">
        {note.src && <span className={`src-icon src-${note.src}`}>{SRC_LABEL[note.src]}</span>}
        {!note.src && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.07em', color: 'var(--text-4)', background: 'var(--panel-hi)', border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '1px 4px', flexShrink: 0 }}>ME</span>}
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontWeight: 500 }}>{note.author}</span>
        <span className="tab muted-2" style={{ fontSize: 'var(--fs-xs)', marginLeft: 'auto', fontFamily: 'var(--font-mono)' }}>
          {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        {note.starred && <span style={{ color: 'var(--accent)', fontSize: 11 }}>★</span>}
        {note.funnel && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--accent)', opacity: 0.7 }}>{note.funnel.queueTag}</span>}
      </div>
      <div className="feed-body" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.55, textWrap: 'pretty' } as React.CSSProperties}>
        {note.body}
      </div>
      {note.tags.length > 0 && (
        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          {note.tags.map(t => (
            <span key={t} className="chip">{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/widgets/FeedWidget.tsx
git commit -m "feat: feed Me/New tabs + queue context menu actions"
```

---

## Task 5 — NoteEditor: queue actions on root note header

**Files:**
- Modify: `app/src/components/note-editor/NoteEditor.tsx`

- [ ] **Step 1: Find the header/title area in NoteEditor.tsx**

Search for the element that renders the note title (the `note.body` preview or the note header section). Look for something like `<h2>` or `className="note-title"` or `note.body` in the JSX return.

- [ ] **Step 2: Add `useContextMenu` import and queue handler**

At the top of NoteEditor, add:
```typescript
import { useContextMenu } from '@/components/ui/ContextMenu'
```

Inside the component body, add:
```typescript
const { open: openMenu } = useContextMenu()
const { updateItem: updateRootItem } = useItems()

const queueNote = async (queueTag: 'next' | 'soon' | 'later') => {
  await updateRootItem(note.id, {
    funnel: { mediaKind: 'article', source: note.src ?? 'me', est: '', queueTag },
  } as Partial<Item>)
}

const handleHeaderContextMenu = (e: React.MouseEvent) => {
  const alreadyQueued = !!note.funnel
  openMenu(e, [
    { label: alreadyQueued ? 'Move to Next'  : 'Queue: Next',  action: () => queueNote('next') },
    { label: alreadyQueued ? 'Move to Soon'  : 'Queue: Soon',  action: () => queueNote('soon') },
    { label: alreadyQueued ? 'Move to Later' : 'Queue: Later', action: () => queueNote('later') },
  ])
}
```

- [ ] **Step 3: Add `onContextMenu` to the note header element**

Find the outermost header container in the NoteEditor JSX return (the `div` or section that contains the note title/author info) and add:
```tsx
onContextMenu={handleHeaderContextMenu}
```

- [ ] **Step 4: Commit**

```bash
git add app/src/components/note-editor/NoteEditor.tsx
git commit -m "feat: right-click note header to queue in funnel"
```

---

## Task 6 — Store: add `captureOpen` flag

**Files:**
- Modify: `app/src/store/app.ts`

- [ ] **Step 1: Add `captureOpen` to the interface and initial state**

In `AppState`, add:
```typescript
captureOpen: boolean
setCaptureOpen: (v: boolean) => void
```

In the `create<AppState>` call, add to the initial state:
```typescript
captureOpen: false,
```

And the setter:
```typescript
setCaptureOpen: (captureOpen) => set({ captureOpen }),
```

- [ ] **Step 2: Commit**

```bash
git add app/src/store/app.ts
git commit -m "feat: add captureOpen flag to store"
```

---

## Task 7 — CaptureModal component

**Files:**
- Create: `app/src/components/ui/CaptureModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/app'
import { useItems } from '@/hooks/useItems'
import type { Item } from '@/types'

type QueueTag = 'next' | 'soon' | 'later'

export default function CaptureModal() {
  const setCaptureOpen = useAppStore(s => s.setCaptureOpen)
  const [body, setBody]     = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags]     = useState<string[]>([])
  const [queue, setQueue]   = useState<QueueTag | null>(null)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  const { createItem } = useItems()

  useEffect(() => { textareaRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCaptureOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCaptureOpen])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t))

  const handleSubmit = async () => {
    if (!body.trim() || loading) return
    setLoading(true)
    try {
      const payload: Parameters<typeof createItem>[0] = {
        kind: 'note',
        body: body.trim(),
        tags,
      }
      if (queue) {
        (payload as Partial<Item> & { kind: string; body: string }).funnel = {
          mediaKind: 'article',
          source: 'me',
          est: '',
          queueTag: queue,
        } as Item['funnel']
      }
      await createItem(payload)
      setCaptureOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const QUEUE_OPTS: { value: QueueTag; label: string }[] = [
    { value: 'next',  label: 'Next' },
    { value: 'soon',  label: 'Soon' },
    { value: 'later', label: 'Later' },
  ]

  return (
    <div
      className="modal-backdrop"
      ref={backdropRef}
      onClick={e => { if (e.target === backdropRef.current) setCaptureOpen(false) }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick capture"
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 16,
          width: 480,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Body input */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
          placeholder="Capture a thought, paste a URL…"
          rows={3}
          style={{
            width: '100%', padding: '8px 10px',
            background: 'var(--panel-hi)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text)',
            fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
            lineHeight: 1.55, resize: 'none', outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Tag chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {tags.map(t => (
            <span key={t} className="chip" style={{ cursor: 'pointer' }} onClick={() => removeTag(t)}>
              {t} ✕
            </span>
          ))}
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
              if (e.key === 'Backspace' && !tagInput && tags.length) removeTag(tags[tags.length - 1])
            }}
            placeholder="add tag…"
            style={{
              height: 22, padding: '0 6px', border: '1px solid var(--border-subtle)',
              background: 'transparent', borderRadius: 11,
              color: 'var(--text-3)', fontFamily: 'var(--font-ui)',
              fontSize: 'var(--fs-xs)', outline: 'none', minWidth: 60,
            }}
          />
        </div>

        {/* Queue + submit row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>Queue:</span>
          {QUEUE_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setQueue(q => q === opt.value ? null : opt.value)}
              style={{
                height: 24, padding: '0 10px',
                background: queue === opt.value ? 'var(--accent)' : 'var(--panel-hi)',
                color: queue === opt.value ? 'var(--bg)' : 'var(--text-3)',
                border: `1px solid ${queue === opt.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
                borderRadius: 4, fontFamily: 'var(--font-ui)',
                fontSize: 'var(--fs-xs)', cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || loading}
            style={{
              marginLeft: 'auto', height: 28, padding: '0 16px',
              background: body.trim() ? 'var(--accent)' : 'var(--panel-hi)',
              color: body.trim() ? 'var(--bg)' : 'var(--text-4)',
              border: 'none', borderRadius: 4,
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)',
              cursor: body.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Saving…' : 'Capture'}
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)' }}>
          Enter to save · Shift+Enter for newline · Esc to close
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/src/components/ui/CaptureModal.tsx
git commit -m "feat: CaptureModal — body, tags, optional queue bucket"
```

---

## Task 8 — Wire `+` button and render modal

**Files:**
- Modify: `app/src/components/layout/Toolbar.tsx`
- Modify: `app/src/app/page.tsx`

- [ ] **Step 1: Wire the Capture button in Toolbar**

In `Toolbar.tsx`, find:
```typescript
<button className="tb-btn tb-btn-capture"><Icon name="plus" /><span className="tb-label"> Capture</span></button>
```

Replace with:
```typescript
<button className="tb-btn tb-btn-capture" onClick={() => setCaptureOpen(true)}>
  <Icon name="plus" /><span className="tb-label"> Capture</span>
</button>
```

Add the store hook at the top of the `Toolbar` component body:
```typescript
const setCaptureOpen = useAppStore(s => s.setCaptureOpen)
```

- [ ] **Step 2: Render CaptureModal in page.tsx**

Add the import at the top of `app/src/app/page.tsx`:
```typescript
import CaptureModal from '@/components/ui/CaptureModal'
```

Add the store selector alongside the existing ones:
```typescript
const captureOpen = useAppStore(s => s.captureOpen)
const setCaptureOpen = useAppStore(s => s.setCaptureOpen)
```

Add the modal render before `{settingsOpen && <SettingsModal />}`:
```tsx
{captureOpen && <CaptureModal />}
```

- [ ] **Step 3: Commit**

```bash
git add app/src/components/layout/Toolbar.tsx app/src/app/page.tsx
git commit -m "feat: wire + Capture button to CaptureModal"
```

---

## Verification

- [ ] Open the app. Click `+` Capture — modal appears, focus lands in textarea.
- [ ] Type a thought, press Enter — modal closes, item appears in Feed under "Me" tab.
- [ ] Open modal again, type text, click "Next" queue button, press Enter. Item appears in both Feed and Funnel widget under "Next" tab.
- [ ] Right-click a Feed row → context menu shows Queue: Next / Queue: Soon / Queue: Later.
- [ ] Right-click a queued Feed row → shows "Move to Next" etc. instead.
- [ ] Feed "New" tab shows only untagged, unstarred items.
- [ ] Feed "Me" tab shows only items with no src.
- [ ] Funnel widget shows queued items of any kind (not just old funnel_item kind).
