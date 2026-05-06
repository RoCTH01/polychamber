import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { items, itemReminder, itemFunnel, itemFocus, itemMessage } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const body = await request.json()
  const { reminder, funnel, focus, message, ...itemPatch } = body

  if (Object.keys(itemPatch).length) {
    await db.update(items).set(itemPatch).where(eq(items.id, id))
  }
  if (reminder) await db.update(itemReminder).set(reminder).where(eq(itemReminder.itemId, id))
  if (funnel)   await db.update(itemFunnel).set(funnel).where(eq(itemFunnel.itemId, id))
  if (focus)    await db.update(itemFocus).set(focus).where(eq(itemFocus.itemId, id))
  if (message)  await db.update(itemMessage).set(message).where(eq(itemMessage.itemId, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  await db.delete(items).where(eq(items.id, id)) // cascades to extension tables
  return NextResponse.json({ ok: true })
}
