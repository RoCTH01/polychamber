'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import { useContextMenu } from '@/components/ui/ContextMenu'
import type { DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void; config?: Record<string, unknown> }

const DUE_ORDER = ['today', 'tomorrow', 'this wk', 'next wk']

export default function RemindersWidget({ id, dragHandlers, onClose }: Props) {
  const [filter, setFilter] = useState('open')
  const [newBody, setNewBody] = useState('')
  const { items, updateItem, createItem, deleteItem, mutate } = useItems({ kind: 'reminder' })
  const { open: openMenu } = useContextMenu()

  const visible  = filter === 'open' ? items.filter(r => !r.reminder?.done) : items
  const openCount = items.filter(r => !r.reminder?.done).length

  const groups: Record<string, typeof items[0][]> = {}
  visible.forEach(r => {
    const k = r.reminder?.due ?? 'later'
    if (!groups[k]) groups[k] = []
    groups[k].push(r)
  })

  const toggle = (item: typeof items[0]) => {
    updateItem(item.id, { reminder: { ...item.reminder!, done: !item.reminder?.done } } as never)
  }

  const addReminder = async () => {
    if (!newBody.trim()) return
    await createItem({ kind: 'reminder', body: newBody.trim(), reminder: { due: 'today' as const, priority: 3 as const, done: false } })
    setNewBody('')
  }

  return (
    <WidgetShell id={id} title="Reminders" meta={`${openCount} open`}
      tabs={['open', 'all']} tab={filter} onTab={setFilter}
      dragHandlers={dragHandlers} onClose={onClose} onRefresh={mutate} noPad>
      <div style={{ padding: '6px 0' }}>
        {DUE_ORDER.filter(k => groups[k]).map(k => (
          <div key={k}>
            <div className="mono" style={{ padding: '4px var(--pad)', fontSize: 9, letterSpacing: '0.08em', color: k === 'today' ? 'var(--accent)' : 'var(--text-4)' }}>
              {k.toUpperCase()}
            </div>
            {groups[k].map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px var(--pad)', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                onContextMenu={e => openMenu(e, [
                  { label: r.reminder?.done ? 'Mark incomplete' : 'Mark complete', checked: r.reminder?.done, action: () => toggle(r) },
                  { divider: true },
                  { label: 'Delete', danger: true, action: () => deleteItem(r.id) },
                ])}>
                <button onClick={() => toggle(r)} style={{
                  width: 13, height: 13, padding: 0,
                  border: `1px solid ${r.reminder?.done ? 'var(--accent)' : 'var(--border)'}`,
                  background: r.reminder?.done ? 'var(--accent)' : 'transparent',
                  borderRadius: 3, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: r.reminder?.done ? 'var(--bg)' : 'transparent', fontSize: 9,
                }}>✓</button>
                <span className="dot" style={{ background: r.reminder?.priority === 1 ? 'var(--bad)' : r.reminder?.priority === 2 ? 'var(--warn)' : 'var(--text-4)' }} />
                <span className="rem-text" style={{ flex: 1, fontSize: 'var(--fs-sm)', color: r.reminder?.done ? 'var(--text-4)' : 'var(--text)', textDecoration: r.reminder?.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.body}
                </span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ padding: '6px var(--pad)', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
          <div className="row gap-6">
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>+ NEW</span>
            <input placeholder="add reminder…" value={newBody}
              onChange={e => setNewBody(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addReminder()}
              style={{ flex: 1, height: 18, background: 'transparent', border: 0, outline: 'none', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }} />
          </div>
        </div>
      </div>
    </WidgetShell>
  )
}
