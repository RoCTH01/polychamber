import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { activity } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const days = Math.min(parseInt(request.nextUrl.searchParams.get('days') ?? '365'), 365)
  const rows = await db.select().from(activity).orderBy(desc(activity.date)).limit(days)
  return NextResponse.json({ activity: rows })
}
