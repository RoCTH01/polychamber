'use client'

import { useContextMenu } from '@/components/ui/ContextMenu'
import type { DragHandlers } from '@/types'

interface Props {
  id: string
  title: string
  meta?: string
  tabs?: string[]
  tab?: string
  onTab?: (tab: string) => void
  actions?: React.ReactNode
  dragHandlers?: DragHandlers
  onClose?: () => void
  children: React.ReactNode
  noPad?: boolean
}

export default function WidgetShell({ id, title, meta, tabs, tab, onTab, actions, dragHandlers, onClose, children, noPad }: Props) {
  const { open: openMenu } = useContextMenu()

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    openMenu(e, [
      { label: 'Hide widget', danger: true, action: onClose },
    ])
  }

  return (
    <div className="widget" data-widget={id} {...dragHandlers}>
      <div className="widget-header" onContextMenu={handleHeaderContextMenu}>
        <div className="w-handle" />
        <div className="w-title">{title}</div>
        {meta && <div className="w-meta">· {meta}</div>}
        {tabs && (
          <div className="w-tabs">
            {tabs.map(t => (
              <div key={t} className={`w-tab${t === tab ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); onTab?.(t) }}>{t}</div>
            ))}
          </div>
        )}
        <div className="w-actions">
          {actions}
          <button className="w-act" title="Refresh" onClick={e => e.stopPropagation()}>↻</button>
          <button className="w-act" title="Close" onClick={e => { e.stopPropagation(); onClose?.() }}>×</button>
        </div>
      </div>
      <div className={`widget-body${noPad ? ' no-pad' : ''}`}>{children}</div>
    </div>
  )
}
