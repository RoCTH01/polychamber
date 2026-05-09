'use client'

import { useState, useMemo } from 'react'
import WidgetShell from './WidgetShell'
import Kpi from '../ui/Kpi'
import { useActivity } from '@/hooks/useActivity'
import { useAppStore } from '@/store/app'
import type { DragHandlers, ActivityDay } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void }

const SRC_BREAKDOWN = [
  { src: 'tw', label: 'Twitter' }, { src: 'ob', label: 'Obsidian' },
  { src: 'dc', label: 'Discord' }, { src: 'mn', label: 'Notes' }, { src: 'rd', label: 'Reddit' },
]
const SRC_LABEL: Record<string, string> = { tw: 'TW', ob: 'OB', dc: 'DC', mn: 'MN', rd: 'RD' }

export default function HeatmapWidget({ id, dragHandlers, onClose }: Props) {
  const heatmapScale = useAppStore(s => s.heatmapScale)
  const [view, setView] = useState('365d')
  const days365 = useActivity(365)
  const days90  = useActivity(90)
  const days30  = useActivity(30)

  const allDays = view === '90d' ? days90.activity : view === '30d' ? days30.activity : days365.activity
  const [hover, setHover] = useState<ActivityDay | null>(null)

  const weeks = useMemo(() => {
    const w: (ActivityDay | null)[][] = []
    let cur: (ActivityDay | null)[] = []
    allDays.forEach((d, i) => {
      const dow = new Date(d.date + 'T00:00:00').getDay()
      if (i === 0) for (let p = 0; p < dow; p++) cur.push(null)
      cur.push(d)
      if (cur.length === 7) { w.push(cur); cur = [] }
    })
    if (cur.length) { while (cur.length < 7) cur.push(null); w.push(cur) }
    return w
  }, [allDays])

  const total  = allDays.reduce((a, d) => a + d.count, 0)
  const maxVal = Math.max(...allDays.map(d => d.count), 1)
  const streak = useMemo(() => {
    let s = 0
    for (let i = allDays.length - 1; i >= 0; i--) {
      if (allDays[i].count > 0) s++; else break
    }
    return s
  }, [allDays])

  const srcTotals = useMemo(() => {
    const acc: Record<string, number> = {}
    allDays.forEach(d => Object.entries(d.sourceBreakdown).forEach(([k, v]) => { acc[k] = (acc[k] ?? 0) + v }))
    return acc
  }, [allDays])

  const scaleColor = (count: number) => {
    if (count === 0) return 'var(--panel-hi)'
    const t = Math.min(1, count / maxVal)
    const stop = Math.ceil(t * 4)
    if (heatmapScale === 'mono') {
      const l = [0.30, 0.45, 0.60, 0.75, 0.92][stop]
      return `oklch(${l} 0.005 240)`
    }
    if (heatmapScale === 'thermal') {
      const hues = [null, 250, 200, 80, 30]
      const ls   = [null, 0.55, 0.65, 0.78, 0.72]
      return `oklch(${ls[stop]} 0.13 ${hues[stop]})`
    }
    const ls = [0.30, 0.42, 0.55, 0.68, 0.80]
    const cs = [0.02, 0.04, 0.06, 0.08, 0.10]
    return `oklch(${ls[stop]} ${cs[stop]} 220)`
  }

  const hourly = useMemo(() => {
    const arr = Array(24).fill(0)
    for (let h = 0; h < 24; h++) {
      const a = Math.exp(-((h - 10) ** 2) / 8) * 12
      const b = Math.exp(-((h - 14) ** 2) / 6) * 9
      const c = Math.exp(-((h - 21) ** 2) / 4) * 7
      arr[h] = Math.round(a + b + c + (h % 3))
    }
    return arr
  }, [])
  const hourMax = Math.max(...hourly)

  return (
    <WidgetShell id={id} title="ACTIVITY" meta={`${view} · all sources`}
      tabs={['365d', '90d', '30d']} tab={view} onTab={setView}
      dragHandlers={dragHandlers} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        {/* KPI row */}
        <div className="row gap-12" style={{ flexShrink: 0 }}>
          <Kpi label="TOTAL"     value={total.toLocaleString()} />
          <Kpi label="STREAK"    value={`${streak}d`} accent />
          <Kpi label="DAILY AVG" value={(total / Math.max(allDays.length, 1)).toFixed(1)} />
          <Kpi label="PEAK DAY"  value={maxVal} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>less</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {[0, 1, 3, 6, 10].map(c => (
                <div key={c} style={{ width: 9, height: 9, background: scaleColor(c), borderRadius: 2 }} />
              ))}
            </div>
            <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4)' }}>more</span>
          </div>
        </div>

        {/* Tile-graph header — reserved row so the hover tooltip never overlaps the KPI boxes */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: 14, paddingLeft: 22 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.07em' }}>DAILY</span>
          {hover && (
            <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
              {hover.count} entries · {new Date(hover.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Heatmap grid — single flat CSS grid, column-per-week, no aspect-ratio tricks.
            365d uses minmax(0, TILE_PX) so columns shrink to fit narrow widgets but
            never balloon. 90d / 30d use fixed px columns (naturally sized, no stretch).
            Explicit row heights mean tiles never overflow their tracks.              */}
        {(() => {
          const TILE_GAP = 3
          // 365d uses slightly smaller tiles; 90d/30d stay at 11px
          const TILE_PX  = view === '365d' ? 10 : 11
          const gridH    = 7 * TILE_PX + 6 * TILE_GAP   // e.g. 88px or 95px — no overflow

          // Flatten weeks into a single sequence ordered column-by-column so
          // grid-auto-flow: column fills each week-column top→bottom automatically.
          const flatDays = weeks.flatMap(wk => wk)

          return (
            <div style={{ position: 'relative', flexShrink: 0, paddingLeft: 22, height: gridH }}>
              <div style={{
                display: 'grid',
                // 365d: columns shrink to fit but cap at TILE_PX — fills width without overflowing
                // 90d/30d: fixed pixel columns, grid width = content, no stretching
                gridTemplateColumns: view === '365d'
                  ? `repeat(${weeks.length}, minmax(0, ${TILE_PX}px))`
                  : `repeat(${weeks.length}, ${TILE_PX}px)`,
                gridTemplateRows: `repeat(7, ${TILE_PX}px)`,  // explicit → no aspect-ratio conflict
                gridAutoFlow: 'column',   // place items week-by-week (column-major)
                gap: TILE_GAP,
                width: '100%',
                height: '100%',
              }}>
                {flatDays.map((d, i) => (
                  <div key={i} style={{
                    width: '100%', height: '100%',
                    borderRadius: 2,
                    background: d ? scaleColor(d.count) : 'transparent',
                    outline: hover && d && hover.date === d.date ? '1px solid var(--text-2)' : 'none',
                    outlineOffset: 1,
                  }}
                    onMouseEnter={() => d && setHover(d)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </div>

              {/* Day-of-week labels — explicit row heights match tile rows exactly */}
              <div style={{
                position: 'absolute', left: 0, top: 0, height: gridH,
                display: 'grid', gridTemplateRows: `repeat(7, ${TILE_PX}px)`, gap: TILE_GAP,
                fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', width: 18,
              }}>
                {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center' }}>{l}</div>
                ))}
              </div>
            </div>
          )
        })()}

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
                background: scaleColor(Math.round((v / hourMax) * maxVal)),
                borderRadius: '1px 1px 0 0', minHeight: 1,
              }} title={`${String(h).padStart(2, '0')}:00 · ${v}`} />
            ))}
          </div>
          <div style={{ display: 'flex', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', marginTop: -2 }}>
            {[0, 6, 12, 18].map(h => <div key={h} style={{ flex: h === 18 ? 'none' : 1 }}>{String(h).padStart(2, '0')}</div>)}
            <div style={{ marginLeft: 'auto' }}>23</div>
          </div>
        </div>

        {/* Source breakdown */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
            {SRC_BREAKDOWN.map(s => (
              <div key={s.src} className="row gap-6">
                <span className={`src-icon src-${s.src}`}>{SRC_LABEL[s.src]}</span>
                <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
                  {(srcTotals[s.src] ?? 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetShell>
  )
}
