// app.jsx — LifeMonitor app shell + workspace + drag-rearrange + tweaks

const { useState, useEffect, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "density": "compact",
  "heatmapScale": "accent",
  "monoChrome": false,
  "showGrid": true,
  "scanlines": false,
  "showHeatmap": true,
  "showFeed": true,
  "showCalendar": true,
  "showFunnel": true,
  "showFocus": true,
  "showReminders": true
}/*EDITMODE-END*/;

// Workspace layouts — each item: { id, type, x, y, w, h }
const LAYOUTS = {
  research: {
    name: 'research',
    items: [
      { id: 'heatmap',   type: 'heatmap',   x: 0, y: 0, w: 8, h: 7 },
      { id: 'focus',     type: 'focus',     x: 8, y: 0, w: 4, h: 7 },
      { id: 'feed',      type: 'feed',      x: 0, y: 7, w: 5, h: 9 },
      { id: 'calendar',  type: 'calendar',  x: 5, y: 7, w: 7, h: 9 },
      { id: 'funnel',    type: 'funnel',    x: 0, y: 16, w: 7, h: 7 },
      { id: 'reminders', type: 'reminders', x: 7, y: 16, w: 5, h: 7 },
    ],
  },
  shipping: {
    name: 'shipping',
    items: [
      { id: 'focus',     type: 'focus',     x: 0, y: 0, w: 4, h: 7 },
      { id: 'reminders', type: 'reminders', x: 4, y: 0, w: 4, h: 7 },
      { id: 'calendar',  type: 'calendar',  x: 8, y: 0, w: 4, h: 9 },
      { id: 'feed',      type: 'feed',      x: 0, y: 7, w: 8, h: 8 },
      { id: 'heatmap',   type: 'heatmap',   x: 0, y: 15, w: 8, h: 6 },
      { id: 'funnel',    type: 'funnel',    x: 8, y: 9, w: 4, h: 12 },
    ],
  },
  reading: {
    name: 'reading',
    items: [
      { id: 'funnel',    type: 'funnel',    x: 0, y: 0, w: 7, h: 10 },
      { id: 'feed',      type: 'feed',      x: 7, y: 0, w: 5, h: 14 },
      { id: 'heatmap',   type: 'heatmap',   x: 0, y: 10, w: 7, h: 6 },
      { id: 'calendar',  type: 'calendar',  x: 0, y: 16, w: 7, h: 8 },
      { id: 'focus',     type: 'focus',     x: 7, y: 14, w: 5, h: 5 },
      { id: 'reminders', type: 'reminders', x: 7, y: 19, w: 5, h: 5 },
    ],
  },
};

const WIDGET_REGISTRY = {
  heatmap:   HeatmapWidget,
  feed:      FeedWidget,
  calendar:  CalendarWidget,
  funnel:    FunnelWidget,
  focus:     FocusWidget,
  reminders: RemindersWidget,
};

