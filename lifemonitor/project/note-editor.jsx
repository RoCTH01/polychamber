// note-editor.jsx — Right-sidebar chatroom-style note editor

const { useState: useStateNE, useEffect: useEffectNE, useRef: useRefNE, useMemo: useMemoNE } = React;

const ME_AVATAR_HUE = 220;

function NoteEditor({ note, onClose, onUpdate }) {
  const [composer, setComposer] = useStateNE('');
  const [composerKind, setComposerKind] = useStateNE('text'); // text | task | link | quote
  const [editingId, setEditingId] = useStateNE(null);
  const [editingText, setEditingText] = useStateNE('');
  const scrollRef = useRefNE(null);

  useEffectNE(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [note?.id, note?.messages?.length]);

  if (!note) return null;

  const send = () => {
    if (!composer.trim()) return;
    const newMsg = {
      id: 'm' + Date.now(),
      who: 'me',
      t: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      kind: composerKind === 'text' ? undefined : composerKind,
      body: composer.trim(),
      ...(composerKind === 'task' ? { done: false } : {}),
    };
    onUpdate({ ...note, messages: [...note.messages, newMsg] });
    setComposer('');
    setComposerKind('text');
  };

  const updateMsg = (msgId, patch) => {
    onUpdate({
      ...note,
      messages: note.messages.map(m => m.id === msgId ? { ...m, ...patch } : m),
    });
  };
  const deleteMsg = (msgId) => {
    if (note.messages.length <= 1) return; // keep origin
    onUpdate({ ...note, messages: note.messages.filter(m => m.id !== msgId) });
  };
  const toggleReaction = (msgId, emoji) => {
    const msg = note.messages.find(m => m.id === msgId);
    const reactions = [...(msg.reactions || [])];
    const idx = reactions.findIndex(r => r.e === emoji);
    if (idx >= 0) {
      reactions[idx] = { ...reactions[idx], n: reactions[idx].n + 1 };
    } else {
      reactions.push({ e: emoji, n: 1 });
    }
    updateMsg(msgId, { reactions });
  };

  const startEdit = (m) => { setEditingId(m.id); setEditingText(m.body); };
  const commitEdit = () => {
    if (editingId) updateMsg(editingId, { body: editingText });
    setEditingId(null); setEditingText('');
  };

  return (
    <aside className="note-editor">
      {/* Header */}
      <header className="ne-head">
        <div className="ne-head-title">
          <span className={`src-icon src-${note.src}`}>{SRC_LABEL[note.src]}</span>
          <div className="ne-head-stack">
            <input
              className="ne-title-input"
              value={note.author}
              onChange={(e) => onUpdate({ ...note, author: e.target.value })}
            />
            <div className="ne-head-meta mono">
              <span>{SRC_NAME[note.src]}</span>
              <span>·</span>
              <span className="tab">{note.messages.length} msg</span>
              <span>·</span>
              <span>opened {note.t}</span>
            </div>
          </div>
        </div>
        <div className="ne-head-actions">
          <button className="ne-icon-btn" title={note.starred ? 'Unstar' : 'Star'}
            onClick={() => onUpdate({ ...note, starred: !note.starred })}
            style={note.starred ? { color: 'var(--warn)' } : null}>★</button>
          <button className="ne-icon-btn" title="More">⋯</button>
          <button className="ne-icon-btn" title="Close" onClick={onClose}>✕</button>
        </div>
      </header>

      {/* Tag bar */}
      <div className="ne-tagbar">
        {(note.tags || []).map((tag, i) => (
          <span key={i} className="ne-tag-chip">
            <span style={{ color: 'var(--text-3)' }}>#</span>{tag}
            <button className="ne-tag-x"
              onClick={() => onUpdate({ ...note, tags: note.tags.filter((_, j) => j !== i) })}>×</button>
          </span>
        ))}
        <NeTagInput onAdd={(v) => onUpdate({ ...note, tags: [...(note.tags || []), v] })} />
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-4)', letterSpacing: '0.06em' }}>
          THREAD · {note.id.toUpperCase()}
        </span>
      </div>

      {/* Messages */}
      <div className="ne-stream" ref={scrollRef}>
        {note.messages.map((m, i) => {
          const prev = i > 0 ? note.messages[i - 1] : null;
          const grouped = prev && prev.who === m.who && (m.t === prev.t || sameMin(prev.t, m.t));
          return (
            <Message key={m.id} m={m} note={note} grouped={grouped}
              editing={editingId === m.id}
              editingText={editingText}
              setEditingText={setEditingText}
              onStartEdit={() => startEdit(m)}
              onCommit={commitEdit}
              onCancel={() => { setEditingId(null); setEditingText(''); }}
              onDelete={() => deleteMsg(m.id)}
              onToggleTask={() => updateMsg(m.id, { done: !m.done })}
              onReact={(e) => toggleReaction(m.id, e)} />
          );
        })}
      </div>

      {/* Composer */}
      <div className="ne-composer">
        <div className="ne-kind-row">
          {[
            { k: 'text',  label: 'msg',  glyph: '¶' },
            { k: 'task',  label: 'task', glyph: '☐' },
            { k: 'link',  label: 'link', glyph: '⌘' },
            { k: 'quote', label: 'quote',glyph: '“' },
          ].map(({ k, label, glyph }) => (
            <button key={k}
              className={'ne-kind' + (composerKind === k ? ' active' : '')}
              onClick={() => setComposerKind(k)}>
              <span className="ne-kind-g">{glyph}</span>{label}
            </button>
          ))}
          <span className="ne-fmt-hint mono">**bold** · *italic* · `code` · @mention · #tag</span>
        </div>
        <div className="ne-input-wrap">
          <span className="ne-avatar me">me</span>
          <textarea
            className="ne-input"
            placeholder={
              composerKind === 'task' ? 'New task — what needs doing?' :
              composerKind === 'link' ? 'Paste a URL…' :
              composerKind === 'quote' ? 'Quote a passage…' :
              'Reply to this thread…'
            }
            value={composer}
            onChange={(e) => setComposer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
            }}
            rows={composer.split('\n').length || 1}
          />
          <div className="ne-input-actions">
            <button className="ne-icon-btn" title="Attach">⌇</button>
            <button className="ne-icon-btn" title="Emoji">☺</button>
            <button className={'ne-send' + (composer.trim() ? ' ready' : '')}
              onClick={send} disabled={!composer.trim()}>
              <span className="mono">⌘⏎</span> send
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function sameMin(a, b) {
  return a && b && a.slice(0, 5) === b.slice(0, 5);
}

