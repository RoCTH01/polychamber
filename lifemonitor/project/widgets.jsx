// widgets.jsx — All widget components for LifeMonitor

const { useState, useEffect, useMemo, useRef } = React;

// ── Shared header pieces ────────────────────────────────────────────────────
function Tabs({ tabs, value, onChange }) {
  return (
    <div className="w-tabs">
      {tabs.map((t) => (
        <div key={t} className={'w-tab' + (value === t ? ' active' : '')}
             onClick={(e) => { e.stopPropagation(); onChange(t); }}>{t}</div>
      ))}
    </div>
  );
}

function WidgetShell({ id, title, meta, tabs, tab, onTab, actions, dragHandlers, onClose, children, noPad }) {
  return (
    <div className="widget" data-widget={id} {...dragHandlers}>
      <div className="widget-header" {...(dragHandlers?.headerHandlers || {})}>
        <div className="w-handle" />
        <div className="w-title">{title}</div>
        {meta && <div className="w-meta">· {meta}</div>}
        {tabs && <Tabs tabs={tabs} value={tab} onChange={onTab} />}
        <div className="w-actions">
          {actions}
          <button className="w-act" title="Refresh" onClick={(e) => e.stopPropagation()}>↻</button>
          <button className="w-act" title="Close" onClick={(e) => { e.stopPropagation(); onClose && onClose(); }}>×</button>
        </div>
      </div>
      <div className={'widget-body' + (noPad ? ' no-pad' : '')}>{children}</div>
    </div>
  );
}

