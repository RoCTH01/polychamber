import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const { date, src } = await request.json()
  const srcKey = src ?? 'manual'
  await db.execute(sql`
    INSERT INTO activity (date, count, source_breakdown)
    VALUES (${date}, 1, ${JSON.stringify({ [srcKey]: 1 })}::jsonb)
    ON CONFLICT (date) DO UPDATE SET
      count            = activity.count + 1,
      source_breakdown = activity.source_breakdown || ${JSON.stringify({ [srcKey]: 1 })}::jsonb
  `)
  return NextResponse.json({ ok: true })
}
