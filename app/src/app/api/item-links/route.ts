import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { itemLinks } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const noteId = request.nextUrl.searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId required' }, { status: 400 })

  const result = await db.execute(sql`
    SELECT *
    FROM (
      SELECT DISTINCT ON (root.id) root.*
      FROM item_links il
      INNER JOIN items msg  ON msg.id  = il.from_id
      INNER JOIN items root ON root.id = COALESCE(msg.parent_id, msg.id)
      WHERE il.to_id = ${noteId}
      ORDER BY root.id
    ) sub
    ORDER BY sub.created_at DESC
  `)

  const backlinks = result.rows.map((r: Record<string, unknown>) => ({
    id:        r.id,
    kind:      r.kind,
    body:      r.body,
    src:       r.src,
    author:    r.author,
    parentId:  r.parent_id,
    starred:   r.starred,
    tags:      r.tags,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))

  return NextResponse.json({ backlinks })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { from_id, to_id, link_kind } = body
  if (!from_id || !to_id || !link_kind) {
    return NextResponse.json({ error: 'from_id, to_id, link_kind required' }, { status: 400 })
  }

  await db.insert(itemLinks)
    .values({ fromId: from_id, toId: to_id, linkKind: link_kind })
    .onConflictDoNothing()

  return NextResponse.json({ ok: true }, { status: 201 })
}
