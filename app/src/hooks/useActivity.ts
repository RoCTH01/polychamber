import useSWR from 'swr'
import { useMemo } from 'react'
import type { ActivityDay } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useActivity(days: number = 365) {
  const { data, isLoading, mutate } = useSWR<{ activity: ActivityDay[] }>(`/api/activity?days=${days}`, fetcher)

  // Pad to exactly `days` entries (fill missing dates with count=0)
  const activity = useMemo<ActivityDay[]>(() => {
    const map = new Map((data?.activity ?? []).map(d => [d.date, d]))
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
  }, [data?.activity, days])

  return { activity, isLoading, mutate }
}
