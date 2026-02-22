import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'
import type { Conversation, Message, Project, Contact, ScheduledTask } from '../shared/types'

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS config (
  key       TEXT PRIMARY KEY,
  value     TEXT NOT NULL,
  updatedAt TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  sdkSessionId    TEXT,
  cwd             TEXT,
  permissionMode  TEXT,
  status          TEXT DEFAULT 'active',
  totalCostUsd    REAL DEFAULT 0,
  messageCount    INTEGER DEFAULT 0,
  createdAt       TEXT DEFAULT (datetime('now', 'localtime')),
  closedAt        TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversationId  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL,
  content         TEXT NOT NULL,
  createdAt       TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversationId);

CREATE TABLE IF NOT EXISTS projects (
  name          TEXT PRIMARY KEY,
  hostPath      TEXT NOT NULL,
  junctionPath  TEXT NOT NULL,
  createdAt     TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS permission_log (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversationId  TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  toolName        TEXT NOT NULL,
  toolInput       TEXT,
  decision        TEXT NOT NULL,
  respondedVia    TEXT,
  responseTimeMs  INTEGER,
  createdAt       TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX IF NOT EXISTS idx_permission_log_conv ON permission_log(conversationId);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);

CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`

const MIGRATION_V2 = `
CREATE TABLE IF NOT EXISTS contacts (
  jid         TEXT PRIMARY KEY,
  displayName TEXT NOT NULL DEFAULT '',
  description TEXT,
  isOwner     INTEGER NOT NULL DEFAULT 0,
  createdAt   TEXT DEFAULT (datetime('now', 'localtime'))
);

DELETE FROM schema_version;
INSERT INTO schema_version (version) VALUES (2);
`

const MIGRATION_V3 = `
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  prompt    TEXT NOT NULL,
  cronExpr  TEXT NOT NULL,
  enabled   INTEGER DEFAULT 1,
  oneShot   INTEGER DEFAULT 0,
  lastRunAt TEXT DEFAULT NULL,
  createdAt TEXT DEFAULT (datetime('now', 'localtime'))
);

DELETE FROM schema_version;
INSERT INTO schema_version (version) VALUES (3);
`

// V4: startDate column — handled inline (idempotent check needed for ALTER TABLE)

function migrateAllowedNumbersToContacts(database: Database.Database): void {
  const raw = database
    .prepare("SELECT value FROM config WHERE key = 'allowedNumbers'")
    .get() as { value: string } | undefined
  if (!raw?.value) return

  let numbers: string[]
  try { numbers = JSON.parse(raw.value) } catch { return }

  const insert = database.prepare(
    'INSERT OR IGNORE INTO contacts (jid, displayName) VALUES (?, ?)'
  )
  for (const num of numbers) {
    const clean = num.replace(/[^\d]/g, '')
    if (clean && clean.length >= 5) insert.run(clean, '')
  }
}

const ALLOWED_UPDATE_COLUMNS = new Set(['sdkSessionId', 'totalCostUsd', 'status', 'closedAt'])

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

export function initDb(): Database.Database {
  const dataDir = join(app.getPath('userData'), 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

  const dbPath = join(dataDir, 'minime.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA_V1)

  // Run migrations based on schema_version
  const currentVersion = (db.prepare('SELECT version FROM schema_version').get() as { version: number })?.version ?? 1

  if (currentVersion < 2) {
    db.transaction(() => {
      db.exec(MIGRATION_V2)
      migrateAllowedNumbersToContacts(db)
    })()
    console.log('[db] Migrated to V2 — contacts table created')
  }

  if (currentVersion < 3) {
    db.transaction(() => {
      db.exec(MIGRATION_V3)
    })()
    console.log('[db] Migrated to V3 — scheduled_tasks table created')
  }

  if (currentVersion < 4) {
    db.transaction(() => {
      const cols = db.prepare("PRAGMA table_info('scheduled_tasks')").all() as { name: string }[]
      const hasStartDate = cols.some((c) => c.name === 'startDate')
      if (!hasStartDate) {
        db.exec('ALTER TABLE scheduled_tasks ADD COLUMN startDate TEXT DEFAULT NULL;')
      }
      db.exec('DELETE FROM schema_version; INSERT INTO schema_version (version) VALUES (4);')
    })()
    console.log('[db] Migrated to V4 — startDate column added')
  }

  if (currentVersion < 5) {
    db.transaction(() => {
      const cols = db.prepare("PRAGMA table_info('scheduled_tasks')").all() as { name: string }[]
      if (!cols.some((c) => c.name === 'type')) {
        db.exec("ALTER TABLE scheduled_tasks ADD COLUMN type TEXT DEFAULT 'user';")
      }
      db.exec("UPDATE scheduled_tasks SET type = 'system' WHERE name IN ('Heartbeat', 'REM Sleep — Nightly Consolidation');")
      db.exec('DELETE FROM schema_version; INSERT INTO schema_version (version) VALUES (5);')
    })()
    console.log('[db] Migrated to V5 — type column added')
  }

  if (currentVersion < 6) {
    db.transaction(() => {
      const row = db.prepare("SELECT value FROM config WHERE key = 'model'").get() as { value: string } | undefined
      if (row && row.value.startsWith('claude-')) {
        db.prepare("UPDATE config SET value = 'default' WHERE key = 'model'").run()
      }
      db.exec('DELETE FROM schema_version; INSERT INTO schema_version (version) VALUES (6);')
    })()
    console.log('[db] Migrated to V6 — model alias')
  }

  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}

// ─── Config CRUD ────────────────────────────────────────────

export function getConfig(key: string): string | undefined {
  const row = getDb()
    .prepare('SELECT value FROM config WHERE key = ?')
    .get(key) as { value: string } | undefined
  return row?.value
}

export function setConfig(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO config (key, value, updatedAt) VALUES (?, ?, datetime('now', 'localtime'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`
    )
    .run(key, value)
}

