import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDb, closeDb } from './db'
import { initDefaults, getTypedConfig } from './config'
import { registerIpcHandlers } from './ipc-handlers'
import { setMessageHandler, sendMessage, setOnReconnect, disconnect as disconnectWhatsApp, hasCredentials, connect as connectWhatsApp } from './whatsapp'
import { parseCommand } from './commands'
import * as bridge from './bridge'
import { fetchModels } from './agent'
import { scaffoldWorkspace, needsLanguageChoice } from './workspace'
import { startScheduler, stopScheduler } from './scheduler'
import { createTray, destroyTray, rebuildTrayMenu } from './tray'
import { initUpdater, stopUpdater } from './updater'

// ─── Single Instance Lock ────────────────────────────────────
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (!win.isVisible()) win.show()
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting && getTypedConfig('minimizeToTray')) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    const url = details.url
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function setupMessageHandler(): void {
  setMessageHandler(async (jid, content, pushName) => {
    const result = parseCommand(content, jid)
    if (result.handled) {
      if (result.reply) {
        await sendMessage(jid, result.reply).catch((err) =>
          console.error('Failed to send reply:', err)
        )
      }
      return
    }
    await bridge.handleMessage(jid, content, pushName)
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.minime')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  try {
    initDb()
    initDefaults()
    scaffoldWorkspace()
    registerIpcHandlers()
    setupMessageHandler()
    setOnReconnect(() => bridge.drainOutboundQueue())
    startScheduler()
  } catch (err) {
    console.error('Failed to initialize:', err)
    app.quit()
    return
  }

  // Fetch available models in background (non-blocking), then update tray menu
  fetchModels().then(() => rebuildTrayMenu()).catch(() => {})

  const mainWindow = createWindow()
  createTray(icon)
  initUpdater()

  // First-run: show language choice dialog after window is ready
  if (needsLanguageChoice) {
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send('workspace:chooseLanguage')
    })
  }

  // Sync autostart setting with OS
  app.setLoginItemSettings({
    openAtLogin: getTypedConfig('startWithSystem'),
    ...(process.platform === 'linux' && process.env.APPIMAGE
      ? { path: process.env.APPIMAGE }
      : {})
  })

  // Auto-connect WhatsApp if enabled and credentials exist
  if (getTypedConfig('whatsappAutoConnect') && hasCredentials()) {
    connectWhatsApp().catch((err) =>
      console.error('[WA] Auto-connect failed:', err.message)
    )
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !getTypedConfig('minimizeToTray')) {
    app.quit()
  }
})

// ─── Graceful Shutdown ───────────────────────────────────────
let isQuitting = false
app.on('before-quit', (e) => {
  if (isQuitting) return
  e.preventDefault()
  isQuitting = true

  destroyTray()
  stopUpdater()
  bridge.abort()
  stopScheduler()
  disconnectWhatsApp()
    .catch(() => {})
    .finally(() => {
      try { closeDb() } catch (err) { console.error('[shutdown] closeDb failed:', err) }
      app.quit()
    })
})

} // end single instance lock
