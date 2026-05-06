import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { calendarEvents } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const weekStart = request.nextUrl.searchParams.get('weekStart')
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(weekStart ? eq(calendarEvents.weekStart, weekStart) : undefined)
    .orderBy(asc(calendarEvents.dayOfWeek), asc(calendarEvents.startHour))
  return NextResponse.json({ events: rows })
}