export function getAllConfig(): Record<string, string> {
  const rows = getDb().prepare('SELECT key, value FROM config').all() as {
    key: string
    value: string
  }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

// ─── Conversation CRUD ─────────────────────────────────────

export function createConversation(id: string, cwd: string, permissionMode: string): void {
  getDb()
    .prepare("INSERT INTO conversations (id, cwd, permissionMode, createdAt) VALUES (?, ?, ?, datetime('now', 'localtime'))")
    .run(id, cwd, permissionMode)
}

export function getActiveConversation(): Conversation | undefined {
  return getDb()
    .prepare("SELECT * FROM conversations WHERE status = 'active' ORDER BY createdAt DESC LIMIT 1")
    .get() as Conversation | undefined
}

export function getConversations(): Conversation[] {
  return getDb()
    .prepare('SELECT * FROM conversations ORDER BY createdAt DESC')
    .all() as Conversation[]
}

export function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'sdkSessionId' | 'totalCostUsd' | 'status' | 'closedAt'>>
): void {
  const sets: string[] = []
  const values: unknown[] = []
  for (const [key, val] of Object.entries(updates)) {
    if (!ALLOWED_UPDATE_COLUMNS.has(key)) {
      throw new Error(`Invalid update column: ${key}`)
    }
    sets.push(`${key} = ?`)
    values.push(val)
  }
  if (sets.length === 0) return
  values.push(id)
  getDb()
    .prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`)
    .run(...values)
}

export function closeConversation(id: string): void {
  getDb()
    .prepare("UPDATE conversations SET status = 'closed', closedAt = datetime('now', 'localtime') WHERE id = ?")
    .run(id)
}

export function resumeConversation(id: string): void {
  const d = getDb()
  d.transaction(() => {
    d.prepare("UPDATE conversations SET status = 'closed', closedAt = datetime('now', 'localtime') WHERE status = 'active'").run()
    d.prepare("UPDATE conversations SET status = 'active', closedAt = NULL WHERE id = ?").run(id)
  })()
}

export function deleteConversation(id: string): void {
  const d = getDb()
  d.transaction(() => {
    d.prepare('DELETE FROM permission_log WHERE conversationId = ?').run(id)
    d.prepare('DELETE FROM messages WHERE conversationId = ?').run(id)
    d.prepare('DELETE FROM conversations WHERE id = ?').run(id)
  })()
}

// ─── Message CRUD ───────────────────────────────────────────

export function addMessage(
  conversationId: string,
  direction: 'inbound' | 'outbound' | 'system',
  content: string
): void {
  getDb()
    .prepare("INSERT INTO messages (conversationId, direction, content, createdAt) VALUES (?, ?, ?, datetime('now', 'localtime'))")
    .run(conversationId, direction, content)
  getDb()
    .prepare('UPDATE conversations SET messageCount = messageCount + 1 WHERE id = ?')
    .run(conversationId)
}

export function getMessages(conversationId: string): Message[] {
  return getDb()
    .prepare('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC')
    .all(conversationId) as Message[]
}

// ─── Project CRUD ───────────────────────────────────────────

export function getProjects(): Project[] {
  return getDb().prepare('SELECT * FROM projects ORDER BY name').all() as Project[]
}

export function addProject(name: string, hostPath: string, junctionPath: string): void {
  getDb()
    .prepare("INSERT INTO projects (name, hostPath, junctionPath, createdAt) VALUES (?, ?, ?, datetime('now', 'localtime'))")
    .run(name, hostPath, junctionPath)
}

export function removeProject(name: string): void {
  getDb().prepare('DELETE FROM projects WHERE name = ?').run(name)
}

// ─── Permission Log ─────────────────────────────────────────

export function logPermission(
  conversationId: string | null,
  toolName: string,
  toolInput: string,
  decision: string,
  respondedVia: string,
  responseTimeMs: number
): void {
  getDb()
    .prepare(
      `INSERT INTO permission_log (conversationId, toolName, toolInput, decision, respondedVia, responseTimeMs, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`
    )
    .run(conversationId, toolName, toolInput, decision, respondedVia, responseTimeMs)
}

// ─── Contact CRUD ──────────────────────────────────────────

export function getContacts(): Contact[] {
  return getDb()
    .prepare('SELECT * FROM contacts ORDER BY isOwner DESC, displayName ASC')
    .all()
    .map(mapContact)
}

export function getContactByJid(jid: string): Contact | undefined {
  const row = getDb()
    .prepare('SELECT * FROM contacts WHERE jid = ?')
    .get(jid) as ContactRow | undefined
  return row ? mapContact(row) : undefined
}

export function addContact(
  jid: string,
  displayName: string,
  description?: string,
  isOwner?: boolean
): void {
  const d = getDb()
  d.transaction(() => {
    if (isOwner) {
      d.prepare('UPDATE contacts SET isOwner = 0 WHERE isOwner = 1').run()
    }
    d.prepare(
      "INSERT INTO contacts (jid, displayName, description, isOwner, createdAt) VALUES (?, ?, ?, ?, datetime('now', 'localtime'))"
    ).run(jid, displayName, description ?? null, isOwner ? 1 : 0)
  })()
}

export function updateContact(
  jid: string,
  updates: { displayName?: string; description?: string; isOwner?: boolean }
): void {
  const d = getDb()
  d.transaction(() => {
    if (updates.isOwner) {
      d.prepare('UPDATE contacts SET isOwner = 0 WHERE isOwner = 1').run()
    }
    const sets: string[] = []
    const values: unknown[] = []
    if (updates.displayName !== undefined) { sets.push('displayName = ?'); values.push(updates.displayName) }
    if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description) }
    if (updates.isOwner !== undefined) { sets.push('isOwner = ?'); values.push(updates.isOwner ? 1 : 0) }
    if (sets.length === 0) return
    values.push(jid)
    d.prepare(`UPDATE contacts SET ${sets.join(', ')} WHERE jid = ?`).run(...values)
  })()
}

export function removeContact(jid: string): void {
  getDb().prepare('DELETE FROM contacts WHERE jid = ?').run(jid)
}

export function resolveContactName(jid: string): string | undefined {
  const normalized = jid.replace(/:.*@/, '@')
  const plain = normalized.replace(/@.*$/, '')
  const row = getDb()
    .prepare('SELECT displayName FROM contacts WHERE jid = ? OR jid = ?')
    .get(normalized, plain) as { displayName: string } | undefined
  return row?.displayName || undefined
}

// ─── Scheduled Tasks CRUD ─────────────────────────────────

type ScheduledTaskRow = Omit<ScheduledTask, 'enabled' | 'oneShot'> & { enabled: number; oneShot: number }

function mapScheduledTask(row: unknown): ScheduledTask {
  const r = row as ScheduledTaskRow
  return { ...r, enabled: r.enabled === 1, oneShot: r.oneShot === 1 }
}

export function getScheduledTasks(): ScheduledTask[] {
  return getDb()
    .prepare('SELECT * FROM scheduled_tasks ORDER BY createdAt ASC')
    .all()
    .map(mapScheduledTask)
}

export function addScheduledTask(
  id: string,
  name: string,
  prompt: string,
  cronExpr: string,
  oneShot: boolean,
  startDate: string | null,
  type: string = 'user'
): void {
  getDb()
    .prepare("INSERT INTO scheduled_tasks (id, name, prompt, cronExpr, oneShot, startDate, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))")
    .run(id, name, prompt, cronExpr, oneShot ? 1 : 0, startDate, type)
}

export function updateScheduledTask(
  id: string,
  updates: Partial<Pick<ScheduledTask, 'name' | 'prompt' | 'cronExpr' | 'enabled' | 'oneShot' | 'startDate' | 'type'>>
): void {
  const sets: string[] = []
  const values: unknown[] = []
  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name) }
  if (updates.prompt !== undefined) { sets.push('prompt = ?'); values.push(updates.prompt) }
  if (updates.cronExpr !== undefined) { sets.push('cronExpr = ?'); values.push(updates.cronExpr) }
  if (updates.enabled !== undefined) { sets.push('enabled = ?'); values.push(updates.enabled ? 1 : 0) }
  if (updates.oneShot !== undefined) { sets.push('oneShot = ?'); values.push(updates.oneShot ? 1 : 0) }
  if (updates.startDate !== undefined) { sets.push('startDate = ?'); values.push(updates.startDate) }
  if (updates.type !== undefined) { sets.push('type = ?'); values.push(updates.type) }
  if (sets.length === 0) return
  values.push(id)
  getDb().prepare(`UPDATE scheduled_tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function removeScheduledTask(id: string): void {
  getDb().prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id)
}

// ─── Bulk Reset Functions ─────────────────────────────────────

export function resetConfig(): void {
  getDb().exec('DELETE FROM config;')
}

export function resetConversations(): void {
  const d = getDb()
  d.exec('DELETE FROM permission_log;')
  d.exec('DELETE FROM messages;')
  d.exec('DELETE FROM conversations;')
}

export function resetScheduledTasks(): void {
  getDb().exec('DELETE FROM scheduled_tasks;')
}

export function resetDatabase(): void {
  const d = getDb()
  d.exec('DELETE FROM permission_log;')
  d.exec('DELETE FROM messages;')
  d.exec('DELETE FROM conversations;')
  d.exec('DELETE FROM scheduled_tasks;')
  d.exec('DELETE FROM contacts;')
  d.exec('DELETE FROM projects;')
  d.exec('DELETE FROM config;')
}

export function markScheduledTaskRun(id: string): void {
  getDb().prepare("UPDATE scheduled_tasks SET lastRunAt = datetime('now', 'localtime') WHERE id = ?").run(id)
}

// SQLite returns isOwner as 0/1 — map to boolean
type ContactRow = Omit<Contact, 'isOwner'> & { isOwner: number }

function mapContact(row: unknown): Contact {
  const r = row as ContactRow
  return { ...r, isOwner: r.isOwner === 1 }
}
