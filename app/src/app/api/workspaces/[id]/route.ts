import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { workspaces } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  const { layout } = await request.json()
  await db.update(workspaces).set({ layout }).where(eq(workspaces.id, id))
  return NextResponse.json({ ok: true })
}
