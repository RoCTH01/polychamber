import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Future: file watcher for Obsidian / Mac Notes
  watchPath: (path: string, cb: (event: string, filename: string) => void) => {
    ipcRenderer.on('file-changed', (_event, ev: string, file: string) => cb(ev, file))
    ipcRenderer.send('watch-path', path)
  },

  platform: process.platform,
})