const VISIBILITY_KEY = {
  heatmap: 'showHeatmap', feed: 'showFeed', calendar: 'showCalendar',
  funnel: 'showFunnel', focus: 'showFocus', reminders: 'showReminders',
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeWs, setActiveWs] = useState('research');
  const [layouts, setLayouts] = useState(LAYOUTS);
  const [notes, setNotes] = useState(NOTES);
  const [openNoteId, setOpenNoteId] = useState(null);
  const layout = layouts[activeWs];

  const openNote = notes.find(n => n.id === openNoteId);
  const updateNote = (updated) => {
    setNotes(ns => ns.map(n => n.id === updated.id ? { ...updated, body: updated.messages[0].body } : n));
  };

  // Drag state
  const [drag, setDrag] = useState(null); // { id, fromIndex }
  const [dragOver, setDragOver] = useState(null);

  const visible = layout.items.filter(it => t[VISIBILITY_KEY[it.type]]);

  const onDragStart = useCallback((id) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDrag({ id });
  }, []);
  const onDragEnd = useCallback(() => { setDrag(null); setDragOver(null); }, []);
  const onDragOver = useCallback((id) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (drag && drag.id !== id) setDragOver(id);
  }, [drag]);
  const onDrop = useCallback((targetId) => (e) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;
    setLayouts(prev => {
      const items = [...prev[activeWs].items];
      const a = items.findIndex(i => i.id === sourceId);
      const b = items.findIndex(i => i.id === targetId);
      if (a < 0 || b < 0) return prev;
      // Swap positions (x, y, w, h)
      const A = items[a], B = items[b];
      items[a] = { ...A, x: B.x, y: B.y, w: B.w, h: B.h };
      items[b] = { ...B, x: A.x, y: A.y, w: A.w, h: A.h };
      return { ...prev, [activeWs]: { ...prev[activeWs], items } };
    });
    setDrag(null);
    setDragOver(null);
  }, [activeWs]);

  return (
    <div className="app" data-theme={t.theme} data-density={t.density}>
      <Sidebar activeWs={activeWs} setActiveWs={setActiveWs} workspaces={Object.keys(layouts)} />
      <div className="app-main">
      <Toolbar t={t} setTweak={setTweak} />
      <div className="workspace" style={{
        backgroundImage: t.showGrid ? undefined : 'none',
      }}>
        <div className="grid">
          {visible.map((it) => {
            const Comp = WIDGET_REGISTRY[it.type];
            const isDragging = drag?.id === it.id;
            const isTarget = dragOver === it.id;
            return (
              <div key={it.id}
                style={{
                  gridColumn: `${it.x + 1} / span ${it.w}`,
                  gridRow: `${it.y + 1} / span ${it.h}`,
                  minWidth: 0, minHeight: 0,
                  display: 'flex',
                }}>
                <div style={{ width: '100%', height: '100%', display: 'flex' }}
                  onDragOver={onDragOver(it.id)}
                  onDrop={onDrop(it.id)}>
                  <div style={{
                    width: '100%', height: '100%',
                    opacity: isDragging ? 0.35 : 1,
                    outline: isTarget ? '1.5px dashed var(--accent)' : 'none',
                    outlineOffset: -1, borderRadius: 6,
                    transition: 'opacity 0.15s',
                  }}>
                    <Comp
                      id={it.id}
                      scaleVariant={t.heatmapScale}
                      notes={notes}
                      openNoteId={openNoteId}
                      onOpenNote={(nid) => setOpenNoteId(nid)}
                      onClose={() => setTweak(VISIBILITY_KEY[it.type], false)}
                      dragHandlers={{
                        draggable: true,
                        onDragStart: onDragStart(it.id),
                        onDragEnd,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {t.scanlines && <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)',
          mixBlendMode: 'multiply',
        }} />}
      </div>
      </div>
      {openNote && (
        <NoteEditor note={openNote} onClose={() => setOpenNoteId(null)} onUpdate={updateNote} />
      )}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme}
          options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'hc', label: 'HC' }]}
          onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Density" value={t.density}
          options={[{ value: 'compact', label: 'Compact' }, { value: 'comfy', label: 'Comfy' }, { value: 'spacious', label: 'Spacious' }]}
          onChange={(v) => setTweak('density', v)} />
        <TweakSection label="Heatmap" />
        <TweakRadio label="Scale" value={t.heatmapScale}
          options={[{ value: 'accent', label: 'Accent' }, { value: 'mono', label: 'Mono' }, { value: 'thermal', label: 'Thermal' }]}
          onChange={(v) => setTweak('heatmapScale', v)} />
        <TweakSection label="Surprise" />
        <TweakToggle label="Background grid" value={t.showGrid} onChange={(v) => setTweak('showGrid', v)} />
        <TweakToggle label="CRT scanlines" value={t.scanlines} onChange={(v) => setTweak('scanlines', v)} />
        <TweakSection label="Widgets" />
        <TweakToggle label="Activity heatmap" value={t.showHeatmap} onChange={(v) => setTweak('showHeatmap', v)} />
        <TweakToggle label="Note feed" value={t.showFeed} onChange={(v) => setTweak('showFeed', v)} />
        <TweakToggle label="Calendar" value={t.showCalendar} onChange={(v) => setTweak('showCalendar', v)} />
        <TweakToggle label="Funnel" value={t.showFunnel} onChange={(v) => setTweak('showFunnel', v)} />
        <TweakToggle label="Focus timer" value={t.showFocus} onChange={(v) => setTweak('showFocus', v)} />
        <TweakToggle label="Reminders" value={t.showReminders} onChange={(v) => setTweak('showReminders', v)} />
      </TweaksPanel>

      {/* Pass scaleVariant via context-ish prop on Heatmap */}
      <ScaleSync value={t.heatmapScale} />
    </div>
  );
}

