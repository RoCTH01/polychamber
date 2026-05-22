# Visual Design Refresh — Polychamber

**Date:** 2026-05-22
**Status:** Approved

---

## Goal

Make the UI more pleasurable to read while keeping its command-center aesthetic. Inspired by Readwise Reader: calm, editorial, warm where it counts. The core principle is a **cold data / warm action** split — the reading layer stays cool and neutral, the interactive layer glows warm amber.

---

## Color System

### Dark theme token changes

| Token | Current | New |
|---|---|---|
| `--bg` | `oklch(0.18 0.005 240)` | `oklch(0.10 0.002 60)` |
| `--bg-grid` | `oklch(0.20 0.006 240)` | `oklch(0.12 0.002 60)` |
| `--panel` | `oklch(0.215 0.006 240)` | `oklch(0.14 0.002 60)` |
| `--panel-2` | `oklch(0.245 0.006 240)` | `oklch(0.17 0.002 60)` |
| `--panel-hi` | `oklch(0.275 0.007 240)` | `oklch(0.20 0.002 60)` |
| `--border` | `oklch(0.32 0.008 240)` | `oklch(0.26 0.002 60)` |
| `--border-subtle` | `oklch(0.27 0.006 240)` | `oklch(0.20 0.002 60)` |
| `--text` | `oklch(0.94 0.005 240)` | `oklch(0.90 0.006 80)` — warm cream |
| `--text-2` | `oklch(0.74 0.008 240)` | `oklch(0.62 0.010 70)` |
| `--text-3` | `oklch(0.55 0.008 240)` | `oklch(0.46 0.008 70)` |
| `--text-4` | `oklch(0.42 0.008 240)` | `oklch(0.35 0.006 70)` |
| `--accent` | `oklch(0.78 0.06 220)` | `oklch(0.75 0.14 60)` — warm amber |
| `--accent-soft` | `oklch(0.78 0.06 220 / 0.16)` | `oklch(0.75 0.14 60 / 0.14)` |
| `--accent-line` | `oklch(0.78 0.06 220 / 0.35)` | `oklch(0.75 0.14 60 / 0.30)` |

The light and high-contrast themes get the same hue-shift treatment (240 → 60–80 range), keeping luminance and chroma values as-is.

### The rule: cold data, warm action

- **Warm amber** (`--accent`): selected/active rows, primary action buttons, hover tints on interactive rows, starred items, overdue timestamps, focus rings, send buttons when ready.
- **Cool/neutral**: all body text, titles, metadata, timestamps, tags, counts, borders, backgrounds. Everything you read passively.

---

## Typography

### Monospace usage — keep vs. remove

**Keep JetBrains Mono for:**
- Counts and quantities (`24`, `3.2k`, `90d`)
- Timestamps and dates (`2:41pm`, `Sep 2021`, `8m read`)
- Two-letter source badge codes (`TW`, `OB`, `RD`)
- KPI numbers in Heatmap and Focus widgets

**Switch to Inter for:**
- All widget titles (`.w-title`) — currently ALL CAPS MONO
- All tags and chips (`.chip`, `.ne-tag-chip`, `.w-tab`) — currently ALL CAPS MONO
- Settings section labels (`.settings-section-label`) — currently ALL CAPS MONO
- Note editor tag chips

### Widget titles
- Font: Inter, weight 500
- Case: Sentence case (not uppercase)
- Size: 11px
- Letter-spacing: 0.01em (not 0.05–0.08em)
- Count stays mono: `Feed <span mono>24</span>`

### Tags and chips
- Font: Inter, weight 400
- Case: lowercase
- Height: 18px (up from 16px)
- Border-radius: 5px (up from 3px)
- Padding: 0 8px
- Active/accent chips: warm amber tint (`--accent-soft` background, `--accent` text)

### Body text and line-heights
- Feed item titles: 12.5px Inter, `line-height: 1.55`
- Note editor body (`.ne-text`): 13.5px, `line-height: 1.65`
- Current 1.35–1.45 is terminal density, not reading density

---

## Widget Header

Remove the contrasting `--panel-2` background from `.widget-header`. Use the same background as the widget body (`--panel`). The bottom border alone acts as the separator.

- Height: 26px (down from 28px)
- Background: `var(--panel)` (same as widget body)
- Title: Inter sentence case, not MONO CAPS
- Makes the header feel like a label, not a navbar — content leads

---

## Borders and Depth

Row separators (`border-bottom` on feed/funnel/reminder rows):
- Opacity: ~5% (`oklch(1 0 0 / 0.05)`) — down from ~12–14%
- Hover state provides the visual separation: warm `rgba(accent / 0.05)` background tint on interactive rows, replacing the hard line as the primary affordance

Widget card borders:
- Same treatment — subtle, near-invisible
- Depth conveyed through background luminance steps, not border weight

---

## Action Button Hierarchy

Two tiers:

| Tier | Style | Use |
|---|---|---|
| Primary | Warm amber fill (`--accent-soft` bg, `--accent` text, `--accent-line` border), height 24px | Save, Send, Add, Capture, Confirm |
| Secondary / ghost | Transparent bg, `--border` border, `--text-2` text, height 24px | Cancel, secondary options |

Applies to: `.ne-btn-sm`, `.ne-send.ready`, `.ne-kind.active`, add-reminder footer button, `+ Capture` toolbar button.

---

## Files to Change

| File | What changes |
|---|---|
| `app/src/app/globals.css` | All theme tokens, widget-header styles, chip/tag styles, border opacities, button system |
| `app/src/app/note-editor.css` | Line-heights, tag chip typography, send button, avatar accent color |
| No component `.tsx` files need changes | All changes are CSS-only |

---

## What stays the same

- The 12-column grid layout
- Widget resize / drag / free-placement behavior
- Density system (`--gap`, `--pad`, `--row-h`) — only type and color change
- Light and high-contrast theme structure — same token names, updated values
- All animation timings
- All spacing values
