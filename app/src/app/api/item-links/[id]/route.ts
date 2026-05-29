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
