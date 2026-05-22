'use client'

import { useState, useEffect } from 'react'
import WidgetShell from './WidgetShell'
import { useItems } from '@/hooks/useItems'
import type { DragHandlers } from '@/types'

interface Props { id: string; dragHandlers: DragHandlers; onClose: () => void }

const TARGET = 50 * 60 // 50 min in seconds

export default function FocusWidget({ id, dragHandlers, onClose }: Props) {
  const [running, setRunning] = useState(true)
  const [seconds, setSeconds] = useState(28 * 60 + 17)
  const [sessionStart] = useState(() => new Date())
  const { items: sessions, createItem } = useItems({ kind: 'focus_session' })

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  // Persist session when paused
  const handlePause = async () => {
    setRunning(false)
    if (seconds > 30) {
      await createItem({
        kind: 'focus_session',
        body: 'Agents prototype',
        focus: { startedAt: sessionStart.toISOString(), endedAt: new Date().toISOString(), durationMinutes: Math.floor(seconds / 60) } as import('@/types').ItemFocus,
      })
    }
  }

  const pct  = Math.min(1, seconds / TARGET)
  const R    = 32
  const C    = 2 * Math.PI * R
  const dash = C * pct
  const fmt  = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const todayMin = sessions
    .filter(s => s.focus && new Date(s.focus.startedAt).toDateString() === new Date().toDateString())
    .reduce((a, s) => a + (s.focus?.durationMinutes ?? 0), 0) + Math.floor(seconds / 60)

  const prevSessions = [
    { label: 'Eval harness', minutes: 92 },
    { label: 'Reading',      minutes: 34 },
  ]

  return (
    <WidgetShell id={id} title="Focus" meta={running ? '● running' : '○ paused'}
      dragHandlers={dragHandlers} onClose={onClose}>
      <div className="focus-layout" style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div className="row gap-12" style={{ alignItems: 'center' }}>
          <svg className="focus-ring" width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r={R} fill="none" stroke="var(--panel-hi)" strokeWidth="4" />
            <circle cx="38" cy="38" r={R} fill="none" stroke="var(--accent)" strokeWidth="4"
              strokeLinecap="round" strokeDasharray={`${dash} ${C}`} transform="rotate(-90 38 38)" />
            <text x="38" y="40" textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-mono)" fontSize="13" fontWeight="500" fill="var(--text)"
              style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(seconds)}</text>
            <text x="38" y="52" textAnchor="middle" dominantBaseline="middle"
              fontFamily="var(--font-mono)" fontSize="8" fill="var(--text-4)">/ 50:00</text>
          </svg>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>NOW</div>
            <div style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Agents prototype</div>
            <div className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>session 3 of 4</div>
            <div className="row gap-4" style={{ marginTop: 8 }}>
              <button onClick={running ? handlePause : () => setRunning(true)}
                style={{ height: 22, padding: '0 10px', background: running ? 'var(--panel-hi)' : 'var(--accent)', color: running ? 'var(--text)' : 'var(--bg)', border: `1px solid ${running ? 'var(--border)' : 'var(--accent)'}`, borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', cursor: 'default', letterSpacing: '0.04em' }}>
                {running ? '❚❚ PAUSE' : '▶ RESUME'}
              </button>
              <button onClick={() => setSeconds(0)}
                style={{ height: 22, padding: '0 10px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border-subtle)', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', cursor: 'default', letterSpacing: '0.04em' }}>
                ↻ RESET
              </button>
            </div>
          </div>
        </div>

        <div className="focus-sessions" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>TODAY · DEEP WORK</span>
            <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2)' }}>{Math.floor(todayMin / 60)}h {todayMin % 60}m</span>
          </div>
          {[...prevSessions, { label: 'Agents prototype (live)', minutes: Math.floor(seconds / 60), live: true }].map((s, i) => (
            <div key={i} className="row gap-8" style={{ marginBottom: 3 }}>
              <span style={{ flex: 1, fontSize: 'var(--fs-xs)', color: (s as { live?: boolean }).live ? 'var(--accent)' : 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              <div style={{ width: 80, height: 4, background: 'var(--panel-hi)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${(s.minutes / 120) * 100}%`, height: '100%', background: (s as { live?: boolean }).live ? 'var(--accent)' : 'var(--text-3)' }} />
              </div>
              <span className="mono tab" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)', minWidth: 32, textAlign: 'right' }}>{s.minutes}m</span>
            </div>
          ))}
        </div>
      </div>
    </WidgetShell>
  )
}
