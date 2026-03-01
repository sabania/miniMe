import { homedir } from 'os'
import { join } from 'path'
import { readdirSync, statSync, readFileSync, existsSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import * as db from './db'
import { platform } from './platform'
import type { DiskSession } from '../shared/types'

// ─── Slug helpers ────────────────────────────────────────────

/** Convert an absolute path to a Claude-style project slug */
export function pathToProjectSlug(p: string): string {
  // Claude Code replaces all non-alphanumeric chars with '-'
  // e.g. C:\Users\asa\AppData → C--Users-asa-AppData
  return p.replace(/[^a-zA-Z0-9]/g, '-')
}

/** Decode a project slug back to an absolute path (platform-aware) */
export function decodeProjectSlug(slug: string): string {
  return platform.decodeProjectSlug(slug)
}

// ─── History cache ───────────────────────────────────────────

interface HistoryEntry {
  sessionId: string
  display: string
  timestamp: string
}

const HISTORY_TTL_MS = 30_000
let _historyCache: Map<string, HistoryEntry> | null = null
let _historyCacheTime = 0

function loadHistoryMap(): Map<string, HistoryEntry> {
  const now = Date.now()
  if (_historyCache && now - _historyCacheTime < HISTORY_TTL_MS) return _historyCache

  const historyPath = join(homedir(), '.claude', 'history.jsonl')
  const map = new Map<string, HistoryEntry>()
  if (!existsSync(historyPath)) {
    _historyCache = map
    _historyCacheTime = now
    return map
  }

  try {
    const content = readFileSync(historyPath, 'utf-8')
    for (const line of content.split('\n')) {
      if (!line.trim()) continue
      try {
        const obj = JSON.parse(line)
        if (obj.sessionId && obj.display) {
          // Keep the first entry per session (earliest prompt)
          if (!map.has(obj.sessionId)) {
            map.set(obj.sessionId, {
              sessionId: obj.sessionId,
              display: obj.display,
              timestamp: obj.timestamp ?? ''
            })
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // history file unreadable
  }
  _historyCache = map
  _historyCacheTime = now
  return map
}

// ─── JSONL parser (first N lines) ────────────────────────────

interface SessionMeta {
  sessionId: string | null
  cwd: string | null
  gitBranch: string | null
  createdAt: string | null
  messageCount: number
}

async function parseJsonlHead(filePath: string, maxLines = 20): Promise<SessionMeta> {
  const meta: SessionMeta = {
    sessionId: null,
    cwd: null,
    gitBranch: null,
    createdAt: null,
    messageCount: 0
  }

  return new Promise((resolve) => {
    const stream = createReadStream(filePath, { encoding: 'utf-8', highWaterMark: 16 * 1024 })
    const rl = createInterface({ input: stream, crlfDelay: Infinity })
    let lineCount = 0
    let resolved = false
    const done = (): void => {
      if (resolved) return
      resolved = true
      resolve(meta)
    }

    rl.on('line', (line) => {
      lineCount++
      if (!line.trim()) return
      try {
        const obj = JSON.parse(line)
        const type = obj.type as string | undefined
        if (type === 'user' || type === 'assistant') {
          meta.messageCount++
        }
        if (type === 'user') {
          if (!meta.sessionId && obj.sessionId) meta.sessionId = obj.sessionId
          if (!meta.cwd && obj.cwd) meta.cwd = obj.cwd
          if (!meta.gitBranch && obj.gitBranch) meta.gitBranch = obj.gitBranch
          if (!meta.createdAt && obj.timestamp) meta.createdAt = obj.timestamp
        }
      } catch {
        // skip malformed lines
      }
      if (lineCount >= maxLines) {
        meta.messageCount = -1
        rl.close()
        stream.destroy()
        done()
      }
    })

    rl.on('close', done)
    rl.on('error', done)
  })
}

// ─── Main scanner ────────────────────────────────────────────

export async function listDiskSessions(workspacePath: string): Promise<DiskSession[]> {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(claudeProjectsDir)) return []

  // Only scan the workspace slug — user only sees their own sessions
  const workspaceSlug = pathToProjectSlug(workspacePath)
  const slugsToScan = [workspaceSlug]

  // Build a set of known sdkSessionIds from DB
  const knownSessions = new Map<string, string>()
  try {
    const convs = db.getConversations()
    for (const c of convs) {
      if (c.sdkSessionId) knownSessions.set(c.sdkSessionId, c.id)
    }
  } catch {
    // DB not ready
  }

  // Load history for first-prompt lookup
  const historyMap = loadHistoryMap()

  const results: DiskSession[] = []

  for (const slug of slugsToScan) {
    const slugDir = join(claudeProjectsDir, slug)
    if (!existsSync(slugDir)) continue

    let files: string[]
    try {
      files = readdirSync(slugDir).filter((f) => f.endsWith('.jsonl'))
    } catch {
      continue
    }

    for (const file of files) {
      const filePath = join(slugDir, file)
      const sessionId = file.replace(/\.jsonl$/, '')

      try {
        const stats = statSync(filePath)
        if (stats.size === 0) continue

        const meta = await parseJsonlHead(filePath, 20)

        // Use sessionId from JSONL if available, otherwise from filename
        const effectiveSessionId = meta.sessionId ?? sessionId

        const historyEntry = historyMap.get(effectiveSessionId)

        results.push({
          sessionId: effectiveSessionId,
          projectSlug: slug,
          projectPath: decodeProjectSlug(slug),
          cwd: meta.cwd,
          gitBranch: meta.gitBranch,
          firstPrompt: historyEntry?.display?.slice(0, 120) ?? null,
          messageCount: meta.messageCount,
          createdAt: meta.createdAt ?? stats.birthtime.toISOString(),
          lastModified: stats.mtime.toISOString(),
          fileSizeBytes: stats.size,
          linkedConversationId: knownSessions.get(effectiveSessionId) ?? null
        })
      } catch {
        // skip unreadable files
      }
    }
  }

  // Sort by lastModified DESC
  results.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())

  return results
}
