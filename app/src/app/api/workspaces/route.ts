import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { workspaces } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  const ws = await db.select().from(workspaces).orderBy(asc(workspaces.name))
  return NextResponse.json({ workspaces: ws })
}

export async function POST(request: NextRequest) {
  const { name } = await request.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }
  const [ws] = await db
    .insert(workspaces)
    .values({ name: name.trim(), layout: [] })
    .returning()
  return NextResponse.json(ws, { status: 201 })
}