// Quick hack: Heatmap reads scale from a global window var so we don't have to thread props
function ScaleSync({ value }) {
  useEffect(() => { window.__heatmapScale = value; }, [value]);
  return null;
}

function Sidebar({ activeWs, setActiveWs, workspaces }) {
  const [now, setNow] = useState(NOW);
  useEffect(() => {
    const t = setInterval(() => setNow(prev => new Date(prev.getTime() + 60000)), 4000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  const initial = (w) => w.slice(0, 2);
  return (
    <div className="sidebar">
      <div className="sb-logo" title="LifeMonitor">L/M</div>
      <div className="sb-divider" />
      {workspaces.map((w) => (
        <div key={w}
             className={'sb-ws' + (w === activeWs ? ' active' : '')}
             onClick={() => setActiveWs(w)}>
          <span className="sb-pip" />
          {initial(w)}
          <span className="sb-tip">{w}</span>
        </div>
      ))}
      <div className="sb-add" title="New workspace">+</div>
      <div className="sb-foot">
        <div className="sb-divider" />
        <div className="sb-status">
          <span className="sb-pulse" title="online" />
          <span className="tab">{time}</span>
        </div>
      </div>
    </div>
  );
}

function Toolbar({ t, setTweak }) {
  return (
    <div className="toolbar">
      <button className="tb-btn"><Icon name="grid" /> Layout</button>
      <button className="tb-btn"><Icon name="filter" /> All sources</button>
      <button className="tb-btn"><Icon name="clock" /> Today</button>
      <div className="tb-divider" />
      <button className="tb-btn"><Icon name="plus" /> Capture</button>

      <div className="tb-divider" />
      <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
        SOURCES <span style={{ color: 'var(--accent)' }}>5/5</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        SYNC <span style={{ color: 'var(--text-2)' }}>12s</span>
        <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
        INBOX <span style={{ color: 'var(--text-2)' }}>38</span>
      </span>

      <div className="tb-spacer" />

      <div className="tb-search">
        <Icon name="search" />
        <span>Search across all sources…</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="tb-divider" />
      <button className="tb-btn" onClick={() => setTweak('theme', t.theme === 'dark' ? 'light' : 'dark')}
        title="Toggle theme">
        <Icon name={t.theme === 'dark' ? 'sun' : 'moon'} />
      </button>
      <button className="tb-btn" title="Settings"><Icon name="cog" /></button>
    </div>
  );
}

function Icon({ name }) {
  const props = { className: 'tb-icon', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'grid':   return <svg {...props}><rect x="2" y="2" width="5" height="5" /><rect x="9" y="2" width="5" height="5" /><rect x="2" y="9" width="5" height="5" /><rect x="9" y="9" width="5" height="5" /></svg>;
    case 'filter':return <svg {...props}><path d="M2 3h12l-4.5 6V14L6.5 12V9L2 3Z" /></svg>;
    case 'clock': return <svg {...props}><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" /></svg>;
    case 'plus':  return <svg {...props}><path d="M8 3v10M3 8h10" /></svg>;
    case 'search':return <svg {...props}><circle cx="7" cy="7" r="4.5" /><path d="m11 11 3 3" /></svg>;
    case 'sun':   return <svg {...props}><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3" /></svg>;
    case 'moon':  return <svg {...props}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z" /></svg>;
    case 'cog':   return <svg {...props}><circle cx="8" cy="8" r="2" /><path d="M8 1v2M8 13v2M15 8h-2M3 8H1M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4M12.7 12.7l-1.4-1.4M4.7 4.7 3.3 3.3" /></svg>;
    default: return null;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
