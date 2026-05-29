'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useContextMenu } from '@/components/ui/ContextMenu'
import { useAppStore } from '@/store/app'
import { weekStartFor } from '@/lib/utils'
import { useItems } from '@/hooks/useItems'
import type { CalendarEvent, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void; config?: Record<string, unknown> }

const START_HOUR = 8
const END_HOUR   = 22
const HOURS      = END_HOUR - START_HOUR

function fmtH(h: number) {
  const hh = Math.floor(h)
  const mm = Math.round((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function getISOWeek(d: Date) {
  const t = new Date(d); t.setHours(0, 0, 0, 0)
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7))
  const w1 = new Date(t.getFullYear(), 0, 4)
  return 1 + Math.round(((t.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

export default function CalendarWidget({ id, dragHandlers, onClose }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [noteInput, setNoteInput] = useState('')

  const weekStartStr = weekStartFor(weekOffset)
  const now = new Date()
  const weekStart = new Date(weekStartStr + 'T00:00:00')

  const { events, createAndLinkNote, linkNote, mutate } = useCalendarEvents(weekStartStr)
  const { createItem } = useItems({ kind: 'note', parentId: 'null' })
  const setOpenNote        = useAppStore(s => s.setOpenNoteId)
  const setOpenNoteLinkedEvent = useAppStore(s => s.setOpenNoteLinkedEvent)
  const { open: openMenu } = useContextMenu()

  const handleEventContextMenu = (e: React.MouseEvent, ev: CalendarEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (ev.linkedNoteId) {
      openMenu(e, [
        { label: 'Open linked note', action: () => { setOpenNoteLinkedEvent(ev); setOpenNote(ev.linkedNoteId!) } },
        { divider: true },
        { label: 'Unlink note', danger: true, action: () => linkNote(ev.id, null) },
      ])
    } else {
      openMenu(e, [
        { label: 'New linked note', action: async () => {
          const note = await createAndLinkNote(ev)
          setOpenNoteLinkedEvent({ ...ev, linkedNoteId: note.id })
          setOpenNote(note.id)
        }},
      ])
    }
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })
  const todayIdx = days.findIndex(d => d.toDateString() === now.toDateString())
  const nowFrac  = (now.getHours() + now.getMinutes() / 60 - START_HOUR) / HOURS

  const monthLabel = days[0].toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()

  const kindColor = (k: string) => {
    if (k === 'meet')   return { bg: 'var(--accent-soft)', border: 'var(--accent-line)', text: 'var(--accent)' }
    if (k === 'focus')  return { bg: 'oklch(from var(--ok) l c h / 0.14)', border: 'oklch(from var(--ok) l c h / 0.4)', text: 'var(--ok)' }
    return { bg: 'oklch(from var(--warn) l c h / 0.14)', border: 'oklch(from var(--warn) l c h / 0.4)', text: 'var(--warn)' }
  }

  return (
    <WidgetShell id={id} title="Calendar" meta={`${monthLabel} · wk ${getISOWeek(now)}`}
      dragHandlers={dragHandlers} onClose={onClose} onRefresh={mutate} noPad
      actions={
        <>
          <button className="w-act" onClick={e => { e.stopPropagation(); setWeekOffset(o => o - 1) }}>‹</button>
          <button className="w-act" onClick={e => { e.stopPropagation(); setWeekOffset(o => o + 1) }}>›</button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Day headers */}
        <div className="cal-day-headers" style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
          <div className="cal-time-col" />
          {days.map((d, i) => (
            <div key={i} style={{ padding: '6px 8px', borderLeft: '1px solid var(--border-subtle)', background: i === todayIdx ? 'var(--accent-soft)' : 'transparent' }}>
              <div className="mono cal-day-name" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className="mono tab" style={{ fontSize: 'var(--fs-md)', fontWeight: 500, color: i === todayIdx ? 'var(--accent)' : 'var(--text)' }}>
                {d.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="cal-time-grid" style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', minHeight: 0, overflow: 'auto' }}>
          {/* Hour gutter */}
          <div className="cal-time-col" style={{ display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: HOURS }, (_, h) => (
              <div key={h} style={{ height: 30, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', paddingRight: 4, textAlign: 'right', paddingTop: 2, borderTop: '1px solid var(--border-subtle)' }}>
                {String(START_HOUR + h).padStart(2, '0')}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((_, i) => (
            <div key={i} style={{ position: 'relative', borderLeft: '1px solid var(--border-subtle)', background: i === todayIdx ? 'oklch(from var(--accent) l c h / 0.04)' : 'transparent' }}>
              {Array.from({ length: HOURS }, (_, h) => (
                <div key={h} style={{ height: 30, borderTop: '1px solid var(--border-subtle)' }} />
              ))}
              {events.filter(e => e.dayOfWeek === i).map((e, j) => {
                const top    = (Number(e.startHour) - START_HOUR) * 30
                const height = (Number(e.endHour) - Number(e.startHour)) * 30 - 2
                const c      = kindColor(e.kind)
                return (
                  <div key={j}
                    onContextMenu={ev => handleEventContextMenu(ev, e)}
                    style={{
                      position: 'absolute', left: 2, right: 2, top, height,
                      background: c.bg, border: `1px solid ${c.border}`,
                      borderLeft: `2px solid ${c.text}`,
                      borderRadius: 3, padding: '3px 5px',
                      fontSize: 'var(--fs-xs)', color: c.text, overflow: 'hidden',
                      boxShadow: e.isCurrent ? '0 0 0 1px var(--accent)' : 'none',
                      cursor: 'default',
                    }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div className="mono tab" style={{ fontSize: 9, opacity: 0.85 }}>{fmtH(Number(e.startHour))}–{fmtH(Number(e.endHour))}</div>
                      {/* Note indicator dot — visible when the event has a linked note */}
                      {e.linkedNoteId && (
                        <div title="Has linked note" style={{ width: 5, height: 5, borderRadius: '50%', background: c.text, opacity: 0.7, flexShrink: 0, marginTop: 2 }} />
                      )}
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 'var(--fs-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  </div>
                )
              })}
              {i === todayIdx && nowFrac > 0 && nowFrac < 1 && (
                <div style={{ position: 'absolute', left: 0, right: 0, top: nowFrac * HOURS * 30, height: 1, background: 'var(--bad)', zIndex: 5 }}>
                  <div style={{ position: 'absolute', left: -3, top: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--bad)' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Inline note capture */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px var(--pad)', background: 'var(--panel-2)', flexShrink: 0 }}>
          <div className="row gap-6">
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>+ NOTE @ NOW</span>
            <input
              placeholder="Quick note…"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && noteInput.trim()) {
                  await createItem({ kind: 'note', body: noteInput.trim() })
                  setNoteInput('')
                }
              }}
              style={{ flex: 1, height: 20, background: 'transparent', border: 0, outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}
            />
            <span className="chip">⏎</span>
          </div>
        </div>
      </div>
    </WidgetShell>
  )
}
