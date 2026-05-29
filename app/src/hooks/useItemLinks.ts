import useSWR from 'swr'
import type { Item } from '@/types'

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

export function useItemLinks(noteId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ backlinks: Item[] }>(
    `/api/item-links?noteId=${noteId}`,
    fetcher,
  )

  return {
    backlinks: data?.backlinks ?? [],
    isLoading,
    error,
    mutate,
  }
}