function NeTagInput({ onAdd }) {
  const [v, setV] = useStateNE('');
  return (
    <input
      className="ne-tag-input"
      placeholder="+ tag"
      value={v}
      onChange={(e) => setV(e.target.value.replace(/\s+/g, ''))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && v) { onAdd(v); setV(''); }
      }}
    />
  );
}

// Format inline markdown-ish syntax → React fragments
function fmt(text) {
  if (!text) return null;
  const out = [];
  // very light parse: **bold**, *italic*, `code`, @mention, #tag, http(s) urls
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@\w+|#\w+|https?:\/\/\S+)/g;
  let last = 0; let m; let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={key++}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith('**')) out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('*')) out.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    else if (tok.startsWith('`')) out.push(<code key={key++} className="ne-code-inline">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('@')) out.push(<span key={key++} className="ne-mention">{tok}</span>);
    else if (tok.startsWith('#')) out.push(<span key={key++} className="ne-hashtag">{tok}</span>);
    else if (tok.startsWith('http')) out.push(<a key={key++} className="ne-link" onClick={(e) => e.preventDefault()} href={tok}>{tok}</a>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(<span key={key++}>{text.slice(last)}</span>);
  return out;
}

function Message({ m, note, grouped, editing, editingText, setEditingText, onStartEdit, onCommit, onCancel, onDelete, onToggleTask, onReact }) {
  const [hover, setHover] = useStateNE(false);
  const isMe = m.who === 'me';
  const isSrc = m.who === 'src';

  return (
    <div className={'ne-msg' + (grouped ? ' grouped' : '') + (isSrc ? ' src' : '')}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {!grouped ? (
        <div className="ne-avatar-col">
          <span className={'ne-avatar' + (isMe ? ' me' : '') + (isSrc ? ' src' : '')}>
            {isMe ? 'me' : isSrc ? SRC_LABEL[note.src] : '?'}
          </span>
        </div>
      ) : (
        <div className="ne-avatar-col">
          <span className="ne-mini-time mono">{m.t}</span>
        </div>
      )}
      <div className="ne-msg-body">
        {!grouped && (
          <div className="ne-msg-head">
            <span className="ne-msg-author">
              {isMe ? 'You' : isSrc ? note.author : 'Unknown'}
            </span>
            {isSrc && <span className="ne-msg-via mono">via {SRC_NAME[note.src]}</span>}
            <span className="ne-msg-t mono">{m.t}</span>
          </div>
        )}

        {/* Body — varies by kind */}
        {editing ? (
          <div className="ne-edit">
            <textarea
              className="ne-edit-input"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              autoFocus
              rows={Math.max(1, editingText.split('\n').length)}
            />
            <div className="ne-edit-actions">
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>esc to cancel · ⌘⏎ to save</span>
              <button className="ne-btn-sm secondary" onClick={onCancel}>cancel</button>
              <button className="ne-btn-sm" onClick={onCommit}>save</button>
            </div>
          </div>
        ) : (
          <MessageContent m={m} onToggleTask={onToggleTask} />
        )}

        {/* Reactions */}
        {m.reactions && m.reactions.length > 0 && (
          <div className="ne-reactions">
            {m.reactions.map((r, i) => (
              <span key={i} className="ne-reaction" onClick={() => onReact(r.e)}>
                <span>{r.e}</span><span className="mono tab">{r.n}</span>
              </span>
            ))}
            <button className="ne-reaction add" onClick={() => onReact('👍')}>+</button>
          </div>
        )}
      </div>

      {/* Hover toolbar */}
      {hover && !editing && (
        <div className="ne-msg-tools">
          <button title="React" onClick={() => onReact('👍')}>☺</button>
          <button title="Edit" onClick={onStartEdit}>✎</button>
          <button title="Reply">↳</button>
          {!isSrc && <button title="Delete" onClick={onDelete}>✕</button>}
        </div>
      )}
    </div>
  );
}

function MessageContent({ m, onToggleTask }) {
  if (m.kind === 'task') {
    return (
      <div className="ne-task">
        <button onClick={onToggleTask}
          className={'ne-task-box' + (m.done ? ' done' : '')}>{m.done ? '✓' : ''}</button>
        <span className={'ne-task-text' + (m.done ? ' done' : '')}>{fmt(m.body)}</span>
      </div>
    );
  }
  if (m.kind === 'link' && m.meta) {
    return (
      <div>
        <a className="ne-link" href={m.body} onClick={(e) => e.preventDefault()}>{m.body}</a>
        <div className="ne-link-card">
          <div className="ne-link-card-site mono">{m.meta.site}</div>
          <div className="ne-link-card-title">{m.meta.title}</div>
          <div className="ne-link-card-desc">{m.meta.desc}</div>
        </div>
      </div>
    );
  }
  if (m.kind === 'link') {
    return <a className="ne-link" href={m.body} onClick={(e) => e.preventDefault()}>{m.body}</a>;
  }
  if (m.kind === 'quote') {
    return <blockquote className="ne-quote">{fmt(m.body)}</blockquote>;
  }
  return <div className="ne-text">{fmt(m.body)}</div>;
}

Object.assign(window, { NoteEditor });
