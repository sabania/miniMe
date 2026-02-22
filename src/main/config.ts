import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { getConfig, setConfig, getAllConfig } from './db'
import type { ConfigKey, ConfigMap } from '../shared/types'

const DEFAULTS: ConfigMap = {
  permissionMode: 'default',
  model: 'default',
  maxTurns: 200,
  workspacePath: '',
  permissionTimeoutSec: 120,
  streamToWhatsApp: false,
  whatsappAutoConnect: true,
  currentCwd: '',
  currentProject: '',
  whatsappJid: '',
  userName: '',
  userPreferences: '',
  minimizeToTray: true,
  startWithSystem: false,
  useGit: true,
  language: 'de'
}

function getDefaultWorkspacePath(): string {
  return join(app.getPath('userData'), 'workspace')
}

export function initDefaults(): void {
  if (!DEFAULTS.workspacePath) {
    DEFAULTS.workspacePath = getDefaultWorkspacePath()
  }
  if (!DEFAULTS.currentCwd) {
    DEFAULTS.currentCwd = DEFAULTS.workspacePath
  }

  // Ensure workspace directory exists
  mkdirSync(DEFAULTS.workspacePath, { recursive: true })

  for (const [key, defaultVal] of Object.entries(DEFAULTS)) {
    const existing = getConfig(key)
    if (existing === undefined) {
      setConfig(key, String(defaultVal))
    }
  }
}

export function getTypedConfig<K extends ConfigKey>(key: K): ConfigMap[K] {
  const raw = getConfig(key)
  const val = raw ?? String(DEFAULTS[key])

  // Parse based on expected type
  const def = DEFAULTS[key]
  if (typeof def === 'number') return Number(val) as ConfigMap[K]
  if (typeof def === 'boolean') return (val === 'true') as ConfigMap[K]
  return val as ConfigMap[K]
}

const TRAY_RELEVANT_KEYS = new Set<ConfigKey>(['permissionMode', 'model', 'streamToWhatsApp'])

export function setTypedConfig<K extends ConfigKey>(key: K, value: ConfigMap[K]): void {
  setConfig(key, String(value))
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('config:changed', key, value)
  }
  if (TRAY_RELEVANT_KEYS.has(key)) {
    import('./tray').then(({ rebuildTrayMenu }) => rebuildTrayMenu()).catch(() => {})
  }
}

export function isValidConfigKey(key: string): boolean {
  return key in DEFAULTS
}

export function getAllTypedConfig(): Partial<ConfigMap> {
  const raw = getAllConfig()
  const result: Partial<ConfigMap> = {}
  for (const key of Object.keys(DEFAULTS) as ConfigKey[]) {
    const val = raw[key]
    if (val !== undefined) {
      const def = DEFAULTS[key]
      if (typeof def === 'number') (result as Record<string, unknown>)[key] = Number(val)
      else if (typeof def === 'boolean') (result as Record<string, unknown>)[key] = val === 'true'
      else (result as Record<string, unknown>)[key] = val
    } else {
      (result as Record<string, unknown>)[key] = DEFAULTS[key]
    }
  }
  return result
}
