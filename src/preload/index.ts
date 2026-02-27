import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { ConfigKey, PermissionResponse, WhatsAppState, AgentState, Contact, ScheduledTask, SchedulerLogEntry, UpdateStatus, DiskSession, IpcApi } from '../shared/types'

const api: IpcApi = {
  // Config
  getConfig: (key: ConfigKey) => ipcRenderer.invoke('config:get', key),
  setConfig: (key: ConfigKey, value: unknown) => ipcRenderer.invoke('config:set', key, value),
  getAllConfig: () => ipcRenderer.invoke('config:getAll'),

  // WhatsApp
  whatsappConnect: () => ipcRenderer.invoke('whatsapp:connect'),
  whatsappDisconnect: () => ipcRenderer.invoke('whatsapp:disconnect'),
  whatsappGetState: () => ipcRenderer.invoke('whatsapp:state'),
  whatsappDeleteCredentials: () => ipcRenderer.invoke('whatsapp:deleteCredentials'),

  // Conversations
  getConversations: () => ipcRenderer.invoke('conversations:list'),
  getMessages: (conversationId: string) =>
    ipcRenderer.invoke('conversations:messages', conversationId),
  newConversation: () => ipcRenderer.invoke('conversations:new'),
  deleteConversation: (id: string) => ipcRenderer.invoke('conversations:delete', id),
  resumeConversation: (id: string) => ipcRenderer.invoke('conversations:resume', id),
  abortAgent: () => ipcRenderer.invoke('agent:abort'),
  openSessionTerminal: (id: string) => ipcRenderer.invoke('session:openTerminal', id),
  openSessionVSCode: (id: string) => ipcRenderer.invoke('session:openVSCode', id),

  // Projects
  getProjects: () => ipcRenderer.invoke('projects:list'),
  addProject: (name: string, hostPath: string) => ipcRenderer.invoke('projects:add', name, hostPath),
  removeProject: (name: string) => ipcRenderer.invoke('projects:remove', name),
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Contacts
  getContacts: () => ipcRenderer.invoke('contacts:list') as Promise<Contact[]>,
  addContact: (jid: string, displayName: string, description?: string, isOwner?: boolean) =>
    ipcRenderer.invoke('contacts:add', jid, displayName, description, isOwner) as Promise<Contact[]>,
  updateContact: (jid: string, updates: Partial<Pick<Contact, 'displayName' | 'description' | 'isOwner'>>) =>
    ipcRenderer.invoke('contacts:update', jid, updates) as Promise<Contact[]>,
  removeContact: (jid: string) => ipcRenderer.invoke('contacts:remove', jid) as Promise<Contact[]>,

  // Scheduled Tasks
  getScheduledTasks: () => ipcRenderer.invoke('scheduledTasks:list') as Promise<ScheduledTask[]>,
  addScheduledTask: (name: string, prompt: string, cronExpr: string, oneShot: boolean, startDate: string | null, type?: string) =>
    ipcRenderer.invoke('scheduledTasks:add', name, prompt, cronExpr, oneShot, startDate, type) as Promise<ScheduledTask[]>,
  updateScheduledTask: (id: string, updates: Partial<Pick<ScheduledTask, 'name' | 'prompt' | 'cronExpr' | 'enabled' | 'oneShot' | 'startDate' | 'type'>>) =>
    ipcRenderer.invoke('scheduledTasks:update', id, updates) as Promise<ScheduledTask[]>,
  removeScheduledTask: (id: string) =>
    ipcRenderer.invoke('scheduledTasks:remove', id) as Promise<ScheduledTask[]>,

  // Models
  getModels: () => ipcRenderer.invoke('models:list'),

  // Scheduler Status
  getSchedulerStatus: () => ipcRenderer.invoke('scheduler:status'),

  // Agent
  getAgentState: () => ipcRenderer.invoke('agent:state'),
  respondPermission: (response: PermissionResponse) =>
    ipcRenderer.invoke('agent:respondPermission', response),

  // Events — subscribe from renderer
  onWhatsAppState: (callback: (state: WhatsAppState) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: WhatsAppState): void => callback(state)
    ipcRenderer.on('whatsapp:state', handler)
    return () => { ipcRenderer.removeListener('whatsapp:state', handler) }
  },
  onAgentState: (callback: (state: AgentState) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: AgentState): void => callback(state)
    ipcRenderer.on('agent:state', handler)
    return () => { ipcRenderer.removeListener('agent:state', handler) }
  },
  onScheduledTasksChanged: (callback: (tasks: ScheduledTask[]) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, tasks: ScheduledTask[]): void => callback(tasks)
    ipcRenderer.on('scheduledTasks:changed', handler)
    return () => { ipcRenderer.removeListener('scheduledTasks:changed', handler) }
  },
  onSchedulerLog: (callback: (entry: SchedulerLogEntry) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, entry: SchedulerLogEntry): void => callback(entry)
    ipcRenderer.on('scheduler:log', handler)
    return () => { ipcRenderer.removeListener('scheduler:log', handler) }
  },
  onNewMessage: (callback: (conversationId: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, conversationId: string): void => callback(conversationId)
    ipcRenderer.on('agent:newMessage', handler)
    return () => { ipcRenderer.removeListener('agent:newMessage', handler) }
  },
  onConfigChanged: (callback: (key: string, value: unknown) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, key: string, value: unknown): void => callback(key, value)
    ipcRenderer.on('config:changed', handler)
    return () => { ipcRenderer.removeListener('config:changed', handler) }
  },
  onNavigate: (callback: (view: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, view: string): void => callback(view)
    ipcRenderer.on('navigate', handler)
    return () => { ipcRenderer.removeListener('navigate', handler) }
  },

  // Updater
  getUpdateStatus: () => ipcRenderer.invoke('updater:status'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, status: UpdateStatus): void => callback(status)
    ipcRenderer.on('updater:status', handler)
    return () => { ipcRenderer.removeListener('updater:status', handler) }
  },

  // Disk Sessions
  getDiskSessions: () => ipcRenderer.invoke('diskSessions:list') as Promise<DiskSession[]>,
  importDiskSession: (sessionId: string, projectSlug: string) =>
    ipcRenderer.invoke('diskSessions:import', sessionId, projectSlug) as Promise<string>,

  // Shell
  openFolder: (path: string) => ipcRenderer.invoke('shell:openFolder', path),

  // Git
  isGitAvailable: () => ipcRenderer.invoke('git:available'),

  // Workspace
  workspaceNeedsSetup: () => ipcRenderer.invoke('workspace:needsSetup'),
  workspaceScaffold: () => ipcRenderer.invoke('workspace:scaffold'),
  onChooseLanguage: (callback: () => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('workspace:chooseLanguage', handler)
    return () => { ipcRenderer.removeListener('workspace:chooseLanguage', handler) }
  },

  // Reset
  resetSettings: () => ipcRenderer.invoke('reset:settings'),
  resetConversations: () => ipcRenderer.invoke('reset:conversations'),
  resetScheduler: () => ipcRenderer.invoke('reset:scheduler'),
  resetWorkspace: () => ipcRenderer.invoke('reset:workspace'),
  resetWhatsApp: () => ipcRenderer.invoke('reset:whatsapp'),
  resetFull: () => ipcRenderer.invoke('reset:full')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error non-isolated fallback
  window.electron = electronAPI
  // @ts-expect-error non-isolated fallback
  window.api = api
}
