# Responsive Widgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CSS container queries to all 6 widgets so content adapts as widgets are resized, plus window-level toolbar collapse and workspace min-width.

**Architecture:** Two layers — (1) `container-type: inline-size` on `.widget-body` enables `@container widget` rules in `globals.css` that adapt each widget's internal layout at sm/md/lg thresholds; (2) `@media` rules handle toolbar label collapse and workspace floor. Because widgets use inline styles heavily, a small class name is added to the one or two elements per widget that need responsive CSS targeting — the class addition is the only `.tsx` change per widget.

**Tech Stack:** CSS Container Queries (Chromium/Electron), CSS `@media`, React/Next.js

---

### Task 1: Foundation — container-type, global text rules, workspace min-width

**Files:**
- Modify: `app/src/app/globals.css`

- [ ] **Step 1: Add `container-type` to `.widget-body`**

Find `.widget-body {` and add two lines:

```css
.widget-body {
  container-type: inline-size;
  container-name: widget;
  flex: 1; overflow: auto;
  padding: var(--pad);
  scrollbar-width: thin; scrollbar-color: var(--border) transparent;
  min-height: 0;
}
```

- [ ] **Step 2: Add global text-overflow rules after the `.widget-body` block**

```css
/* ── Global responsive text rules ───────────────────────────────────────── */
.w-title {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-width: 0;
}
.w-meta {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-width: 0;
}
/* Monospace data never wraps */
.mono.tab, .mono[class~="tab"] { white-space: nowrap; }
```

- [ ] **Step 3: Add workspace min-width**

Find `.workspace {` and add `min-width: 480px;`:

```css
.workspace {
  flex: 1;
  position: relative;
  overflow: auto;
  min-width: 480px;
  background: ...
```

- [ ] **Step 4: Commit**

```bash
cd app && git add src/app/globals.css && git commit -m "style: container-type on widget-body, global text overflow rules"
```

---

### Task 2: Toolbar markup + window breakpoints

**Files:**
- Modify: `app/src/components/layout/Toolbar.tsx`
- Modify: `app/src/app/globals.css`

- [ ] **Step 1: Wrap button labels in `.tb-label` spans and add `.tb-btn-capture` to Capture**

Replace the entire Toolbar return with:

```tsx
return (
  <div className="toolbar">
    <button className="tb-btn"><Icon name="grid" /><span className="tb-label"> Layout</span></button>
    <button className="tb-btn"><Icon name="filter" /><span className="tb-label"> All sources</span></button>
    <button className="tb-btn"><Icon name="clock" /><span className="tb-label"> Today</span></button>
    <div className="tb-divider" />
    <button className="tb-btn tb-btn-capture"><Icon name="plus" /><span className="tb-label"> Capture</span></button>
    <div className="tb-divider" />
    <span className="mono tb-status" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)', letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flexShrink: 1 }}>
      SOURCES <span style={{ color: 'var(--accent)' }}>5/5</span>
      <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
      SYNC <span style={{ color: 'var(--text-2)' }}>live</span>
      <span style={{ margin: '0 8px', color: 'var(--text-4)' }}>·</span>
      INBOX <span style={{ color: 'var(--text-2)' }}>—</span>
    </span>
    <div className="tb-spacer" />
    <div className="tb-search">
      <Icon name="search" />
      <span>Search across all sources…</span>
      <span className="kbd">⌘K</span>
    </div>
  </div>
)
```

- [ ] **Step 2: Add `@media` toolbar rules to `globals.css` — after the `.toolbar` block**

```css
/* ── Toolbar responsive collapse ─────────────────────────────────────────── */
@media (max-width: 1100px) {
  .toolbar .tb-label { display: none; }
  .toolbar .tb-search { min-width: 180px; }
}

@media (max-width: 800px) {
  .toolbar .tb-btn:not(.tb-btn-capture) { display: none; }
  .toolbar .tb-divider { display: none; }
  .toolbar .tb-status { display: none; }
  .toolbar .tb-search { flex: 1; min-width: 0; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/layout/Toolbar.tsx
git commit -m "style: toolbar collapses labels at narrow window widths"
```

---

### Task 3: Feed widget container queries

**Files:**
- Modify: `app/src/components/widgets/FeedWidget.tsx` — add `feed-body` class
- Modify: `app/src/app/globals.css` — add `@container` rules

- [ ] **Step 1: Add `feed-body` class to the body text div in `FeedWidget.tsx`**

Find the body text div (currently `style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.55 ... }}`) and add `className="feed-body"`:

```tsx
<div className="feed-body" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.55, textWrap: 'pretty' } as React.CSSProperties}>
  {note.body}
</div>
```

- [ ] **Step 2: Add Feed container query rules to `globals.css`**

Add after the `.feed-row` block:

