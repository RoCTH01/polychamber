import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { items } from '@/lib/db/schema'
import { and, gte, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const sp   = request.nextUrl.searchParams
  const tag  = sp.get('tag')
  const rawDays = parseInt(sp.get('days') ?? '')
  const days = Math.min(isNaN(rawDays) ? 90 : rawDays, 365)

  if (!tag) return NextResponse.json({ error: 'tag required' }, { status: 400 })

  const since = new Date()
  since.setDate(since.getDate() - days)

  const rows = await db
    .select({
      date:  sql<string>`DATE(${items.createdAt} AT TIME ZONE 'UTC')`.as('date'),
      count: sql<number>`COUNT(*)::int`.as('count'),
    })
    .from(items)
    .where(and(
      sql`${tag} = ANY(${items.tags})`,
      gte(items.createdAt, since),
    ))
    .groupBy(sql`DATE(${items.createdAt} AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(${items.createdAt} AT TIME ZONE 'UTC') DESC`)

  return NextResponse.json({ activity: rows })
}
