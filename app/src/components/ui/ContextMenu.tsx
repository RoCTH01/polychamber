'use client'

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'

// ── Types ────────────────────────────────────────────────────────────────────

export interface MenuItem {
  label?:    string
  action?:   () => void
  danger?:   boolean
  disabled?: boolean
  checked?:  boolean   // shows a tick before label (for toggles like Star)
  divider?:  true      // renders a <hr> separator instead of a row
}

interface MenuState {
  x:     number
  y:     number
  items: MenuItem[]
}

// ── Context ───────────────────────────────────────────────────────────────────

interface CtxValue {
  open: (e: React.MouseEvent, items: MenuItem[]) => void
}

const Ctx = createContext<CtxValue>({ open: () => {} })

// ── Provider ─────────────────────────────────────────────────────────────────

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<MenuState | null>(null)

  const open = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    setMenu({ x: e.clientX, y: e.clientY, items })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  // Close on any click outside or Escape
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu, close])

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      {menu && typeof document !== 'undefined' && createPortal(
        <MenuEl menu={menu} close={close} />,
        document.body,
      )}
    </Ctx.Provider>
  )
}

export function useContextMenu() {
  return useContext(Ctx)
}

// ── Menu element ─────────────────────────────────────────────────────────────

const MENU_W    = 192
const ITEM_H    = 26
const DIVIDER_H = 9

function MenuEl({ menu, close }: { menu: MenuState; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  // Estimate rendered height to detect if we need to flip up
  const h = menu.items.reduce(
    (acc, it) => acc + (it.divider ? DIVIDER_H : ITEM_H),
    8, // top+bottom padding
  )

  const x = menu.x + MENU_W > window.innerWidth  - 6 ? menu.x - MENU_W : menu.x
  const y = menu.y + h       > window.innerHeight - 6 ? menu.y - h      : menu.y

  // Mousedown outside the menu closes it
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [close])

  return (
    <div
      ref={ref}
      className="ctx-menu"
      style={{ left: x, top: y }}
      // Stop mousedown from bubbling to the document handler above
      onMouseDown={e => e.stopPropagation()}
    >
      {menu.items.map((it, i) => {
        if (it.divider) return <div key={i} className="ctx-divider" />
        return (
          <div
            key={i}
            className={[
              'ctx-item',
              it.danger    ? 'danger'    : '',
              it.disabled  ? 'disabled'  : '',
            ].filter(Boolean).join(' ')}
            onClick={() => {
              if (it.disabled) return
              close()
              it.action?.()
            }}
          >
            <span className="ctx-check">{it.checked ? '✓' : ''}</span>
            {it.label}
          </div>
        )
      })}
    </div>
  )
}
