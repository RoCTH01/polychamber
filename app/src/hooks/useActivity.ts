import useSWR from 'swr'
import { useMemo } from 'react'
import type { ActivityDay, HeatmapConfig } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function padToDays(data: { date: string; count: number }[] | undefined, days: number): ActivityDay[] {
  const map = new Map((data ?? []).map(d => [d.date, d.count]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const result: ActivityDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    result.push({ date: dateStr, count: map.get(dateStr) ?? 0, sourceBreakdown: {} })
  }
  return result
}

export function useActivity(days: number = 365, config?: HeatmapConfig) {
  const mode = config?.mode ?? 'all'

  const tagKey = mode === 'tag' && config?.tag
    ? `/api/activity/tag?tag=${encodeURIComponent(config.tag)}&days=${days}`
    : null

  const allKey = mode === 'all' || mode === 'habit'
    ? `/api/activity?days=${days}`
    : null

  const { data: allData,  mutate: mutateAll } = useSWR<{ activity: ActivityDay[] }>(allKey, fetcher)
  const { data: tagData,  mutate: mutateTag } = useSWR<{ activity: { date: string; count: number }[] }>(tagKey, fetcher)

  const activity = useMemo<ActivityDay[]>(() => {
    if (mode === 'tag') return padToDays(tagData?.activity, days)
    const map = new Map((allData?.activity ?? []).map(d => [d.date, d]))
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const result: ActivityDay[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      result.push(map.get(dateStr) ?? { date: dateStr, count: 0, sourceBreakdown: {} })
    }
    return result
  }, [allData?.activity, tagData?.activity, days, mode])

  const mutate = () => { mutateAll?.(); mutateTag?.() }

  return { activity, mutate }
}
