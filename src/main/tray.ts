import { Tray, Menu, BrowserWindow, app, shell, nativeImage } from 'electron'
import { spawn, execFile } from 'child_process'
import { randomUUID } from 'crypto'
import { getState, abort } from './bridge'
import { getTypedConfig, setTypedConfig } from './config'
import { getCachedModels } from './agent'
import { getActiveConversation, createConversation } from './db'
import { sendToRenderer } from './ipc-util'

let tray: Tray | null = null

export function createTray(iconPath: string): void {
  try {
    const image = nativeImage.createFromPath(iconPath)
    tray = new Tray(image)
    tray.setToolTip('miniMe')
    rebuildTrayMenu()
    tray.on('click', showWindow)
  } catch {
    console.warn('[tray] System tray not available')
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function rebuildTrayMenu(): void {
  if (!tray) return

  const agentState = getState()
  const isWorking = agentState.status !== 'idle'
  const permissionMode = getTypedConfig('permissionMode')
  const model = getTypedConfig('model')
  const streaming = getTypedConfig('streamToWhatsApp')
  const models = getCachedModels() ?? []

  const statusLabel = isWorking
    ? agentState.status === 'waiting_permission' ? 'Agent: waiting permission' : 'Agent: working...'
    : 'Agent: idle'

  const template: Electron.MenuItemConstructorOptions[] = [
    { label: 'Show miniMe', click: showWindow },
    { type: 'separator' },

    // ─── Agent ──────────────────────────────────────────
    { label: statusLabel, enabled: false },
    { label: 'Stop Agent', enabled: isWorking, click: () => abort() },
    {
      label: 'New Session',
      click: () => {
        const active = getActiveConversation()
        if (active) {
          // Close via bridge abort + DB handled by IPC handler pattern
          abort()
        }
        const convId = randomUUID()
        const cwd = getTypedConfig('currentCwd')
        const mode = getTypedConfig('permissionMode')
        createConversation(convId, cwd, mode)
        sendToRenderer('agent:state', getState())
      }
    },
    { type: 'separator' },

    // ─── Open ───────────────────────────────────────────
    { label: 'Open VS Code', click: openVSCode },
    { label: 'Open Terminal', click: openTerminal },
    {
      label: 'Open Workspace',
      click: () => shell.openPath(getTypedConfig('workspacePath'))
    },
    { type: 'separator' },

    // ─── Permission Mode ────────────────────────────────
    {
      label: 'Permission Mode',
      submenu: ([
        ['default', 'Default'],
        ['acceptEdits', 'Accept Edits'],
        ['bypassPermissions', 'Bypass Permissions'],
        ['plan', 'Plan']
      ] as const).map(([value, label]) => ({
        label,
        type: 'radio' as const,
        checked: permissionMode === value,
        click: () => setTypedConfig('permissionMode', value)
      }))
    },

    // ─── Model ──────────────────────────────────────────
    {
      label: 'Model',
      submenu: [
        {
          label: 'default',
          type: 'radio' as const,
          checked: model === 'default',
          click: () => setTypedConfig('model', 'default')
        },
        ...models
          .filter((m) => m.value !== 'default')
          .map((m) => ({
            label: m.label || m.value,
            type: 'radio' as const,
            checked: model === m.value,
            click: () => setTypedConfig('model', m.value)
          }))
      ]
    },

    // ─── Response Mode ──────────────────────────────────
    {
      label: 'Response Mode',
      submenu: [
        {
          label: 'Standard (send at end)',
          type: 'radio' as const,
          checked: !streaming,
          click: () => setTypedConfig('streamToWhatsApp', false)
        },
        {
          label: 'Streaming',
          type: 'radio' as const,
          checked: streaming,
          click: () => setTypedConfig('streamToWhatsApp', true)
        }
      ]
    },
    { type: 'separator' },

    // ─── Schedule Task ──────────────────────────────────
    {
      label: 'Schedule Task...',
      click: () => {
        showWindow()
        sendToRenderer('navigate', 'scheduler')
      }
    },
    { type: 'separator' },

    // ─── Quit ───────────────────────────────────────────
    { label: 'Quit', click: () => app.quit() }
  ]

  tray.setContextMenu(Menu.buildFromTemplate(template))
}

// ─── Helpers ──────────────────────────────────────────────

function showWindow(): void {
  const win = BrowserWindow.getAllWindows()[0]
  if (!win) return
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

function openVSCode(): void {
  const cwd = getTypedConfig('currentCwd')
  execFile('code', [cwd], { shell: true }, (err) => {
    if (err) console.error('[tray] Failed to open VS Code:', err.message)
  })
}

function openTerminal(): void {
  const cwd = getTypedConfig('currentCwd')
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE

  if (process.platform === 'win32') {
    const wtProcess = spawn('wt', ['-d', cwd, '--', 'claude'], {
      detached: true,
      stdio: 'ignore',
      env: cleanEnv
    })
    wtProcess.on('error', () => {
      spawn('cmd.exe', ['/c', 'start', '', '/D', cwd, 'claude'], {
        detached: true,
        stdio: 'ignore',
        shell: true,
        env: cleanEnv
      }).unref()
    })
    wtProcess.unref()
  } else {
    const terminals = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm']
    const tryTerminal = (idx: number): void => {
      if (idx >= terminals.length) return
      const p = spawn(terminals[idx], ['-e', 'claude'], {
        detached: true,
        stdio: 'ignore',
        cwd,
        env: cleanEnv
      })
      p.on('error', () => tryTerminal(idx + 1))
      p.unref()
    }
    tryTerminal(0)
  }
}
