'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import WidgetShell from './WidgetShell'
import Kpi from '../ui/Kpi'
import { useActivity } from '@/hooks/useActivity'
import { useWorkspaces } from '@/hooks/useWorkspaces'
import { useAppStore } from '@/store/app'
import type { DragHandlers, ActivityDay, HeatmapConfig } from '@/types'

interface Props {
  id: string
  dragHandlers: DragHandlers
  onClose: () => void
  config?: Record<string, unknown>
}

const SRC_BREAKDOWN = [
  { src: 'tw', label: 'Twitter' }, { src: 'ob', label: 'Obsidian' },
  { src: 'dc', label: 'Discord' }, { src: 'mn', label: 'Notes' }, { src: 'rd', label: 'Reddit' },
]
const SRC_LABEL: Record<string, string> = { tw: 'TW', ob: 'OB', dc: 'DC', mn: 'MN', rd: 'RD' }

function parseConfig(raw?: Record<string, unknown>): HeatmapConfig {
  if (!raw) return { mode: 'all' }
  return raw as unknown as HeatmapConfig
}

export default function HeatmapWidget({ id, dragHandlers, onClose, config: rawConfig }: Props) {
  const heatmapScale = useAppStore(s => s.heatmapScale)
  const activeWs     = useAppStore(s => s.activeWorkspace)
  const { workspaces, updateWidgetConfig } = useWorkspaces()
  const ws = workspaces.find(w => w.name === activeWs)

  const hmConfig = parseConfig(rawConfig)
  const [view, setView]       = useState('365d')
  const [configOpen, setConfigOpen] = useState(false)
  const configRef = useRef<HTMLDivElement>(null)

  const [draftMode, setDraftMode]   = useState<HeatmapConfig['mode']>(hmConfig.mode)
  const [draftTag,  setDraftTag]    = useState(hmConfig.tag ?? '')
  const [draftGoal, setDraftGoal]   = useState(hmConfig.goalPerWeek ?? 3)

  useEffect(() => {
    setDraftMode(hmConfig.mode)
    setDraftTag(hmConfig.tag ?? '')
    setDraftGoal(hmConfig.goalPerWeek ?? 3)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawConfig])

  useEffect(() => {
    if (!configOpen) return
    const handler = (e: MouseEvent) => {
      if (configRef.current && !configRef.current.contains(e.target as Node)) setConfigOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [configOpen])

  const days = view === '90d' ? 90 : view === '30d' ? 30 : 365
  const { activity: allDays, mutate } = useActivity(days, hmConfig)

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
    allDays.forEach(d => Object.entries(d.sourceBreakdown ?? {}).forEach(([k, v]) => { acc[k] = (acc[k] ?? 0) + v }))
    return acc
  }, [allDays])

  const scaleColor = (count: number) => {
    if (count === 0) return 'var(--panel-hi)'
    if (hmConfig.mode === 'habit') return 'var(--accent)'
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

  const applyConfig = async () => {
    if (!ws) return
    const newConfig: HeatmapConfig = { mode: draftMode }
    if (draftMode === 'tag' && draftTag.trim()) newConfig.tag = draftTag.trim()
    if (draftMode === 'habit') newConfig.goalPerWeek = draftGoal
    await updateWidgetConfig(ws.id, id, newConfig as unknown as Record<string, unknown>)
    setConfigOpen(false)
  }

  const modeLabel = () => {
    if (hmConfig.mode === 'tag')   return `#${hmConfig.tag}`
    if (hmConfig.mode === 'habit') return `habit ${hmConfig.goalPerWeek ?? 3}×/wk`
    return 'all sources'
  }

  const gearButton = (
    <div ref={configRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setConfigOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 12, padding: '0 4px', lineHeight: 1 }}
        title="Configure heatmap"
      >
        ⚙
      </button>
      {configOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 300,
          background: 'var(--panel-2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 12, width: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.07em' }}>TRACKING MODE</div>
          {(['all', 'tag', 'habit'] as const).map(m => (
            <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 'var(--fs-xs)', color: 'var(--text-2)', fontFamily: 'var(--font-ui)' }}>
              <input type="radio" checked={draftMode === m} onChange={() => setDraftMode(m)} style={{ accentColor: 'var(--accent)' }} />
              {m === 'all' ? 'All activity' : m === 'tag' ? 'Tag filter' : 'Habit tracker'}
            </label>
          ))}
          {draftMode === 'tag' && (
            <input
              value={draftTag}
              onChange={e => setDraftTag(e.target.value)}
              placeholder="tag name (e.g. gym)"
              style={{
                height: 28, padding: '0 8px',
                background: 'var(--panel-hi)', border: '1px solid var(--border)',
                borderRadius: 4, color: 'var(--text)',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-xs)', outline: 'none',
              }}
            />
          )}
          {draftMode === 'habit' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>Goal:</span>
              <input
                type="number" min={1} max={7}
                value={draftGoal}
                onChange={e => setDraftGoal(Number(e.target.value))}
                style={{
                  width: 40, height: 28, padding: '0 6px',
                  background: 'var(--panel-hi)', border: '1px solid var(--border)',
                  borderRadius: 4, color: 'var(--text)',
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', outline: 'none',
                }}
              />
              <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', fontFamily: 'var(--font-ui)' }}>×/week</span>
            </div>
          )}
          <button
            onClick={applyConfig}
            style={{
              height: 28, background: 'var(--accent)', color: 'var(--bg)',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-xs)',
            }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )

  return (
    <WidgetShell id={id} title="Activity" meta={`${view} · ${modeLabel()}`}
      tabs={['365d', '90d', '30d']} tab={view} onTab={setView}
      dragHandlers={dragHandlers} onClose={onClose}
      onRefresh={mutate}
      extraHeaderActions={gearButton}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
        <div className="hm-kpi-row row gap-12" style={{ flexShrink: 0 }}>
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

        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, height: 14, paddingLeft: 22 }}>
          <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.07em' }}>DAILY</span>
          {hover && (
            <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>
              {hover.count} entries · {new Date(hover.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {(() => {
          const TILE_GAP = 3
          const TILE_PX  = view === '365d' ? 10 : 11
          const gridH    = 7 * TILE_PX + 6 * TILE_GAP
          const flatDays = weeks.flatMap(wk => wk)
          return (
            <div style={{ position: 'relative', flexShrink: 0, paddingLeft: 22, height: gridH }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: view === '365d'
                  ? `repeat(${weeks.length}, minmax(0, ${TILE_PX}px))`
                  : `repeat(${weeks.length}, ${TILE_PX}px)`,
                gridTemplateRows: `repeat(7, ${TILE_PX}px)`,
                gridAutoFlow: 'column',
                gap: TILE_GAP,
                width: '100%',
                height: '100%',
              }}>
                {flatDays.map((d, i) => (
                  <div key={i} style={{
                    width: '100%', height: '100%', borderRadius: 2,
                    background: d ? scaleColor(d.count) : 'transparent',
                    outline: hover && d && hover.date === d.date ? '1px solid var(--text-2)' : 'none',
                    outlineOffset: 1,
                  }}
                    onMouseEnter={() => d && setHover(d)}
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </div>
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

        {hmConfig.mode === 'all' && (
          <div className="hm-sources" style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
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
        )}

        {hmConfig.mode === 'habit' && (
          <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
            {(() => {
              const goal = hmConfig.goalPerWeek ?? 3
              const today = new Date()
              const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
              const weekStart = new Date(today)
              weekStart.setDate(today.getDate() - dayOfWeek)
              weekStart.setHours(0, 0, 0, 0)
              const thisWeekCount = allDays.filter(d => {
                const date = new Date(d.date + 'T00:00:00')
                return date >= weekStart && d.count > 0
              }).length
              const pct = Math.min(1, thisWeekCount / goal)
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>THIS WEEK</span>
                    <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: thisWeekCount >= goal ? 'var(--accent)' : 'var(--text-2)' }}>
                      {thisWeekCount}/{goal}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--panel-hi)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct * 100}%`, height: '100%', background: thisWeekCount >= goal ? 'var(--accent)' : 'var(--text-3)', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}
