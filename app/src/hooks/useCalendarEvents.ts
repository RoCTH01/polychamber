import useSWR, { mutate as globalMutate } from 'swr'
import type { CalendarEvent } from '@/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useCalendarEvents(weekStart?: string) {
  const sp = weekStart ? `?weekStart=${weekStart}` : ''
  const { data, isLoading, mutate } = useSWR<{ events: CalendarEvent[] }>(
    `/api/calendar-events${sp}`,
    fetcher,
  )

  // Set (or clear) the linked note for a calendar event
  const linkNote = async (eventId: string, noteId: string | null) => {
    const updated = (data?.events ?? []).map(e =>
      e.id === eventId ? { ...e, linkedNoteId: noteId } : e,
    )
    await mutate({ events: updated }, false)
    await fetch(`/api/calendar-events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedNoteId: noteId }),
    })
    mutate()
  }

  // Create a new root note then link it to the event; returns the new note
  const createAndLinkNote = async (event: CalendarEvent) => {
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][event.dayOfWeek] ?? ''
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'note',
        body: `${event.title} — ${day}`,
        src: null, author: null, tags: [], starred: false,
      }),
    })
    const item = await res.json()
    await linkNote(event.id, item.id)
    // Revalidate the root-items SWR key so page.tsx can find the new note
    await globalMutate('/api/items?parentId=null')
    return item
  }

  return { events: data?.events ?? [], isLoading, linkNote, createAndLinkNote, mutate }
}
