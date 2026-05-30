'use client'

export type SlashOptionId = 'link' | 'reference' | 'task' | 'quote'

export interface SlashOption {
  id: SlashOptionId
  icon: string
  label: string
  hint: string
}

export const SLASH_OPTIONS: SlashOption[] = [
  { id: 'link',      icon: '↗', label: 'Link',      hint: 'inline chip' },
  { id: 'reference', icon: '⬡', label: 'Reference',  hint: 'block' },
  { id: 'task',      icon: '☑', label: 'Task',       hint: 'task' },
  { id: 'quote',     icon: '"', label: 'Quote',      hint: 'quote' },
]

interface Props {
  options: SlashOption[]
  selectedIndex: number
  onSelect: (id: SlashOptionId) => void
  onHover: (index: number) => void
  onDismiss: () => void
}

export default function SlashMenu({ options, selectedIndex, onSelect, onHover, onDismiss }: Props) {
  return (
    <div className="ne-slash-menu" role="menu"
      onKeyDown={e => { if (e.key === 'Escape') onDismiss() }}>
      {options.map((opt, i) => (
        <button key={opt.id}
          className={`ne-slash-opt${i === selectedIndex ? ' selected' : ''}`}
          role="menuitem"
          onMouseDown={e => { e.preventDefault(); onSelect(opt.id) }}
          onMouseEnter={() => onHover(i)}>
          <span className="ne-slash-icon">{opt.icon}</span>
          <span className="ne-slash-label">{opt.label}</span>
          <span className="ne-slash-hint mono">{opt.hint}</span>
        </button>
      ))}
    </div>
  )
}