// ── 1. HEATMAP + ANALYTICS ──────────────────────────────────────────────────
function HeatmapWidget({ id, dragHandlers, onClose, scaleVariant }) {
  const days = useMemo(() => genHeatmap(), []);
  const [hover, setHover] = useState(null);
  const [view, setView] = useState('365d');

  // Group into weeks (53 cols × 7 rows). First col may be partial.
  const weeks = useMemo(() => {
    const w = [];
    let cur = [];
    days.forEach((d, i) => {
      const dow = d.date.getDay();
      if (i === 0) {
        for (let p = 0; p < dow; p++) cur.push(null);
      }
      cur.push(d);
      if (cur.length === 7) { w.push(cur); cur = []; }
    });
    if (cur.length) { while (cur.length < 7) cur.push(null); w.push(cur); }
    return w;
  }, [days]);

  const total = days.reduce((a, d) => a + d.count, 0);
  const max = Math.max(...days.map(d => d.count));
  const streak = useMemo(() => {
    let s = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].count > 0) s++; else break;
    }
    return s;
  }, [days]);

  // Color scale variants
  const scaleColor = (count) => {
    if (count === 0) return 'var(--panel-hi)';
    const t = Math.min(1, count / Math.max(max, 1));
    const stop = Math.ceil(t * 4); // 1-4
    if (scaleVariant === 'mono') {
      const lights = [0.30, 0.45, 0.60, 0.75, 0.92];
      return `oklch(${lights[stop]} 0.005 240)`;
    }
    if (scaleVariant === 'thermal') {
      const hues = [null, 250, 200, 80, 30];
      const lights = [null, 0.55, 0.65, 0.78, 0.72];
      return `oklch(${lights[stop]} 0.13 ${hues[stop]})`;
    }
    // accent (default): single-hue ramp, desat → saturated
    const lights = [0.30, 0.42, 0.55, 0.68, 0.80];
    const chromas = [0.02, 0.04, 0.06, 0.08, 0.10];
    return `oklch(${lights[stop]} ${chromas[stop]} 220)`;
  };

  const tooltipText = (d) => {
    if (!d) return '';
    const dt = d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${d.count} entries · ${dt}`;
  };

  // Hourly histogram for analytics row
  const hourly = useMemo(() => {
    const arr = Array(24).fill(0);
    // synthesize a plausible distribution: peaks at 10, 14, 21
    for (let h = 0; h < 24; h++) {
      const a = Math.exp(-((h - 10) ** 2) / 8) * 12;
      const b = Math.exp(-((h - 14) ** 2) / 6) * 9;
      const c = Math.exp(-((h - 21) ** 2) / 4) * 7;
      arr[h] = Math.round(a + b + c + (h % 3));
    }
    return arr;
  }, []);
  const hourMax = Math.max(...hourly);

  return (
    <WidgetShell id={id} title="ACTIVITY" meta="365d · all sources"
      tabs={['365d', '90d', '30d']} tab={view} onTab={setView}
      dragHandlers={dragHandlers} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* KPI row */}
        <div className="row gap-12" style={{ flexShrink: 0 }}>
          <Kpi label="TOTAL" value={total.toLocaleString()} />
          <Kpi label="STREAK" value={`${streak}d`} accent />
          <Kpi label="DAILY AVG" value={(total / 365).toFixed(1)} />
          <Kpi label="PEAK DAY" value={max} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>less</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0, 1, 3, 6, 10].map((c) => (
                <div key={c} style={{ width: 9, height: 9, background: scaleColor(c), borderRadius: 2 }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>more</span>
          </div>
        </div>

        {/* Heatmap grid — fills width, fixed aspect ratio per cell */}
        <div style={{ position: 'relative', flexShrink: 0, paddingLeft: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gap: 3, width: '100%' }}>
            {weeks.map((wk, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 3, aspectRatio: '1 / 7' }}>
                {wk.map((d, j) => (
                  <div
                    key={j}
                    style={{
                      width: '100%', aspectRatio: '1 / 1', borderRadius: 2,
                      background: d ? scaleColor(d.count) : 'transparent',
                      cursor: d ? 'default' : 'auto',
                      outline: hover && d && hover.date === d.date ? '1px solid var(--text-2)' : 'none',
                      outlineOffset: 1,
                    }}
                    onMouseEnter={() => d && setHover(d)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </div>
            ))}
          </div>
          {/* Day-of-week labels */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'grid', gridTemplateRows: 'repeat(7, 1fr)', gap: 3, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', width: 18 }}>
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center' }}>{l}</div>
            ))}
          </div>
          {/* Tooltip */}
          {hover && (
            <div className="mono tab" style={{
              position: 'absolute', top: -16, right: 0,
              fontSize: 'var(--fs-xs)', color: 'var(--text-2)',
            }}>{tooltipText(hover)}</div>
          )}
        </div>

        {/* Hourly histogram */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', letterSpacing: '0.06em' }}>HOURLY · LAST 30D</span>
            <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>peak 14:00</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, flex: 1, minHeight: 24 }}>
            {hourly.map((v, h) => (
              <div key={h} style={{
                flex: 1, height: `${(v / hourMax) * 100}%`,
                background: scaleColor(Math.round((v / hourMax) * max)),
                borderRadius: '1px 1px 0 0',
                minHeight: 1,
              }} title={`${h.toString().padStart(2,'0')}:00 · ${v}`} />
            ))}
          </div>
          <div style={{ display: 'flex', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', marginTop: -2 }}>
            {[0, 6, 12, 18].map((h) => (
              <div key={h} style={{ flex: h === 18 ? 'none' : 1 }}>{h.toString().padStart(2,'0')}</div>
            ))}
            <div style={{ marginLeft: 'auto' }}>23</div>
          </div>
        </div>

        {/* Source breakdown */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            {SOURCE_BREAKDOWN.map((s) => (
              <div key={s.src} className="row gap-6">
                <span className={`src-icon src-${s.src}`}>{SRC_LABEL[s.src]}</span>
                <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{s.count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}

function Kpi({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>{label}</div>
      <div className="mono tab" style={{ fontSize: 'var(--fs-lg)', color: accent ? 'var(--accent)' : 'var(--text)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ── 2. UNIFIED NOTE FEED ────────────────────────────────────────────────────
function FeedWidget({ id, dragHandlers, onClose, openNoteId, onOpenNote, notes }) {
  const [src, setSrc] = useState('All');
  const sources = ['All', 'TW', 'DC', 'OB', 'MN', 'RD'];
  const list = notes || NOTES;
  const filtered = src === 'All' ? list : list.filter(n => SRC_LABEL[n.src] === src);

  return (
    <WidgetShell id={id} title="FEED" meta={`${filtered.length} entries · live`}
      tabs={sources} tab={src} onTab={setSrc}
      dragHandlers={dragHandlers} onClose={onClose} noPad>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filtered.map((n, i) => (
          <NoteRow key={n.id} note={n} first={i === 0}
            active={openNoteId === n.id}
            onClick={() => onOpenNote && onOpenNote(n.id)} />
        ))}
      </div>
    </WidgetShell>
  );
}

function NoteRow({ note, first, active, onClick }) {
  return (
    <div className={'feed-row' + (active ? ' active' : '')} style={{
      padding: 'calc(var(--pad) * 0.85) var(--pad)',
      borderTop: first ? 'none' : '1px solid var(--border-subtle)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }} onClick={onClick}>
      <div className="row gap-8">
        <span className={`src-icon src-${note.src}`}>{SRC_LABEL[note.src]}</span>
        <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontWeight: 500 }}>{note.author}</span>
        {note.messages && note.messages.length > 1 && (
          <span className="mono tab" style={{ fontSize: 9.5, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '0 4px', borderRadius: 3 }}>
            {note.messages.length}
          </span>
        )}
        <span className="mono tab muted-2" style={{ fontSize: 'var(--fs-xs)', marginLeft: 'auto' }}>{note.t}</span>
        {note.starred && <span style={{ color: 'var(--warn)', fontSize: 11 }}>★</span>}
      </div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.45, textWrap: 'pretty' }}>{note.body}</div>
      {note.tags && note.tags.length > 0 && (
        <div className="row gap-4" style={{ flexWrap: 'wrap' }}>
          {note.tags.map((t) => (
            <span key={t} className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)' }}>#{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3. CALENDAR ─────────────────────────────────────────────────────────────
function CalendarWidget({ id, dragHandlers, onClose }) {
  const startHour = 8;
  const endHour = 22;
  const hours = endHour - startHour;
  // current week starts Monday
  const weekStart = new Date(NOW);
  const dow = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayIdx = days.findIndex(d => d.toDateString() === NOW.toDateString());
  const nowFrac = (NOW.getHours() + NOW.getMinutes() / 60 - startHour) / hours;

  const kindColor = (k) => {
    if (k === 'meet') return { bg: 'var(--accent-soft)', border: 'var(--accent-line)', text: 'var(--accent)' };
    if (k === 'focus') return { bg: 'oklch(from var(--ok) l c h / 0.14)', border: 'oklch(from var(--ok) l c h / 0.4)', text: 'var(--ok)' };
    return { bg: 'oklch(from var(--warn) l c h / 0.14)', border: 'oklch(from var(--warn) l c h / 0.4)', text: 'var(--warn)' };
  };

  const monthLabel = days[0].toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();

  return (
    <WidgetShell id={id} title="CALENDAR" meta={`${monthLabel} · wk ${getISOWeek(NOW)}`}
      dragHandlers={dragHandlers} onClose={onClose} noPad
      actions={
        <>
          <button className="w-act" title="Prev" onClick={(e) => e.stopPropagation()}>‹</button>
          <button className="w-act" title="Next" onClick={(e) => e.stopPropagation()}>›</button>
        </>
      }>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div />
          {days.map((d, i) => (
            <div key={i} style={{
              padding: '6px 8px', textAlign: 'left',
              borderLeft: '1px solid var(--border-subtle)',
              background: i === todayIdx ? 'var(--accent-soft)' : 'transparent',
            }}>
              <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>
                {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className="mono tab" style={{
                fontSize: 'var(--fs-md)', fontWeight: 500,
                color: i === todayIdx ? 'var(--accent)' : 'var(--text)',
              }}>{d.getDate()}</div>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div style={{ flex: 1, position: 'relative', display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', minHeight: 0, overflow: 'auto' }}>
          {/* Hour gutter */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {Array.from({ length: hours }, (_, h) => (
              <div key={h} style={{
                height: 30, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)',
                paddingRight: 4, textAlign: 'right', paddingTop: 2,
                borderTop: '1px solid var(--border-subtle)',
              }}>{(startHour + h).toString().padStart(2, '0')}</div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((d, i) => (
            <div key={i} style={{
              position: 'relative',
              borderLeft: '1px solid var(--border-subtle)',
              background: i === todayIdx ? 'oklch(from var(--accent) l c h / 0.04)' : 'transparent',
            }}>
              {/* Hour rows */}
              {Array.from({ length: hours }, (_, h) => (
                <div key={h} style={{ height: 30, borderTop: '1px solid var(--border-subtle)' }} />
              ))}
              {/* Events for this day */}
              {CAL_EVENTS.filter(e => e.day === i).map((e, j) => {
                const top = (e.start - startHour) * 30;
                const height = (e.end - e.start) * 30 - 2;
                const c = kindColor(e.kind);
                return (
                  <div key={j} style={{
                    position: 'absolute', left: 2, right: 2, top, height,
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderLeft: `2px solid ${c.text}`,
                    borderRadius: 3, padding: '3px 5px',
                    fontSize: 'var(--fs-xs)', color: c.text,
                    overflow: 'hidden',
                    boxShadow: e.current ? '0 0 0 1px var(--accent)' : 'none',
                  }}>
                    <div className="mono tab" style={{ fontSize: 9, opacity: 0.85 }}>
                      {fmtH(e.start)}–{fmtH(e.end)}
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: 'var(--fs-xs)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                  </div>
                );
              })}
              {/* Now line */}
              {i === todayIdx && nowFrac > 0 && nowFrac < 1 && (
                <div style={{
                  position: 'absolute', left: 0, right: 0,
                  top: nowFrac * hours * 30,
                  height: 1, background: 'var(--bad)', zIndex: 5,
                }}>
                  <div style={{
                    position: 'absolute', left: -3, top: -3,
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--bad)',
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Inline note input */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px var(--pad)', background: 'var(--panel-2)' }}>
          <div className="row gap-6">
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>+ NOTE @ NOW</span>
            <input
              placeholder="Pairing notes — Maya · retrieval bug repro…"
              style={{
                flex: 1, height: 20, background: 'transparent', border: 0, outline: 'none',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', color: 'var(--text)',
              }} />
            <span className="chip">⏎</span>
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}

function fmtH(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
}

function getISOWeek(d) {
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const week1 = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// ── 4. FUNNEL — Read/Watch later ────────────────────────────────────────────
function FunnelWidget({ id, dragHandlers, onClose }) {
  const [tag, setTag] = useState('next');
  const groups = { next: [], soon: [], later: [] };
  FUNNEL.forEach(f => groups[f.tag].push(f));
  const items = groups[tag];

  const kindGlyph = {
    paper: '◆', video: '▶', article: '¶', thread: '≋',
  };

  return (
    <WidgetShell id={id} title="FUNNEL" meta={`${FUNNEL.length} queued`}
      tabs={['next', 'soon', 'later']} tab={tag} onTab={setTag}
      dragHandlers={dragHandlers} onClose={onClose} noPad>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((f, i) => (
          <div key={f.id} style={{
            padding: '8px var(--pad)',
            borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', gap: 10,
            cursor: 'default',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel-2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = ''}>
            <span className="mono" style={{ width: 12, color: 'var(--accent)', fontSize: 11, textAlign: 'center' }}>
              {kindGlyph[f.kind]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</div>
              <div className="mono row gap-6" style={{ fontSize: 9.5, color: 'var(--text-4)', marginTop: 2 }}>
                <span>{f.source}</span>
                <span>·</span>
                <span className="tab">{f.est}</span>
                <span>·</span>
                <span className="tab">added {f.added}</span>
              </div>
            </div>
            <div className="row gap-4">
              <button className="w-act" title="Move to next" style={{ width: 16, height: 16 }}>→</button>
              <button className="w-act" title="Archive" style={{ width: 16, height: 16 }}>✓</button>
            </div>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

// ── 5. FOCUS / NOW-PLAYING ──────────────────────────────────────────────────
function FocusWidget({ id, dragHandlers, onClose }) {
  const [running, setRunning] = useState(true);
  const [seconds, setSeconds] = useState(28 * 60 + 17); // current session elapsed

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const target = 50 * 60;
  const pct = Math.min(1, seconds / target);
  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;
  const totalToday = FOCUS_SESSIONS_TODAY.reduce((a, s) => a + s.minutes, 0) + Math.floor(seconds / 60);

  // Ring
  const R = 32, C = 2 * Math.PI * R;
  const dash = C * pct;

  return (
    <WidgetShell id={id} title="FOCUS" meta={running ? '● running' : '○ paused'}
      dragHandlers={dragHandlers} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div className="row gap-12" style={{ alignItems: 'center' }}>
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={R} fill="none" stroke="var(--panel-hi)" strokeWidth="4" />
            <circle cx="38" cy="38" r={R} fill="none"
              stroke="var(--accent)" strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              transform="rotate(-90 38 38)" />
            <text x="38" y="40" textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-mono)" fontSize="13" fontWeight="500"
              fill="var(--text)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmt(seconds)}
            </text>
            <text x="38" y="52" textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-mono)" fontSize="8"
              fill="var(--text-4)">/ 50:00</text>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>NOW</div>
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', fontWeight: 500, marginBottom: 2 }}>Agents prototype</div>
            <div className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>session 3 of 4</div>
            <div className="row gap-4" style={{ marginTop: 8 }}>
              <button onClick={() => setRunning(r => !r)}
                style={{
                  height: 22, padding: '0 10px',
                  background: running ? 'var(--panel-hi)' : 'var(--accent)',
                  color: running ? 'var(--text)' : 'var(--bg)',
                  border: '1px solid ' + (running ? 'var(--border)' : 'var(--accent)'),
                  borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
                  cursor: 'default', letterSpacing: '0.04em',
                }}>{running ? '❚❚ PAUSE' : '▶ RESUME'}</button>
              <button onClick={() => setSeconds(0)}
                style={{
                  height: 22, padding: '0 10px',
                  background: 'transparent', color: 'var(--text-3)',
                  border: '1px solid var(--border-subtle)', borderRadius: 4,
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)',
                  cursor: 'default', letterSpacing: '0.04em',
                }}>↻ RESET</button>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>TODAY · DEEP WORK</span>
            <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{Math.floor(totalToday / 60)}h {totalToday % 60}m</span>
          </div>
          {[...FOCUS_SESSIONS_TODAY, { label: 'Agents prototype (live)', minutes: Math.floor(seconds / 60), live: true }].map((s, i) => (
            <div key={i} className="row gap-8" style={{ marginBottom: 3 }}>
              <span style={{ flex: 1, fontSize: 'var(--fs-xs)', color: s.live ? 'var(--accent)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              <div style={{ width: 80, height: 4, background: 'var(--panel-hi)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(s.minutes / 120) * 100}%`, height: '100%', background: s.live ? 'var(--accent)' : 'var(--text-3)' }} />
              </div>
              <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', minWidth: 32, textAlign: 'right' }}>{s.minutes}m</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetShell>
  );
}

