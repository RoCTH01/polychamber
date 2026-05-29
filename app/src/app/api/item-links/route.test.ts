import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockExecute = vi.fn()
const mockInsertValues = vi.fn(() => ({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }))
const mockInsert = vi.fn(() => ({ values: mockInsertValues }))
const mockDelete = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }))

vi.mock('@/lib/db/client', () => ({ db: { execute: mockExecute, insert: mockInsert, delete: mockDelete } }))
vi.mock('@/lib/db/schema', () => ({ itemLinks: {} }))

beforeEach(() => vi.clearAllMocks())

describe('GET /api/item-links', () => {
  test('returns 400 when noteId is missing', async () => {
    const { GET } = await import('./route')
    const req = new NextRequest('http://localhost/api/item-links')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  test('returns backlinks array when noteId is provided', async () => {
    mockExecute.mockResolvedValue({ rows: [{ id: 'abc', body: 'hello', author: 'Alice', created_at: '2026-01-01', parent_id: null }] })
    const { GET } = await import('./route')
    const req = new NextRequest('http://localhost/api/item-links?noteId=xyz')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.backlinks).toHaveLength(1)
    expect(data.backlinks[0].id).toBe('abc')
  })
})

describe('POST /api/item-links', () => {
  test('returns 400 when fields are missing', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/item-links', {
      method: 'POST',
      body: JSON.stringify({ from_id: 'a' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('creates link and returns 201', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/item-links', {
      method: 'POST',
      body: JSON.stringify({ from_id: 'a', to_id: 'b', link_kind: 'inline' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    expect(mockInsertValues).toHaveBeenCalledWith({ fromId: 'a', toId: 'b', linkKind: 'inline' })
  })
})
