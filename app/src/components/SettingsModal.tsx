'use client'

import { useEffect, useRef } from 'react'
import { useAppStore, type FontSize } from '@/store/app'
import type { Theme, Density } from '@/types'

const FONT_SIZE_LABEL: Record<FontSize, string> = {
  small: 'Small', medium: 'Medium', large: 'Large',
}

export default function SettingsModal() {
  const theme          = useAppStore(s => s.theme)
  const density        = useAppStore(s => s.density)
  const fontSize       = useAppStore(s => s.fontSize)
  const setTheme       = useAppStore(s => s.setTheme)
  const setDensity     = useAppStore(s => s.setDensity)
  const setFontSize    = useAppStore(s => s.setFontSize)
  const showGrid    = useAppStore(s => s.showGrid)
  const scanlines   = useAppStore(s => s.scanlines)
  const setShowGrid   = useAppStore(s => s.setShowGrid)
  const setScanlines  = useAppStore(s => s.setScanlines)
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSettingsOpen])

  // Close on backdrop click
  const backdropRef = useRef<HTMLDivElement>(null)
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) setSettingsOpen(false)
  }

  const fontSizeOptions: FontSize[] = ['small', 'medium', 'large']
  const themeOptions: { value: Theme; label: string; icon: string }[] = [
    { value: 'dark',  label: 'Dark',  icon: '🌑' },
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'hc',    label: 'HC',    icon: '◉' },
  ]
  const densityOptions: { value: Density; label: string; desc: string }[] = [
    { value: 'compact',  label: 'Compact',  desc: 'Dense' },
    { value: 'comfy',    label: 'Comfy',    desc: 'Balanced' },
    { value: 'spacious', label: 'Spacious', desc: 'Airy' },
  ]

  return (
    <div className="modal-backdrop" ref={backdropRef} onClick={onBackdropClick}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings">

        {/* Header */}
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={() => setSettingsOpen(false)}>✕</button>
        </div>

        <div className="settings-body">

          {/* Theme */}
          <div className="settings-section">
            <div className="settings-section-label">Theme</div>
            <div className="seg">
              {themeOptions.map(o => (
                <button key={o.value}
                  className={`seg-btn${theme === o.value ? ' active' : ''}`}
                  onClick={() => setTheme(o.value)}>
                  <span>{o.icon}</span>
                  <span>{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Reading density */}
          <div className="settings-section">
            <div className="settings-section-label">Reading Density</div>
            <div className="seg">
              {densityOptions.map(o => (
                <button key={o.value}
                  className={`seg-btn${density === o.value ? ' active' : ''}`}
                  onClick={() => setDensity(o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)', marginTop: -4 }}>
              {density === 'compact'  && 'Tighter spacing and smaller rows — best for information density.'}
              {density === 'comfy'    && 'Balanced spacing — comfortable for extended reading sessions.'}
              {density === 'spacious' && 'Generous spacing — easiest on the eyes for long sessions.'}
            </div>
          </div>

          {/* Font size */}
          <div className="settings-section">
            <div className="settings-section-label">Font Size</div>
            <div className="seg">
              {fontSizeOptions.map(o => (
                <button key={o}
                  className={`seg-btn${fontSize === o ? ' active' : ''}`}
                  onClick={() => setFontSize(o)}>
                  {FONT_SIZE_LABEL[o]}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)', marginTop: -4 }}>
              {fontSize === 'small'  && 'Smallest text — fits the most content on screen.'}
              {fontSize === 'medium' && 'Default text size — works well for most displays.'}
              {fontSize === 'large'  && 'Larger text — easier to read on high-DPI or large monitors.'}
            </div>
          </div>

          {/* Display */}
          <div className="settings-section">
            <div className="settings-section-label">Display</div>
            <div className="seg">
              <button
                className={`seg-btn${showGrid ? ' active' : ''}`}
                onClick={() => setShowGrid(!showGrid)}>
                Grid overlay
              </button>
              <button
                className={`seg-btn${scanlines ? ' active' : ''}`}
                onClick={() => setScanlines(!scanlines)}>
                Scanlines
              </button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-4)', marginTop: -4 }}>
              {showGrid && !scanlines && 'Grid lines visible on workspace background.'}
              {scanlines && !showGrid && 'CRT scanline overlay on top of all content.'}
              {!showGrid && !scanlines && 'Clean workspace — no overlays.'}
              {showGrid && scanlines && 'Grid and scanlines both active.'}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
