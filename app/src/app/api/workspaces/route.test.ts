import { describe, test, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockReturning = vi.fn()
const mockValues = vi.fn(() => ({ returning: mockReturning }))
const mockInsert = vi.fn(() => ({ values: mockValues }))

vi.mock('@/lib/db/client', () => ({ db: { insert: mockInsert } }))
vi.mock('@/lib/db/schema', () => ({ workspaces: {} }))

beforeEach(() => vi.clearAllMocks())

describe('POST /api/workspaces', () => {
  test('creates workspace with empty layout and returns 201', async () => {
    mockReturning.mockResolvedValue([{ id: 'abc', name: 'my-ws', layout: [] }])
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: 'my-ws' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.name).toBe('my-ws')
    expect(data.layout).toEqual([])
    expect(mockValues).toHaveBeenCalledWith({ name: 'my-ws', layout: [] })
  })

  test('returns 400 when name is missing', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  test('returns 400 when name is blank whitespace', async () => {
    const { POST } = await import('./route')
    const req = new NextRequest('http://localhost/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
