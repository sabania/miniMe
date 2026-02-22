import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { sendToRenderer } from './ipc-util'
import type { UpdateStatus } from '../shared/types'

let status: UpdateStatus = { state: 'idle' }
let checkInterval: ReturnType<typeof setInterval> | null = null
let errorResetTimeout: ReturnType<typeof setTimeout> | null = null

const SIX_HOURS = 6 * 60 * 60 * 1000

function setStatus(next: UpdateStatus): void {
  status = next
  sendToRenderer('updater:status', status)
}

export function getUpdateStatus(): UpdateStatus {
  return status
}

export function initUpdater(): void {
  if (!app.isPackaged) return

  // Linux deb installs don't support auto-update
  if (process.platform === 'linux' && !process.env.APPIMAGE) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    setStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    setStatus({
      state: 'available',
      info: { version: info.version, releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined }
    })
  })

  autoUpdater.on('update-not-available', () => {
    setStatus({ state: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress) => {
    setStatus({ state: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setStatus({
      state: 'downloaded',
      info: { version: info.version, releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined }
    })
  })

  autoUpdater.on('error', (err) => {
    setStatus({ state: 'error', message: err.message })
    // Auto-reset error state after 30s
    if (errorResetTimeout) clearTimeout(errorResetTimeout)
    errorResetTimeout = setTimeout(() => {
      if (status.state === 'error') setStatus({ state: 'idle' })
    }, 30_000)
  })

  // First check 10s after start, then every 6h
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 10_000)

  checkInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, SIX_HOURS)
}

export function checkForUpdates(): void {
  if (!app.isPackaged) return
  autoUpdater.checkForUpdates().catch(() => {})
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(() => {})
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}

export function stopUpdater(): void {
  if (checkInterval) {
    clearInterval(checkInterval)
    checkInterval = null
  }
  if (errorResetTimeout) {
    clearTimeout(errorResetTimeout)
    errorResetTimeout = null
  }
}
