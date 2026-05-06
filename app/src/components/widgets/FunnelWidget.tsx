'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import type { Item, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void }

const KIND_GLYPH: Record<string, string> = { paper: '◆', video: '▶', article: '¶', thread: '≋' }
const TABS = ['next', 'soon', 'later']

export default function FunnelWidget({ id, dragHandlers, onClose }: Props) {
  const [tag, setTag] = useState('next')
  const { items, updateItem } = useItems({ kind: 'funnel_item' })
  const filtered = items.filter(i => i.funnel?.queueTag === tag)

  const moveToNext = async (item: Item) => {
    const order = ['next', 'soon', 'later']
    const idx = order.indexOf(item.funnel?.queueTag ?? 'later')
    if (idx > 0) await updateItem(item.id, { funnel: { ...item.funnel!, queueTag: order[idx - 1] } } as Partial<Item>)
  }

  return (
    <WidgetShell id={id} title="FUNNEL" meta={`${items.length} queued`}
      tabs={TABS} tab={tag} onTab={setTag}
      dragHandlers={dragHandlers} onClose={onClose} noPad>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((f, i) => (
          <div key={f.id} style={{
            padding: '8px var(--pad)',
            borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'default',
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--panel-2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
            <span className="mono" style={{ width: 12, color: 'var(--accent)', fontSize: 11, textAlign: 'center' }}>
              {KIND_GLYPH[f.funnel?.mediaKind ?? 'article']}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.body}</div>
              <div className="mono row gap-6" style={{ fontSize: 9.5, color: 'var(--text-4)', marginTop: 2 }}>
                <span>{f.funnel?.source}</span>
                <span>·</span>
                <span className="tab">{f.funnel?.est}</span>
              </div>
            </div>
            <div className="row gap-4">
              <button className="w-act" title="Move up" style={{ width: 16, height: 16 }} onClick={() => moveToNext(f)}>→</button>
              <button className="w-act" title="Archive" style={{ width: 16, height: 16 }}>✓</button>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  )
}
