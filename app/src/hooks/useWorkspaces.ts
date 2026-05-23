import useSWR from 'swr'
import type { Workspace, LayoutItem, WidgetType } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DEFAULT_SIZES: Record<WidgetType, { w: number; h: number }> = {
  heatmap:   { w: 8, h: 7 },
  feed:      { w: 5, h: 9 },
  calendar:  { w: 7, h: 9 },
  funnel:    { w: 7, h: 7 },
  focus:     { w: 4, h: 7 },
  reminders: { w: 5, h: 7 },
}

export function useWorkspaces() {
  const { data, isLoading, mutate } = useSWR<{ workspaces: Workspace[] }>('/api/workspaces', fetcher)

  const updateLayout = async (id: string, layout: LayoutItem[]) => {
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

  const createWorkspace = async (name: string): Promise<Workspace> => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) throw new Error(`Failed to create workspace: ${res.status}`)
    const ws: Workspace = await res.json()
    await mutate()
    return ws
  }

  const addWidget = async (wsId: string, currentLayout: LayoutItem[], type: WidgetType) => {
    const bottom = currentLayout.reduce((max, it) => Math.max(max, it.y + it.h), 0)
    const { w, h } = DEFAULT_SIZES[type]
    const newItem: LayoutItem = { id: crypto.randomUUID(), type, x: 0, y: bottom, w, h }
    await updateLayout(wsId, [...currentLayout, newItem])
  }

  return {
    workspaces: data?.workspaces ?? [],
    isLoading,
    updateLayout,
    createWorkspace,
    addWidget,
    mutate,
  }
}
