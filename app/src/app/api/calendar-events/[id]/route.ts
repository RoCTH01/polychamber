import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { calendarEvents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { linkedNoteId } = await request.json()
  await db.update(calendarEvents)
    .set({ linkedNoteId: linkedNoteId ?? null })
    .where(eq(calendarEvents.id, id))
  return NextResponse.json({ ok: true })
}
