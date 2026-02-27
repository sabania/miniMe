import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { execFile, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { getTypedConfig, setTypedConfig, getAllTypedConfig, isValidConfigKey, initDefaults } from './config'
import * as db from './db'
import * as whatsapp from './whatsapp'
import * as bridge from './bridge'
import * as workspace from './workspace'
import { isGitAvailable, initGitRepo, initAllProjectGits, workspaceNeedsSetup, forceScaffoldWorkspace } from './workspace'
import { syncScheduledTasks, getSchedulerStatus, stopScheduler, startScheduler } from './scheduler'
import { getCachedModels, fetchModels } from './agent'
import { listDiskSessions, decodeProjectSlug } from './disk-sessions'
import { getUpdateStatus, checkForUpdates, downloadUpdate, installUpdate } from './updater'
import type { ConfigKey, PermissionResponse, ScheduledTask } from '../shared/types'

export function registerIpcHandlers(): void {
  // ─── Config ─────────────────────────────────────────────
  ipcMain.handle('config:get', (_e, key: ConfigKey) => {
    return getTypedConfig(key)
  })

  // Keys that must not be changed via IPC (prevents arbitrary path deletion via resetWorkspace)
  const READONLY_CONFIG_KEYS = new Set(['workspacePath'])

  ipcMain.handle('config:set', (_e, key: string, value: unknown) => {
    if (!isValidConfigKey(key)) throw new Error(`Unknown config key: ${key}`)
    if (READONLY_CONFIG_KEYS.has(key)) throw new Error(`Config key "${key}" is read-only`)
    setTypedConfig(key as ConfigKey, value as never)
    if (key === 'userName') {
      // Sync: userName → owner contact displayName
      const owner = db.getContacts().find((c) => c.isOwner)
      if (owner && owner.displayName !== value) {
        db.updateContact(owner.jid, { displayName: value as string })
      }
      workspace.generateUserProfile()
    }
    if (key === 'userPreferences') {
      workspace.generateUserProfile()
    }
    if (key === 'useGit' && (value === true || value === 'true')) {
      initGitRepo(getTypedConfig('workspacePath'))
      initAllProjectGits()
    }
    if (key === 'startWithSystem') {
      app.setLoginItemSettings({
        openAtLogin: value === true || value === 'true',
        ...(process.platform === 'linux' && process.env.APPIMAGE
          ? { path: process.env.APPIMAGE }
          : {})
      })
    }
  })

  ipcMain.handle('config:getAll', () => {
    return getAllTypedConfig()
  })

  // ─── Conversations ──────────────────────────────────────
  ipcMain.handle('conversations:list', () => {
    return db.getConversations()
  })

  ipcMain.handle('conversations:messages', (_e, conversationId: string) => {
    return db.getMessages(conversationId)
  })

  ipcMain.handle('conversations:new', () => {
    const active = db.getActiveConversation()
    if (active) db.closeConversation(active.id)
    bridge.abort()

    const convId = randomUUID()
    const cwd = getTypedConfig('currentCwd')
    const mode = getTypedConfig('permissionMode')
    db.createConversation(convId, cwd, mode)
    return convId
  })

  ipcMain.handle('conversations:delete', (_e, convId: string) => {
    const active = db.getActiveConversation()
    if (active?.id === convId) {
      bridge.abort()
    }
    db.deleteConversation(convId)
  })

  ipcMain.handle('conversations:resume', (_e, convId: string) => {
    bridge.abort()
    db.resumeConversation(convId)
  })

  ipcMain.handle('agent:abort', () => {
    bridge.abort()
  })

  ipcMain.handle('session:openTerminal', (_e, convId: string) => {
    const conv = db.getConversations().find((c) => c.id === convId)
    if (!conv) throw new Error('Conversation not found')
    const cwd = conv.cwd
    const args = conv.sdkSessionId
      ? ['--resume', conv.sdkSessionId]
      : []

    // Clean env: remove CLAUDECODE so claude CLI doesn't think it's nested
    const cleanEnv = { ...process.env }
    delete cleanEnv.CLAUDECODE

    if (process.platform === 'win32') {
      // Windows: try Windows Terminal, fallback to cmd.exe
      const wtProcess = spawn('wt', ['-d', cwd, '--', 'claude', ...args], {
        detached: true,
        stdio: 'ignore',
        env: cleanEnv
      })
      wtProcess.on('error', () => {
        spawn('cmd.exe', ['/c', 'start', '', '/D', cwd, 'claude', ...args], {
          detached: true,
          stdio: 'ignore',
          shell: true,
          env: cleanEnv
        }).unref()
      })
      wtProcess.unref()
    } else {
      // Linux: try common terminal emulators
      const terminals = ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm']
      const tryTerminal = (idx: number): void => {
        if (idx >= terminals.length) return
        const term = terminals[idx]
        const p = spawn(term, ['-e', 'claude', ...args], {
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
  })

  ipcMain.handle('session:openVSCode', (_e, convId: string) => {
    const conv = db.getConversations().find((c) => c.id === convId)
    if (!conv) throw new Error('Conversation not found')
    // 'code' is a .cmd on Windows — needs shell to resolve
    execFile('code', [conv.cwd], { shell: true }, (err) => {
      if (err) console.error('[ipc] Failed to open VS Code:', err.message)
    })
  })

  // ─── Disk Sessions ─────────────────────────────────────
  ipcMain.handle('diskSessions:list', async () => {
    const workspacePath = getTypedConfig('workspacePath')
    return listDiskSessions(workspacePath)
  })

  ipcMain.handle('diskSessions:import', async (_e, sessionId: string, projectSlug: string, cwdOverride?: string) => {
    const active = db.getActiveConversation()
    if (active) db.closeConversation(active.id)
    bridge.abort()

    const cwd = cwdOverride || decodeProjectSlug(projectSlug)
    const convId = randomUUID()
    const mode = getTypedConfig('permissionMode')
    db.createConversation(convId, cwd, mode)
    db.updateConversation(convId, { sdkSessionId: sessionId })
    db.resumeConversation(convId)
    return convId
  })

  // ─── Projects ───────────────────────────────────────────
  ipcMain.handle('projects:list', () => {
    return db.getProjects()
  })

  ipcMain.handle('projects:add', (_e, name: string, hostPath: string) => {
    const junctionPath = workspace.createJunction(name, hostPath)
    db.addProject(name, hostPath, junctionPath)
    workspace.generateCLAUDEmd()
    return db.getProjects().find((p) => p.name === name)
  })

  ipcMain.handle('projects:remove', (_e, name: string) => {
    const project = db.getProjects().find((p) => p.name === name)
    if (project) workspace.removeJunction(project.junctionPath)
    db.removeProject(name)
    workspace.generateCLAUDEmd()
  })

  // ─── Dialog ────────────────────────────────────────────
  ipcMain.handle('dialog:openFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // ─── Shell ─────────────────────────────────────────────
  ipcMain.handle('shell:openFolder', async (_e, folderPath: string) => {
    await shell.openPath(folderPath)
  })

  // ─── WhatsApp ───────────────────────────────────────────
  ipcMain.handle('whatsapp:connect', async () => {
    await whatsapp.connect()
  })

  ipcMain.handle('whatsapp:disconnect', async () => {
    await whatsapp.disconnect()
  })

  ipcMain.handle('whatsapp:state', () => {
    return whatsapp.getWhatsAppState()
  })

  // ─── Contacts ──────────────────────────────────────────────
  ipcMain.handle('contacts:list', () => {
    return db.getContacts()
  })

  ipcMain.handle('contacts:add', (_e, jid: string, displayName: string, description?: string, isOwner?: boolean) => {
    const clean = jid.replace(/[^\d]/g, '')
    if (!clean || clean.length < 5) throw new Error('Invalid number')
    db.addContact(clean, displayName || '', description, isOwner)
    // Sync: new owner contact displayName → userName
    if (isOwner && displayName) {
      setTypedConfig('userName', displayName)
    }
    workspace.generateUserProfile()
    return db.getContacts()
  })

  ipcMain.handle('contacts:update', (_e, jid: string, updates: { displayName?: string; description?: string; isOwner?: boolean }) => {
    db.updateContact(jid, updates)
    // Sync: owner contact displayName → userName
    const contact = db.getContacts().find((c) => c.jid === jid)
    if (contact?.isOwner && updates.displayName !== undefined) {
      setTypedConfig('userName', updates.displayName)
    }
    workspace.generateUserProfile()
    return db.getContacts()
  })

  ipcMain.handle('contacts:remove', (_e, jid: string) => {
    db.removeContact(jid)
    workspace.generateUserProfile()
    return db.getContacts()
  })

  // ─── WhatsApp Credentials ───────────────────────────────
  ipcMain.handle('whatsapp:deleteCredentials', async () => {
    await whatsapp.disconnect()
    whatsapp.deleteCredentials()
  })

  // ─── Scheduled Tasks ─────────────────────────────────────
  ipcMain.handle('scheduledTasks:list', () => {
    return db.getScheduledTasks()
  })

  ipcMain.handle('scheduledTasks:add', (_e, name: string, prompt: string, cronExpr: string, oneShot: boolean, startDate: string | null, type?: string) => {
    const id = randomUUID()
    db.addScheduledTask(id, name, prompt, cronExpr, oneShot, startDate, type ?? 'user')
    syncScheduledTasks()
    return db.getScheduledTasks()
  })

  ipcMain.handle('scheduledTasks:update', (_e, id: string, updates: Partial<Pick<ScheduledTask, 'name' | 'prompt' | 'cronExpr' | 'enabled' | 'oneShot' | 'startDate' | 'type'>>) => {
    db.updateScheduledTask(id, updates)
    syncScheduledTasks()
    return db.getScheduledTasks()
  })

  ipcMain.handle('scheduledTasks:remove', (_e, id: string) => {
    db.removeScheduledTask(id)
    syncScheduledTasks()
    return db.getScheduledTasks()
  })

  // ─── Scheduler Status ───────────────────────────────────
  ipcMain.handle('scheduler:status', () => {
    return getSchedulerStatus()
  })

  // ─── Agent ──────────────────────────────────────────────
  ipcMain.handle('agent:state', () => {
    return bridge.getState()
  })

  ipcMain.handle('agent:respondPermission', (_e, response: PermissionResponse) => {
    bridge.respondPermissionFromUI(response)
  })

  // ─── Git ──────────────────────────────────────────────────
  ipcMain.handle('git:available', () => {
    return isGitAvailable()
  })

  // ─── Models ───────────────────────────────────────────────
  ipcMain.handle('models:list', async () => {
    return getCachedModels() ?? await fetchModels()
  })

  // ─── Updater ────────────────────────────────────────────
  ipcMain.handle('updater:status', () => {
    return getUpdateStatus()
  })

  ipcMain.handle('updater:check', () => {
    checkForUpdates()
  })

  ipcMain.handle('updater:download', () => {
    downloadUpdate()
  })

  ipcMain.handle('updater:install', () => {
    installUpdate()
  })

  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })

  // ─── Workspace ────────────────────────────────────────────
  ipcMain.handle('workspace:needsSetup', () => {
    return workspaceNeedsSetup()
  })

  ipcMain.handle('workspace:scaffold', () => {
    forceScaffoldWorkspace()
  })

  // ─── Reset ──────────────────────────────────────────────
  ipcMain.handle('reset:settings', () => {
    db.resetConfig()
    initDefaults()
  })

  ipcMain.handle('reset:conversations', () => {
    bridge.abort()
    db.resetConversations()
  })

  ipcMain.handle('reset:scheduler', () => {
    stopScheduler()
    db.resetScheduledTasks()
    startScheduler()
  })

  ipcMain.handle('reset:workspace', () => {
    workspace.resetWorkspace()
    // Show language dialog so user can choose language for re-scaffold
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('workspace:chooseLanguage')
    }
  })

  ipcMain.handle('reset:whatsapp', async () => {
    await whatsapp.disconnect()
    whatsapp.deleteCredentials()
  })

  ipcMain.handle('reset:full', async () => {
    bridge.abort()
    stopScheduler()
    await whatsapp.disconnect()
    whatsapp.deleteCredentials()
    workspace.removeAllJunctions() // remove junctions safely before DB wipe
    db.resetDatabase()
    initDefaults()
    startScheduler()
    workspace.resetWorkspace()
    // Show language dialog so user can choose language for re-scaffold
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('workspace:chooseLanguage')
    }
  })
}

// Re-export for backward compatibility
export { sendToRenderer } from './ipc-util'
