import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { workspaces } from '@/lib/db/schema'
import { asc } from 'drizzle-orm'

export async function GET() {
  const ws = await db.select().from(workspaces).orderBy(asc(workspaces.name))
  return NextResponse.json({ workspaces: ws })
}
