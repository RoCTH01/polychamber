'use client'

import { useState } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import { useContextMenu } from '@/components/ui/ContextMenu'
import type { Item, DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void; config?: Record<string, unknown> }

const QUEUE_ORDER = ['next', 'soon', 'later'] as const
type QueueTag = typeof QUEUE_ORDER[number]

const KIND_META: Record<string, { label: string; color: string }> = {
  paper:   { label: 'PAPER',   color: 'var(--accent)' },
  video:   { label: 'VIDEO',   color: '#e07b4f' },
  article: { label: 'ARTICLE', color: '#6b9fd4' },
  thread:  { label: 'THREAD',  color: '#8fa87e' },
}
const DEFAULT_KIND = { label: 'LINK', color: 'var(--text-3)' }

export default function FunnelWidget({ id, dragHandlers, onClose }: Props) {
  const [tag, setTag] = useState<QueueTag>('next')
  const { items, updateItem, deleteItem, mutate } = useItems({ hasFunnel: true })
  const { open: openMenu } = useContextMenu()

  const byQueue = (q: QueueTag) => items.filter(i => i.funnel?.queueTag === q)
  const filtered = byQueue(tag)

  const moveTo = (item: Item, target: QueueTag) =>
    updateItem(item.id, { funnel: { ...item.funnel!, queueTag: target } } as Partial<Item>)

  const tabLabels = QUEUE_ORDER.map(q => `${q}  ${byQueue(q).length}`)

  const handleContextMenu = (e: React.MouseEvent, item: Item) => {
    const current = (item.funnel?.queueTag ?? 'later') as QueueTag
    openMenu(e, [
      { label: 'Move to Next',  checked: current === 'next',  disabled: current === 'next',  action: () => moveTo(item, 'next') },
      { label: 'Move to Soon',  checked: current === 'soon',  disabled: current === 'soon',  action: () => moveTo(item, 'soon') },
      { label: 'Move to Later', checked: current === 'later', disabled: current === 'later', action: () => moveTo(item, 'later') },
      { divider: true },
      { label: 'Mark done & remove', danger: true, action: () => deleteItem(item.id) },
    ])
  }

  return (
    <WidgetShell
      id={id} title="Funnel" meta={`${items.length} queued`}
      tabs={tabLabels}
      tab={tabLabels[QUEUE_ORDER.indexOf(tag)]}
      onTab={t => setTag(QUEUE_ORDER[tabLabels.indexOf(t)])}
      dragHandlers={dragHandlers} onClose={onClose} onRefresh={mutate} noPad
    >
      {filtered.length === 0 ? (
        <div style={{ padding: '24px var(--pad)', textAlign: 'center', fontSize: 'var(--fs-xs)', color: 'var(--text-4)', fontFamily: 'var(--font-mono)' }}>
          nothing in {tag}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filtered.map((f, i) => {
            const kind = KIND_META[f.funnel?.mediaKind ?? ''] ?? DEFAULT_KIND
            return (
              <div key={f.id}
                className="funnel-row"
                style={{ padding: '7px var(--pad)', borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 9 }}
                onContextMenu={e => handleContextMenu(e, f)}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600, letterSpacing: '0.07em', color: kind.color, background: 'var(--panel-hi)', border: `1px solid ${kind.color}`, borderRadius: 3, padding: '1px 4px', flexShrink: 0, opacity: 0.85 }}>
                  {kind.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {f.body}
                  </div>
                  <div className="funnel-meta mono row gap-4" style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2 }}>
                    <span>{f.funnel?.source}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span className="tab">{f.funnel?.est}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </WidgetShell>
  )
}
