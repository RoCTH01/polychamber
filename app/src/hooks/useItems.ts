import useSWR from 'swr'
import type { Item } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

interface UseItemsParams {
  kind?: string
  src?: string
  parentId?: string | 'null'
  limit?: number
  offset?: number
  hasFunnel?: boolean
  noSrc?: boolean
}

export function useItems(params?: UseItemsParams) {
  const sp = new URLSearchParams()
  if (params?.kind)     sp.set('kind', params.kind)
  if (params?.src)      sp.set('src', params.src)
  if (params?.parentId !== undefined) sp.set('parentId', params.parentId)
  if (params?.limit)    sp.set('limit', String(params.limit))
  if (params?.offset)   sp.set('offset', String(params.offset))
  if (params?.hasFunnel) sp.set('hasFunnel', 'true')
  if (params?.noSrc)     sp.set('noSrc', 'true')

  const key = `/api/items?${sp.toString()}`
  const { data, error, isLoading, mutate } = useSWR<{ items: Item[] }>(key, fetcher)

  const createItem = async (payload: Omit<Partial<Item>, 'id' | 'createdAt'> & { kind: string; body: string }) => {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const created: Item = await res.json()
    await mutate({ items: [created, ...(data?.items ?? [])] }, false)
    return created
  }

  const updateItem = async (id: string, patch: Partial<Item>) => {
    // optimistic
    await mutate(
      { items: (data?.items ?? []).map(item => item.id === id ? { ...item, ...patch } : item) },
      false,
    )
    await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    mutate()
  }

  const deleteItem = async (id: string) => {
    await mutate({ items: (data?.items ?? []).filter(item => item.id !== id) }, false)
    await fetch(`/api/items/${id}`, { method: 'DELETE' })
    mutate()
  }

  return {
    items:      data?.items ?? [],
    isLoading,
    error,
    createItem,
    updateItem,
    deleteItem,
    mutate,
  }
}
