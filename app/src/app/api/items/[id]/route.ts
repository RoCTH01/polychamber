import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { items, itemReminder, itemFunnel, itemFocus, itemMessage, itemLinks } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { parseLinks } from '@/lib/parseLinks'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const body = await request.json()
  const { reminder, funnel, focus, message, ...itemPatch } = body

  if (Object.keys(itemPatch).length) {
    await db.update(items).set({ ...itemPatch, updatedAt: new Date() }).where(eq(items.id, id))
  }

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

  if (reminder) await db.update(itemReminder).set(reminder).where(eq(itemReminder.itemId, id))
  if (funnel) {
    await db.insert(itemFunnel)
      .values({ itemId: id, mediaKind: funnel.mediaKind ?? 'article', source: funnel.source ?? 'me', est: funnel.est ?? '', queueTag: funnel.queueTag ?? 'later' })
      .onConflictDoUpdate({ target: itemFunnel.itemId, set: { mediaKind: funnel.mediaKind ?? 'article', source: funnel.source ?? 'me', est: funnel.est ?? '', queueTag: funnel.queueTag ?? 'later' } })
  }
  if (focus)    await db.update(itemFocus).set(focus).where(eq(itemFocus.itemId, id))
  if (message)  await db.update(itemMessage).set(message).where(eq(itemMessage.itemId, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  await db.delete(items).where(eq(items.id, id)) // cascades to extension tables
  return NextResponse.json({ ok: true })
}
