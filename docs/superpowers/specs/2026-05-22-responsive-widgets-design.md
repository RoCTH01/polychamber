# Responsive Widgets Design

**Date:** 2026-05-22
**Status:** Approved

---

## Goal

Make every widget adapt its content layout as it is resized by the user, and make the overall app grid adapt as the Electron window is resized. Text must never overflow or break the container at any size.

---

## Architecture

Two independent layers:

1. **Container queries** — each `.widget-body` is a named CSS container. `@container` rules inside each widget's stylesheet section adapt the internal content layout at `sm / md / lg` width thresholds.
2. **Window breakpoints** — CSS `@media` rules on `.grid` and `.toolbar` adapt the grid column count and toolbar density as the viewport width changes.

All changes are CSS-only. No JS, no ResizeObserver, no new props on widget components. The existing `container-type` declaration goes on `.widget-body` in `globals.css`; per-widget `@container` rules go in the same file grouped by widget.

---

## Global Text Rules

These apply at every size, everywhere in the app. Added to the base styles in `globals.css`.

| Element | Rule |
|---|---|
| All widget titles (`.w-title`) | `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` |
| Monospace data — timestamps, counts, source codes | `white-space: nowrap; font-variant-numeric: tabular-nums` |
| KPI labels (`.kpi-label`) | `white-space: nowrap` — prevents "DAILY\nAVG" line break |
| Tag rows | `flex-wrap: wrap` at md+, `display: none` at sm |
| Multi-line title clamps | `-webkit-line-clamp` — 1 line at sm, 2 at md, none at lg |

---

## Layer 1 — Container Query Breakpoints

### Setup

Add to `.widget-body` in `globals.css`:

```css
.widget-body {
  container-type: inline-size;
  container-name: widget;
}
```

### Size tiers

| Tier | Threshold | Intent |
|---|---|---|
| `sm` | `width < 220px` | Minimal — strip metadata, 1-line clamp, hide secondary sections |
| `md` | `220px ≤ width < 400px` | Standard — 2-line clamp, author visible, secondary sections hidden |
| `lg` | `width ≥ 400px` | Full — all sections, full padding, unrestricted titles |

---

### Feed widget (`FeedWidget.tsx`)

**SM (`< 220px`)**
- `.feed-row` padding: `6px 8px`
- Title: `font-size: var(--fs-xs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Author row: `display: none`
- Tags row: `display: none`
- Timestamp: visible, mono, right-aligned

**MD (`220–400px`)**
- `.feed-row` padding: `7px 10px`
- Title: `font-size: var(--fs-sm); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`
- Author row: visible at `font-size: var(--fs-xs)`
- Tags row: `display: none`

**LG (`≥ 400px`)**
- `.feed-row` padding: `9px 14px`
- Title: `font-size: var(--fs-sm); line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden`
- Author row: visible
- Tags row: `display: flex; flex-wrap: wrap; gap: 4px`

---

### Activity / Heatmap widget (`HeatmapWidget.tsx`)

**SM (`< 220px`)**
- KPI row: show only 2 KPIs (Total + Streak), `grid-template-columns: 1fr 1fr`
- KPI value: `font-size: 16px`
- Heatmap grid: 13-column (`grid-template-columns: repeat(13, minmax(0, 1fr))`) — last 13 weeks
- Hourly histogram section: `display: none`
- Source breakdown row: `display: none`
- KPI labels: `white-space: nowrap; font-size: 8px`

**MD (`220–400px`)**
- KPI row: all 4 KPIs, `grid-template-columns: repeat(4, 1fr)`
- KPI value: `font-size: 18px`
- Heatmap grid: 26-column (last 26 weeks / 30d mode)
- Hourly histogram: `display: none`
- Source breakdown: `display: none`

**LG (`≥ 400px`)**
- KPI row: all 4 KPIs, comfortable spacing
- KPI value: `font-size: 20px`
- Heatmap grid: full (as currently, driven by the `view` prop)
- Hourly histogram: visible
- Source breakdown: visible

---

### Calendar widget (`CalendarWidget.tsx`)

**SM (`< 280px`)**
- Day header names: single letter (`M T W T F S S`)
- Day number: `font-size: 10px`
- Time label column: `display: none` — removes the 32px left column
- Grid: `grid-template-columns: repeat(7, 1fr)` (no time column)
- Events: render as a colored dot only (no title text)
- Hour row height: `16px` (compressed)

**LG (`≥ 280px`)**
- Day header names: 3-letter abbreviation (`MON TUE WED`)
- Time label column: visible, `32px` wide
- Grid: `grid-template-columns: 32px repeat(7, 1fr)`
- Events: show title text, truncated with ellipsis
- Hour row height: `28px`

*(Calendar only has 2 tiers — the content is inherently spatial and the jump from dot-only to text is the main meaningful change.)*

---

### Focus widget (`FocusWidget.tsx`)

**SM (`< 240px`)**
- Layout: `flex-direction: column; align-items: center`
- Timer ring: `width: 64px; height: 64px`
- Timer font: `font-size: 14px`
- Task name: visible, centered, 1-line truncated
- Session history bars: `display: none`
- Pause/Reset buttons: stack vertically, full width

**LG (`≥ 240px`)**
- Layout: `flex-direction: row; gap: 14px`
- Timer ring: `width: 80px; height: 80px` (current size)
- Task name + session bars: in the right column
- Session bars: visible

---

### Funnel widget (`FunnelWidget.tsx`)

**SM (`< 220px`)**
- Row layout: `flex-direction: column; gap: 3px`
- Badge: smaller, `font-size: 8px`
- Title: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Metadata (source label, timestamp): `display: none`

**LG (`≥ 220px`)**
- Row layout: `flex-direction: row` (current)
- Title: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` — still truncates but in one line
- Metadata: visible

