/**
 * Tests for scheduled_tasks DB CRUD.
 *
 * We can't use initDb() directly because it depends on Electron's `app` module.
 * Instead, we replicate the schema setup with a temp file DB and test the
 * SQL operations directly using better-sqlite3.
 *
 * NOTE: better-sqlite3 is compiled for Electron's Node ABI. When running with
 * system Node (vitest), the native module may not be compatible. In that case,
 * these tests are automatically skipped.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'

// Try to load better-sqlite3 — may fail if compiled for different Node ABI
let Database: typeof import('better-sqlite3').default
let canLoadSqlite = false
try {
  Database = (await import('better-sqlite3')).default
  // Try to actually create a DB to verify it works
  const testDb = new Database(':memory:')
  testDb.close()
  canLoadSqlite = true
} catch {
  // Native module incompatible — tests will be skipped
}

// ─── Schema (copied from db.ts migrations) ──────────────────

const SCHEMA = `
CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  prompt    TEXT NOT NULL,
  cronExpr  TEXT NOT NULL,
  enabled   INTEGER DEFAULT 1,
  oneShot   INTEGER DEFAULT 0,
  startDate TEXT DEFAULT NULL,
  lastRunAt TEXT DEFAULT NULL,
  createdAt TEXT DEFAULT (datetime('now', 'localtime'))
);
`

// ─── Minimal CRUD (mirrors db.ts functions) ──────────────────

interface ScheduledTask {
  id: string
  name: string
  prompt: string
  cronExpr: string
  enabled: boolean
  oneShot: boolean
  startDate: string | null
  lastRunAt: string | null
  createdAt: string
}

type ScheduledTaskRow = Omit<ScheduledTask, 'enabled' | 'oneShot'> & { enabled: number; oneShot: number }

function mapRow(row: unknown): ScheduledTask {
  const r = row as ScheduledTaskRow
  return { ...r, enabled: r.enabled === 1, oneShot: r.oneShot === 1 }
}

function getAll(db: Database.Database): ScheduledTask[] {
  return db.prepare('SELECT * FROM scheduled_tasks ORDER BY createdAt ASC').all().map(mapRow)
}

function add(db: Database.Database, id: string, name: string, prompt: string, cronExpr: string, oneShot: boolean, startDate: string | null): void {
  db.prepare('INSERT INTO scheduled_tasks (id, name, prompt, cronExpr, oneShot, startDate) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, prompt, cronExpr, oneShot ? 1 : 0, startDate)
}

function update(db: Database.Database, id: string, updates: Partial<Pick<ScheduledTask, 'name' | 'prompt' | 'cronExpr' | 'enabled' | 'oneShot' | 'startDate'>>): void {
  const sets: string[] = []
  const values: unknown[] = []
  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name) }
  if (updates.prompt !== undefined) { sets.push('prompt = ?'); values.push(updates.prompt) }
  if (updates.cronExpr !== undefined) { sets.push('cronExpr = ?'); values.push(updates.cronExpr) }
  if (updates.enabled !== undefined) { sets.push('enabled = ?'); values.push(updates.enabled ? 1 : 0) }
  if (updates.oneShot !== undefined) { sets.push('oneShot = ?'); values.push(updates.oneShot ? 1 : 0) }
  if (updates.startDate !== undefined) { sets.push('startDate = ?'); values.push(updates.startDate) }
  if (sets.length === 0) return
  values.push(id)
  db.prepare(`UPDATE scheduled_tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

function remove(db: Database.Database, id: string): void {
  db.prepare('DELETE FROM scheduled_tasks WHERE id = ?').run(id)
}

function markRun(db: Database.Database, id: string): void {
  db.prepare("UPDATE scheduled_tasks SET lastRunAt = datetime('now', 'localtime') WHERE id = ?").run(id)
}

// ─── Tests ───────────────────────────────────────────────────

describe.skipIf(!canLoadSqlite)('scheduled_tasks DB CRUD', () => {
  let db: import('better-sqlite3').Database
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'miniagent-test-'))
    db = new Database(join(tmpDir, 'test.db'))
    db.pragma('journal_mode = WAL')
    db.exec(SCHEMA)
  })

  afterEach(() => {
    db.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('table exists and is empty initially', () => {
    const rows = getAll(db)
    expect(rows).toHaveLength(0)
  })

  it('add a task and retrieve it', () => {
    add(db, 'task-1', 'Check News', 'Suche nach AI Papern', '0 10 * * *', false, null)
    const tasks = getAll(db)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('task-1')
    expect(tasks[0].name).toBe('Check News')
    expect(tasks[0].prompt).toBe('Suche nach AI Papern')
    expect(tasks[0].cronExpr).toBe('0 10 * * *')
    expect(tasks[0].enabled).toBe(true)
    expect(tasks[0].oneShot).toBe(false)
    expect(tasks[0].startDate).toBeNull()
    expect(tasks[0].lastRunAt).toBeNull()
    expect(tasks[0].createdAt).toBeTruthy()
  })

  it('add oneShot task with startDate', () => {
    add(db, 'task-2', 'Once Task', 'do once', '0 9 25 2 *', true, '2026-02-25')
    const tasks = getAll(db)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].oneShot).toBe(true)
    expect(tasks[0].startDate).toBe('2026-02-25')
  })

  it('add multiple tasks', () => {
    add(db, 'a', 'First', 'p1', '0 9 * * *', false, null)
    add(db, 'b', 'Second', 'p2', '*/30 * * * *', false, null)
    add(db, 'c', 'Third', 'p3', '0 9 * * 1,3,5', false, '2026-03-01')
    expect(getAll(db)).toHaveLength(3)
  })

  it('duplicate id throws', () => {
    add(db, 'dup', 'A', 'p', '0 9 * * *', false, null)
    expect(() => add(db, 'dup', 'B', 'p', '0 9 * * *', false, null)).toThrow()
  })

  // ─── Update ────────────────────────────────────────────────

  it('update name and prompt', () => {
    add(db, 'u1', 'Old', 'old prompt', '0 9 * * *', false, null)
    update(db, 'u1', { name: 'New', prompt: 'new prompt' })
    const task = getAll(db)[0]
    expect(task.name).toBe('New')
    expect(task.prompt).toBe('new prompt')
  })

  it('update enabled to false', () => {
    add(db, 'u2', 'Task', 'p', '0 9 * * *', false, null)
    update(db, 'u2', { enabled: false })
    expect(getAll(db)[0].enabled).toBe(false)
  })

  it('update cronExpr', () => {
    add(db, 'u3', 'Task', 'p', '0 9 * * *', false, null)
    update(db, 'u3', { cronExpr: '*/15 * * * *' })
    expect(getAll(db)[0].cronExpr).toBe('*/15 * * * *')
  })

  it('update startDate', () => {
    add(db, 'u4', 'Task', 'p', '0 9 * * *', false, null)
    update(db, 'u4', { startDate: '2026-06-01' })
    expect(getAll(db)[0].startDate).toBe('2026-06-01')
  })

  it('update startDate to null', () => {
    add(db, 'u5', 'Task', 'p', '0 9 * * *', false, '2026-03-01')
    update(db, 'u5', { startDate: null })
    expect(getAll(db)[0].startDate).toBeNull()
  })

  it('update with empty updates is noop', () => {
    add(db, 'u6', 'Task', 'p', '0 9 * * *', false, null)
    update(db, 'u6', {})
    expect(getAll(db)[0].name).toBe('Task') // unchanged
  })

  // ─── Remove ────────────────────────────────────────────────

  it('remove a task', () => {
    add(db, 'r1', 'A', 'p', '0 9 * * *', false, null)
    add(db, 'r2', 'B', 'p', '0 9 * * *', false, null)
    remove(db, 'r1')
    const tasks = getAll(db)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('r2')
  })

  it('remove non-existent id is noop', () => {
    add(db, 'r3', 'A', 'p', '0 9 * * *', false, null)
    remove(db, 'nonexistent')
    expect(getAll(db)).toHaveLength(1)
  })

  // ─── markRun ───────────────────────────────────────────────

  it('markRun sets lastRunAt', () => {
    add(db, 'm1', 'Task', 'p', '0 9 * * *', false, null)
    expect(getAll(db)[0].lastRunAt).toBeNull()
    markRun(db, 'm1')
    const task = getAll(db)[0]
    expect(task.lastRunAt).toBeTruthy()
    expect(task.lastRunAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
  })

  // ─── Boolean mapping ──────────────────────────────────────

  it('enabled/oneShot stored as 0/1, returned as boolean', () => {
    add(db, 'b1', 'Task', 'p', '0 9 * * *', true, null)
    // Raw query should have integers
    const raw = db.prepare('SELECT enabled, oneShot FROM scheduled_tasks WHERE id = ?').get('b1') as { enabled: number; oneShot: number }
    expect(raw.enabled).toBe(1)
    expect(raw.oneShot).toBe(1)
    // Mapped should have booleans
    const mapped = getAll(db)[0]
    expect(mapped.enabled).toBe(true)
    expect(mapped.oneShot).toBe(true)
  })

  // ─── Migration V4 simulation ──────────────────────────────

  it('startDate column exists and defaults to NULL', () => {
    // We already create the table with startDate column in SCHEMA above
    add(db, 'sd1', 'Task', 'p', '0 9 * * *', false, null)
    const info = db.prepare("PRAGMA table_info('scheduled_tasks')").all() as Array<{ name: string; dflt_value: string | null }>
    const col = info.find((c) => c.name === 'startDate')
    expect(col).toBeDefined()
    expect(col!.dflt_value).toBe('NULL')
  })
})