```css
/* ── Feed widget — container queries ─────────────────────────────────────── */
@container widget (max-width: 219px) {
  .feed-row { padding: 5px 8px; }
  .feed-body {
    font-size: var(--fs-xs);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  /* hide author/time row at SM — keep only the title */
  .feed-row .row.gap-8 { display: none; }
  /* hide tags */
  .feed-row .row.gap-4 { display: none; }
}

@container widget (min-width: 220px) and (max-width: 399px) {
  .feed-row { padding: 7px 10px; }
  .feed-body {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* hide tags at MD */
  .feed-row .row.gap-4 { display: none; }
}

@container widget (min-width: 400px) {
  .feed-row { padding: 9px 14px; }
  .feed-body {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .feed-row .row.gap-4 { display: flex; flex-wrap: wrap; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/widgets/FeedWidget.tsx
git commit -m "style: feed widget container queries — sm/md/lg content tiers"
```

---

### Task 4: Heatmap widget container queries

**Files:**
- Modify: `app/src/components/widgets/HeatmapWidget.tsx` — add class names to sections
- Modify: `app/src/components/ui/Kpi.tsx` — add `white-space: nowrap` to label
- Modify: `app/src/app/globals.css` — add `@container` rules

- [ ] **Step 1: Fix KPI label wrapping in `Kpi.tsx`**

Add `whiteSpace: 'nowrap'` to the label div so "DAILY AVG" never breaks:

```tsx
<div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</div>
```

- [ ] **Step 2: Add class names to section wrappers in `HeatmapWidget.tsx`**

Three additions:

(a) KPI row — add `className="hm-kpi-row row gap-12"` (replacing `className="row gap-12"`):
```tsx
<div className="hm-kpi-row row gap-12" style={{ flexShrink: 0 }}>
```

(b) Hourly histogram section — add `className="hm-hourly"` to its outer div:
```tsx
<div className="hm-hourly" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0 }}>
```

(c) Source breakdown — add `className="hm-sources"` to its outer div:
```tsx
<div className="hm-sources" style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
```

- [ ] **Step 3: Add Heatmap container query rules to `globals.css`**

```css
/* ── Heatmap widget — container queries ──────────────────────────────────── */
@container widget (max-width: 219px) {
  /* Show only 2 KPIs — hide 3rd and 4th children of the KPI row */
  .hm-kpi-row > *:nth-child(n+3) { display: none; }
  /* Hide legend (less/more swatches) */
  .hm-kpi-row > div[style*="marginLeft"] { display: none; }
  /* Hide hourly histogram and source breakdown */
  .hm-hourly  { display: none; }
  .hm-sources { display: none; }
}

@container widget (min-width: 220px) and (max-width: 399px) {
  /* All 4 KPIs visible, but hide histogram and sources */
  .hm-hourly  { display: none; }
  .hm-sources { display: none; }
}

@container widget (min-width: 400px) {
  /* Full layout — everything visible, already the default */
  .hm-hourly  { display: flex; }
  .hm-sources { display: block; }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/widgets/HeatmapWidget.tsx
git commit -m "style: heatmap widget container queries — hide histogram/sources at sm"
```

---

### Task 5: Calendar widget container queries

**Files:**
- Modify: `app/src/components/widgets/CalendarWidget.tsx` — add class names
- Modify: `app/src/app/globals.css` — add `@container` rules

- [ ] **Step 1: Add class names to Calendar sections**

(a) Day headers grid — add `className="cal-day-headers"`:
```tsx
<div className="cal-day-headers" style={{ display: 'grid', gridTemplateColumns: '32px repeat(7, 1fr)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
```

(b) The time-label spacer cell (first `<div />` in headers) — add `className="cal-time-col"`:
```tsx
<div className="cal-time-col" />
```

(c) Each day's weekday name span — add `className="cal-day-name"`:
```tsx
<div className="mono cal-day-name" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>
  {d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
</div>
```

- [ ] **Step 2: Add Calendar container query rules to `globals.css`**

```css
/* ── Calendar widget — container queries ─────────────────────────────────── */
@container widget (max-width: 279px) {
  /* Hide the 32px time-label column */
  .cal-time-col { display: none; }
  .cal-day-headers { grid-template-columns: repeat(7, 1fr); }
  /* Abbreviate day names to 1 letter via clip — real label stays in DOM */
  .cal-day-name {
    overflow: hidden;
    max-width: 1ch;
    letter-spacing: 0;
  }
  /* Shrink day number */
  .cal-day-headers .mono.tab { font-size: 11px; }
}

@container widget (min-width: 280px) {
  .cal-time-col { display: block; }
  .cal-day-headers { grid-template-columns: 32px repeat(7, 1fr); }
  .cal-day-name { max-width: none; overflow: visible; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/widgets/CalendarWidget.tsx
git commit -m "style: calendar widget container queries — hide time col and abbreviate days at sm"
```

---

### Task 6: Focus widget container queries

**Files:**
- Modify: `app/src/components/widgets/FocusWidget.tsx` — add class names
- Modify: `app/src/app/globals.css` — add `@container` rules

- [ ] **Step 1: Add class names in `FocusWidget.tsx`**

