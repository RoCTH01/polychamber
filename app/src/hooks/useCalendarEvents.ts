import useSWR from 'swr'
import type { CalendarEvent } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCalendarEvents(weekStart?: string) {
  const sp = weekStart ? `?weekStart=${weekStart}` : ''
  const { data, isLoading } = useSWR<{ events: CalendarEvent[] }>(`/api/calendar-events${sp}`, fetcher)
  return { events: data?.events ?? [], isLoading }
}
