// Platform abstraction — swap this file's implementation for web builds.
// UI components never import from 'electron' directly.

declare global {
  interface Window {
    electronAPI?: {
      openExternal: (url: string) => void
      watchPath: (path: string, cb: (event: string, filename: string) => void) => void
      platform: string
    }
  }
}

export function openExternal(url: string) {
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export function getPlatform(): string {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI.platform
  }
  return 'web'
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI
}