(a) Outer layout div — add `className="focus-layout"`:
```tsx
<div className="focus-layout" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
```

(b) Session history section (the div with `borderTop`) — add `className="focus-sessions"`:
```tsx
<div className="focus-sessions" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
```

(c) SVG timer `<svg>` — add `className="focus-ring"`:
```tsx
<svg className="focus-ring" width="76" height="76" viewBox="0 0 76 76">
```

- [ ] **Step 2: Add Focus container query rules to `globals.css`**

```css
/* ── Focus widget — container queries ────────────────────────────────────── */
@container widget (max-width: 239px) {
  /* Stack vertically, center everything */
  .focus-layout { align-items: center; }
  /* Shrink the timer ring */
  .focus-ring { width: 60px !important; height: 60px !important; }
  /* Hide sessions at SM */
  .focus-sessions { display: none; }
}

@container widget (min-width: 240px) {
  .focus-layout { align-items: flex-start; }
  .focus-ring { width: 76px !important; height: 76px !important; }
  .focus-sessions { display: block; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/components/widgets/FocusWidget.tsx
git commit -m "style: focus widget container queries — hide sessions at sm"
```

---

### Task 7: Funnel + Reminders container queries

**Files:**
- Modify: `app/src/components/widgets/FunnelWidget.tsx` — add class name
- Modify: `app/src/components/widgets/RemindersWidget.tsx` — add class name
- Modify: `app/src/app/globals.css` — add `@container` rules for both

- [ ] **Step 1: Add `funnel-meta` class in `FunnelWidget.tsx`**

Find the metadata row inside the funnel row and add `className="funnel-meta mono row gap-4"`:

```tsx
<div className="funnel-meta mono row gap-4" style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2 }}>
  <span>{f.funnel?.source}</span>
  <span style={{ opacity: 0.4 }}>·</span>
  <span className="tab">{f.funnel?.est}</span>
</div>
```

- [ ] **Step 2: Add `rem-text` class in `RemindersWidget.tsx`**

Find the reminder body `<span>` and add `className="rem-text"`:

```tsx
<span className="rem-text" style={{ flex: 1, fontSize: 'var(--fs-sm)', color: r.reminder?.done ? 'var(--text-4)' : 'var(--text)', textDecoration: r.reminder?.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
  {r.body}
</span>
```

- [ ] **Step 3: Add Funnel + Reminders container query rules to `globals.css`**

```css
/* ── Funnel widget — container queries ───────────────────────────────────── */
@container widget (max-width: 219px) {
  .funnel-row { padding: 6px 8px; }
  .funnel-meta { display: none; }
}

@container widget (min-width: 220px) {
  .funnel-row { padding: 7px var(--pad); }
  .funnel-meta { display: flex; }
}

/* ── Reminders widget — container queries ────────────────────────────────── */
@container widget (max-width: 219px) {
  .rem-text {
    /* Already has overflow: hidden and text-overflow: ellipsis via inline style.
       At SM reduce font size slightly for tighter fit. */
    font-size: var(--fs-xs) !important;
  }
}

@container widget (min-width: 220px) {
  .rem-text {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: normal !important;  /* allow 2-line wrap at MD+ */
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/components/widgets/FunnelWidget.tsx src/components/widgets/RemindersWidget.tsx
git commit -m "style: funnel + reminders container queries"
```

---

### Task 8: Visual verification

**Files:** None — observation only

- [ ] **Step 1: Start dev server**

```bash
cd app && npm run dev:next
```

Open `http://localhost:3000`.

- [ ] **Step 2: Test widget resize — Feed**

Drag the Feed widget's right-resize handle to make it very narrow (< 220px):
- Author/time row and tags should disappear
- Titles truncate to 1 line with `…`

Widen to 220–400px:
- Author visible, 2-line clamp on long titles

Widen past 400px:
- Tags row visible, 3-line clamp

- [ ] **Step 3: Test widget resize — Activity**

Narrow to < 220px:
- Only 2 KPIs (Total + Streak), histogram hidden, sources hidden

220–400px:
- All 4 KPIs, histogram still hidden

> 400px:
- Full layout including hourly histogram

- [ ] **Step 4: Test widget resize — Calendar**

Narrow to < 280px:
- Time-label column disappears
- Day names truncate to single letter (M T W T F S S)

Widen past 280px:
- Time column reappears, full 3-letter day names

- [ ] **Step 5: Test widget resize — Focus**

Narrow to < 240px:
- Session history hidden
- Timer ring shrinks

Widen past 240px:
- Sessions reappear

- [ ] **Step 6: Test toolbar collapse**

Resize Electron window to ~1000px wide:
- Button text labels disappear, icons remain

Resize to ~700px wide:
- All toolbar buttons except Capture disappear
- Search takes full width

- [ ] **Step 7: Verify no text overflow anywhere**

Check each widget at its smallest useful size — no text should overflow its container. Titles should end in `…`, not clip or wrap into the next row.

- [ ] **Step 8: Commit any last fixes, then done**
