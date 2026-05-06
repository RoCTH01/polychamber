import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'

const isDev = !app.isPackaged
const PORT  = 3000

let mainWindow: BrowserWindow | null = null
let nextServer: ChildProcess  | null = null

async function waitForServer(url: string, retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(url)
      return
    } catch {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  throw new Error(`Server at ${url} did not start in time`)
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 11 },
    backgroundColor: '#1a1a1d',
    show: false,
    webPreferences: {
      preload:           join(__dirname, 'preload.js'),
      contextIsolation:  true,
      nodeIntegration:   false,
    },
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    // Dev: Next.js dev server is already running
    await waitForServer(`http://localhost:${PORT}`)
    mainWindow.loadURL(`http://localhost:${PORT}`)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // Prod: spawn the standalone Next.js server
    const serverPath = join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js')
    nextServer = spawn(process.execPath, [serverPath], {
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
      stdio: 'pipe',
    })
    nextServer.stdout?.pipe(process.stdout)
    nextServer.stderr?.pipe(process.stderr)
    await waitForServer(`http://localhost:${PORT}`)
    mainWindow.loadURL(`http://localhost:${PORT}`)
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  nextServer?.kill()
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC handlers
ipcMain.handle('open-external', (_event, url: string) => {
  shell.openExternal(url)
})
