import useSWR from 'swr'
import type { Workspace, LayoutItem } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useWorkspaces() {
  const { data, isLoading, mutate } = useSWR<{ workspaces: Workspace[] }>('/api/workspaces', fetcher)

  const updateLayout = async (id: string, layout: LayoutItem[]) => {
    // optimistic
    await mutate(
      { workspaces: (data?.workspaces ?? []).map(ws => ws.id === id ? { ...ws, layout } : ws) },
      false,
    )
    await fetch(`/api/workspaces/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout }),
    })
    mutate()
  }

  return {
    workspaces: data?.workspaces ?? [],
    isLoading,
    updateLayout,
    mutate,
  }
}
