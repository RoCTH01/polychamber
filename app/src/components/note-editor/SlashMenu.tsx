'use client'

type SlashOptionId = 'link' | 'reference' | 'task' | 'quote'

interface SlashOption {
  id: SlashOptionId
  icon: string
  label: string
  hint: string
}

const OPTIONS: SlashOption[] = [
  { id: 'link',      icon: '↗', label: 'Link',      hint: 'inline chip' },
  { id: 'reference', icon: '⬡', label: 'Reference',  hint: 'block' },
  { id: 'task',      icon: '☑', label: 'Task',       hint: 'task' },
  { id: 'quote',     icon: '"', label: 'Quote',      hint: 'quote' },
]

interface Props {
  onSelect: (id: SlashOptionId) => void
  onDismiss: () => void
}

export default function SlashMenu({ onSelect, onDismiss }: Props) {
  return (
    <div className="ne-slash-menu" role="menu"
      onKeyDown={e => { if (e.key === 'Escape') onDismiss() }}>
      {OPTIONS.map(opt => (
        <button key={opt.id} className="ne-slash-opt" role="menuitem"
          onMouseDown={e => { e.preventDefault(); onSelect(opt.id) }}>
          <span className="ne-slash-icon">{opt.icon}</span>
          <span className="ne-slash-label">{opt.label}</span>
          <span className="ne-slash-hint mono">{opt.hint}</span>
        </button>
      ))}
    </div>
  )
}
