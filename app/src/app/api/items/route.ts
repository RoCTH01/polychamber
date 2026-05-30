import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { items, itemReminder, itemFunnel, itemFocus, itemMessage, itemLinks } from '@/lib/db/schema'
import { eq, isNull, isNotNull, desc, and, sql } from 'drizzle-orm'
import { parseLinks } from '@/lib/parseLinks'

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

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { kind, body: itemBody, src, author, parentId, starred, tags, reminder, funnel, focus, message } = body

  const [item] = await db.insert(items).values({
    kind,
    body: itemBody,
    src:      src      ?? null,
    author:   author   ?? null,
    parentId: parentId ?? null,
    starred:  starred  ?? false,
    tags:     tags     ?? [],
  }).returning()

  if (kind === 'reminder' && reminder) {
    await db.insert(itemReminder).values({ itemId: item.id, ...reminder })
  }
  if (funnel) {
    await db.insert(itemFunnel).values({ itemId: item.id, ...funnel })
  }
  if (kind === 'focus_session' && focus) {
    await db.insert(itemFocus).values({ itemId: item.id, ...focus })
  }
  if (message) {
    await db.insert(itemMessage).values({ itemId: item.id, ...message })
  }

  // Upsert today's activity count
  const today = new Date().toISOString().split('T')[0]
  const srcKey = src ?? 'manual'
  await db.execute(sql`
    INSERT INTO activity (date, count, source_breakdown)
    VALUES (${today}, 1, ${JSON.stringify({ [srcKey]: 1 })}::jsonb)
    ON CONFLICT (date) DO UPDATE SET
      count            = activity.count + 1,
      source_breakdown = activity.source_breakdown || ${JSON.stringify({ [srcKey]: 1 })}::jsonb
  `)

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
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    if (toId && UUID_RE.test(toId)) {
      await db.insert(itemLinks)
        .values({ fromId: item.id, toId, linkKind: 'reference' as const })
        .onConflictDoNothing()
    }
  }

  return NextResponse.json(item, { status: 201 })
}
