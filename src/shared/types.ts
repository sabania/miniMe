// ─── Config Keys ────────────────────────────────────────────

export interface ConfigMap {
  permissionMode: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'
  model: string
  maxTurns: number
  workspacePath: string
  permissionTimeoutSec: number
  streamToWhatsApp: boolean
  whatsappAutoConnect: boolean
  currentCwd: string
  currentProject: string
  whatsappJid: string
  userName: string
  userPreferences: string
  minimizeToTray: boolean
  startWithSystem: boolean
  useGit: boolean
  language: 'de' | 'en'
}

export type ConfigKey = keyof ConfigMap

// ─── Conversations ──────────────────────────────────────────

export interface Conversation {
  id: string
  sdkSessionId: string | null
  cwd: string
  permissionMode: string
  status: 'active' | 'closed'
  totalCostUsd: number
  messageCount: number
  createdAt: string
  closedAt: string | null
}

export interface Message {
  id: number
  conversationId: string
  direction: 'inbound' | 'outbound' | 'system'
  content: string
  createdAt: string
}

// ─── Projects ───────────────────────────────────────────────

export interface Project {
  name: string
  hostPath: string
  junctionPath: string
  createdAt: string
}

// ─── Contacts ───────────────────────────────────────────────

export interface Contact {
  jid: string
  displayName: string
  description: string | null
  isOwner: boolean
  createdAt: string
}

// ─── Scheduled Tasks ────────────────────────────────────────

export type TaskType = 'system' | 'agent' | 'user'

export interface ScheduledTask {
  id: string
  name: string
  prompt: string
  cronExpr: string
  type: TaskType
  enabled: boolean
  oneShot: boolean
  startDate: string | null
  lastRunAt: string | null
  createdAt: string
}

// ─── Permission Requests ────────────────────────────────────

export interface PermissionRequest {
  id: string
  toolName: string
  toolInput: Record<string, unknown>
  timestamp: number
}

export interface PermissionResponse {
  id: string
  decision: 'allow' | 'deny'
  message?: string
  answer?: string // For AskUserQuestion — the selected option or free text
}

// ─── WhatsApp ───────────────────────────────────────────────

export type WhatsAppStatus = 'disconnected' | 'connecting' | 'connected'

export interface WhatsAppState {
  status: WhatsAppStatus
  jid: string | null
  qrCode: string | null
}

// ─── Agent ──────────────────────────────────────────────────

export type AgentStatus = 'idle' | 'working' | 'waiting_permission'

export interface AgentState {
  status: AgentStatus
  activeConversationId: string | null
  pendingPermission: PermissionRequest | null
}

// ─── Scheduler Log ─────────────────────────────────────────

export interface SchedulerLogEntry {
  ts: string
  type: 'register' | 'fire' | 'skip' | 'error' | 'info' | 'seed'
  message: string
}

export interface SchedulerStatus {
  activeJobs: string[]
  logEntries: SchedulerLogEntry[]
}

// ─── Auto-Update ────────────────────────────────────────────

export interface UpdateInfo {
  version: string
  releaseNotes?: string
}

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; info: UpdateInfo }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; info: UpdateInfo }
  | { state: 'error'; message: string }

// ─── Disk Sessions ─────────────────────────────────────────

export interface DiskSession {
  sessionId: string
  projectSlug: string
  projectPath: string
  cwd: string | null
  gitBranch: string | null
  firstPrompt: string | null
  messageCount: number
  createdAt: string
  lastModified: string
  fileSizeBytes: number
  linkedConversationId: string | null
}

// ─── IPC Channels ───────────────────────────────────────────

export interface IpcApi {
  // Config
  getConfig<K extends ConfigKey>(key: K): Promise<ConfigMap[K]>
  setConfig<K extends ConfigKey>(key: K, value: ConfigMap[K]): Promise<void>
  getAllConfig(): Promise<Partial<ConfigMap>>

  // WhatsApp
  whatsappConnect(): Promise<void>
  whatsappDisconnect(): Promise<void>
  whatsappGetState(): Promise<WhatsAppState>
  whatsappDeleteCredentials(): Promise<void>

  // Conversations
  getConversations(): Promise<Conversation[]>
  getMessages(conversationId: string): Promise<Message[]>
  newConversation(): Promise<string>
  deleteConversation(id: string): Promise<void>
  resumeConversation(id: string): Promise<void>
  abortAgent(): Promise<void>
  openSessionTerminal(id: string): Promise<void>
  openSessionVSCode(id: string): Promise<void>

  // Projects
  getProjects(): Promise<Project[]>
  addProject(name: string, hostPath: string): Promise<Project>
  removeProject(name: string): Promise<void>
  openFolderDialog(): Promise<string | null>

  // Contacts
  getContacts(): Promise<Contact[]>
  addContact(jid: string, displayName: string, description?: string, isOwner?: boolean): Promise<Contact[]>
  updateContact(jid: string, updates: Partial<Pick<Contact, 'displayName' | 'description' | 'isOwner'>>): Promise<Contact[]>
  removeContact(jid: string): Promise<Contact[]>

  // Scheduled Tasks
  getScheduledTasks(): Promise<ScheduledTask[]>
  addScheduledTask(name: string, prompt: string, cronExpr: string, oneShot: boolean, startDate: string | null, type?: TaskType): Promise<ScheduledTask[]>
  updateScheduledTask(id: string, updates: Partial<Pick<ScheduledTask, 'name' | 'prompt' | 'cronExpr' | 'enabled' | 'oneShot' | 'startDate' | 'type'>>): Promise<ScheduledTask[]>
  removeScheduledTask(id: string): Promise<ScheduledTask[]>

  // Models
  getModels(): Promise<{ value: string; label: string; description: string }[]>

  // Scheduler Status
  getSchedulerStatus(): Promise<SchedulerStatus>

  // Agent
  getAgentState(): Promise<AgentState>
  respondPermission(response: PermissionResponse): Promise<void>

  // Events (renderer subscribes)
  onWhatsAppState(callback: (state: WhatsAppState) => void): () => void
  onAgentState(callback: (state: AgentState) => void): () => void
  onScheduledTasksChanged(callback: (tasks: ScheduledTask[]) => void): () => void
  onSchedulerLog(callback: (entry: SchedulerLogEntry) => void): () => void
  onNewMessage(callback: (conversationId: string) => void): () => void
  onConfigChanged(callback: (key: string, value: unknown) => void): () => void
  onNavigate(callback: (view: string) => void): () => void

  // Updater
  getUpdateStatus(): Promise<UpdateStatus>
  checkForUpdates(): Promise<void>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>
  getAppVersion(): Promise<string>
  onUpdateStatus(callback: (status: UpdateStatus) => void): () => void

  // Disk Sessions
  getDiskSessions(): Promise<DiskSession[]>
  importDiskSession(sessionId: string, projectSlug: string): Promise<string>

  // Shell
  openFolder(path: string): Promise<void>

  // Git
  isGitAvailable(): Promise<boolean>

  // Workspace
  workspaceNeedsSetup(): Promise<boolean>
  workspaceScaffold(): Promise<void>

  // Events (renderer subscribes)
  onChooseLanguage(callback: () => void): () => void

  // Reset
  resetSettings(): Promise<void>
  resetConversations(): Promise<void>
  resetScheduler(): Promise<void>
  resetWorkspace(): Promise<void>
  resetWhatsApp(): Promise<void>
  resetFull(): Promise<void>
}