// ── 6. REMINDERS ────────────────────────────────────────────────────────────
function RemindersWidget({ id, dragHandlers, onClose }) {
  const [items, setItems] = useState(REMINDERS);
  const [filter, setFilter] = useState('open');
  const visible = filter === 'open' ? items.filter(r => !r.done) : items;

  const groups = {};
  visible.forEach(r => {
    const k = r.due;
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  });

  const toggle = (id) => setItems(items.map(r => r.id === id ? { ...r, done: !r.done } : r));

  const order = ['today', 'tomorrow', 'this wk', 'next wk'];

  return (
    <WidgetShell id={id} title="REMINDERS" meta={`${items.filter(r=>!r.done).length} open`}
      tabs={['open', 'all']} tab={filter} onTab={setFilter}
      dragHandlers={dragHandlers} onClose={onClose} noPad>
      <div style={{ padding: '6px 0' }}>
        {order.filter(k => groups[k]).map((k) => (
          <div key={k}>
            <div className="mono" style={{
              padding: '4px var(--pad)',
              fontSize: 9, letterSpacing: '0.08em',
              color: k === 'today' ? 'var(--accent)' : 'var(--text-4)',
            }}>{k.toUpperCase()}</div>
            {groups[k].map((r) => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px var(--pad)',
                cursor: 'default',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel-2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                <button onClick={() => toggle(r.id)} style={{
                  width: 13, height: 13, padding: 0,
                  border: '1px solid ' + (r.done ? 'var(--accent)' : 'var(--border)'),
                  background: r.done ? 'var(--accent)' : 'transparent',
                  borderRadius: 3, cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  color: r.done ? 'var(--bg)' : 'transparent',
                  fontSize: 9, lineHeight: 1,
                }}>✓</button>
                <span className="dot" style={{
                  background: r.pri === 1 ? 'var(--bad)' : r.pri === 2 ? 'var(--warn)' : 'var(--text-4)',
                }} />
                <span style={{
                  flex: 1, fontSize: 'var(--fs-sm)',
                  color: r.done ? 'var(--text-4)' : 'var(--text)',
                  textDecoration: r.done ? 'line-through' : 'none',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{r.body}</span>
              </div>
            ))}
          </div>
        ))}
        <div style={{ padding: '6px var(--pad)', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
          <div className="row gap-6">
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>+ NEW</span>
            <input placeholder="add reminder…"
              style={{
                flex: 1, height: 18, background: 'transparent', border: 0, outline: 'none',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-sm)', color: 'var(--text)',
              }} />
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}

Object.assign(window, {
  HeatmapWidget, FeedWidget, CalendarWidget, FunnelWidget, FocusWidget, RemindersWidget,
});
