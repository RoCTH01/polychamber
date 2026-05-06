import type { ItemMessage } from '@/types'

interface Props {
  body: string
  message?: ItemMessage
  onToggleTask?: () => void
}

/** Light inline markdown: **bold**, *italic*, `code`, @mention, #tag, URLs */
function fmt(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@\w+|#\w+|https?:\/\/\S+)/g
  let last = 0; let m; let key = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>)
    const tok = m[0]
    if      (tok.startsWith('**'))   out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('*'))    out.push(<em key={key++}>{tok.slice(1, -1)}</em>)
    else if (tok.startsWith('`'))    out.push(<code key={key++} className="ne-code-inline">{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('@'))    out.push(<span key={key++} className="ne-mention">{tok}</span>)
    else if (tok.startsWith('#'))    out.push(<span key={key++} className="ne-hashtag">{tok}</span>)
    else if (tok.startsWith('http')) out.push(<a key={key++} className="ne-link" onClick={e => e.preventDefault()} href={tok}>{tok}</a>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>)
  return out
}

export default function MessageContent({ body, message, onToggleTask }: Props) {
  const kind = message?.messageKind

  if (kind === 'task') {
    return (
      <div className="ne-task">
        <button onClick={onToggleTask} className={`ne-task-box${message?.done ? ' done' : ''}`}>
          {message?.done ? '✓' : ''}
        </button>
        <span className={`ne-task-text${message?.done ? ' done' : ''}`}>{fmt(body)}</span>
      </div>
    )
  }

  if (kind === 'link' && message?.linkMeta) {
    return (
      <div>
        <a className="ne-link" href={body} onClick={e => e.preventDefault()}>{body}</a>
        <div className="ne-link-card">
          <div className="ne-link-card-site mono">{message.linkMeta.site}</div>
          <div className="ne-link-card-title">{message.linkMeta.title}</div>
          <div className="ne-link-card-desc">{message.linkMeta.desc}</div>
        </div>
      </div>
    )
  }

  if (kind === 'link') return <a className="ne-link" href={body} onClick={e => e.preventDefault()}>{body}</a>
  if (kind === 'quote') return <blockquote className="ne-quote">{fmt(body)}</blockquote>

  return <div className="ne-text">{fmt(body)}</div>
}
