import cron from 'node-cron'
import { handleScheduledPrompt } from './bridge'
import * as db from './db'
import { sendToRenderer } from './ipc-handlers'

import type { SchedulerLogEntry, SchedulerStatus } from '../shared/types'

// ─── Event Log (ring buffer) ────────────────────────────────

const MAX_LOG = 50
const eventLog: SchedulerLogEntry[] = []

function log(type: SchedulerLogEntry['type'], message: string): void {
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  const entry: SchedulerLogEntry = { ts, type, message }
  eventLog.push(entry)
  if (eventLog.length > MAX_LOG) eventLog.shift()
  console.log(`[scheduler] ${type}: ${message}`)
  sendToRenderer('scheduler:log', entry)
}

export function getSchedulerLog(): SchedulerLogEntry[] {
  return [...eventLog]
}

export function getSchedulerStatus(): SchedulerStatus {
  return {
    activeJobs: [...activeJobs.keys()],
    logEntries: getSchedulerLog()
  }
}

// ─── Active Jobs ────────────────────────────────────────────

const activeJobs = new Map<string, cron.ScheduledTask>()

export function startScheduler(): void {
  stopScheduler()

  // ─── Seed default tasks if missing ─────────────────────────
  seedDefaultTasks()

  // ─── Scheduled tasks from DB ───────────────────────────────
  const tasks = db.getScheduledTasks().filter((t) => t.enabled)
  for (const task of tasks) {
    if (!cron.validate(task.cronExpr)) {
      log('error', `Invalid cron for "${task.name}": ${task.cronExpr}`)
      continue
    }
    activeJobs.set(task.id, cron.schedule(task.cronExpr, () => {
      // Skip if startDate is in the future
      if (task.startDate) {
        const start = new Date(task.startDate + 'T00:00:00')
        if (new Date() < start) {
          log('skip', `"${task.name}" — starts ${task.startDate}`)
          return
        }
      }
      log('fire', `"${task.name}" (cron: ${task.cronExpr}, oneShot: ${task.oneShot})`)
      handleScheduledPrompt(`[Scheduled: ${task.name}] ${task.prompt}`, task.name)
        .then(() => {
          log('info', `"${task.name}" done`)
          db.markScheduledTaskRun(task.id)
          if (task.oneShot) {
            db.updateScheduledTask(task.id, { enabled: false })
            syncScheduledTasks()
          }
        })
        .catch((err) =>
          log('error', `"${task.name}" failed: ${(err as Error).message}`)
        )
    }))
    log('register', `"${task.name}" registered: ${task.cronExpr}`)
  }

  if (activeJobs.size === 0) {
    log('info', 'No active jobs')
  } else {
    log('info', `${activeJobs.size} active job(s)`)
  }
}

export function stopScheduler(): void {
  for (const [id] of activeJobs) {
    activeJobs.get(id)?.stop()
  }
  activeJobs.clear()
}

export function syncScheduledTasks(): void {
  startScheduler()
}

// ─── Default Task Seeding ──────────────────────────────────

const DEFAULT_TASKS = [
  {
    name: 'Heartbeat',
    prompt: '@HEARTBEAT.md — Pruefe Status und handle proaktiv.',
    cronExpr: '*/30 7-23 * * *'
  },
  {
    name: 'REM Sleep — Nightly Consolidation',
    prompt: '@.claude/skills/rem-sleep/SKILL.md — Naechtliche Konsolidierung starten.',
    cronExpr: '0 3 * * *'
  }
]

function seedDefaultTasks(): void {
  const existing = db.getScheduledTasks()
  for (const def of DEFAULT_TASKS) {
    const found = existing.find((t) => t.name === def.name)
    if (!found) {
      const id = crypto.randomUUID()
      db.addScheduledTask(id, def.name, def.prompt, def.cronExpr, false, null, 'system')
      log('seed', `Default task "${def.name}" created (${def.cronExpr})`)
    } else if (found.type !== 'system') {
      db.updateScheduledTask(found.id, { type: 'system' })
      log('seed', `Default task "${def.name}" type fixed to system`)
    }
  }
}