---

### Reminders widget (`RemindersWidget.tsx`)

**SM (`< 220px`)**
- Reminder text: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Date/time badge: `display: none`
- Section header padding: `4px 8px`

**LG (`≥ 220px`)**
- Reminder text: `overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical` — up to 2 lines
- Date/time badge: visible

---

## Layer 2 — Window Breakpoints

### Grid behaviour

The 12-column grid stays at 12 columns at all window widths. Each column is `1fr` so columns naturally get narrower as the window shrinks — widgets shrink proportionally. Container queries on each widget body then handle the content adaptation at the appropriate size tier.

No grid column-count reflow is needed. Rewriting column counts would break explicit `grid-column: x / span w` positions stored in the layout database.

### Workspace min-width

```css
.workspace { min-width: 480px; }
```

Below 480px the workspace scrolls horizontally instead of crushing further.

### Toolbar collapse

Requires a one-time markup change in `Toolbar.tsx`: wrap each button's text in a `<span className="tb-label">` so CSS can target it independently from the icon.

```tsx
// Before
<button className="tb-btn"><Icon name="grid" /> Layout</button>

// After
<button className="tb-btn"><Icon name="grid" /><span className="tb-label"> Layout</span></button>
```

Apply this to all four buttons: Layout, All sources, Today, Capture.

CSS rules in `globals.css`:

```css
/* Narrow: hide button text labels, keep icons */
@media (max-width: 1100px) {
  .toolbar .tb-label { display: none; }
  .toolbar .tb-search { min-width: 180px; }
}

/* Very narrow: hide status strip too */
@media (max-width: 800px) {
  .toolbar .tb-btn:not(.tb-btn-capture) { display: none; }
  .toolbar .tb-divider { display: none; }
  .toolbar .mono { display: none; }   /* status strip */
  .toolbar .tb-search { flex: 1; }
}
```

The Capture button (`.tb-btn-capture`) always stays visible — it is the primary action and must remain reachable at every window size. Add `tb-btn-capture` class to the Capture button in `Toolbar.tsx`.

---

## Files to Change

| File | Changes |
|---|---|
| `app/src/app/globals.css` | Add `container-type` to `.widget-body`; add global text rules; add all `@container` rules for Feed, Heatmap, Calendar, Focus, Funnel, Reminders; add `@media` rules for toolbar + workspace min-width |
| `app/src/components/layout/Toolbar.tsx` | Wrap button labels in `<span className="tb-label">`; add `tb-btn-capture` class to Capture button |

---

## What stays the same

- Widget drag, resize, and free-placement behavior
- Layout persistence in the database
- All animation timings
- The density system (`--gap`, `--pad`, `--row-h`)
- Widget component logic
