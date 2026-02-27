import { homedir } from 'os'
import { join, sep } from 'path'
import { readdirSync, statSync, readFileSync, existsSync, createReadStream } from 'fs'
import { createInterface } from 'readline'
import * as db from './db'
import type { DiskSession } from '../shared/types'

// ─── Slug helpers ────────────────────────────────────────────

/** Convert an absolute path to a Claude-style project slug */
export function pathToProjectSlug(p: string): string {
  // Claude Code replaces all non-alphanumeric chars with '-'
  // e.g. C:\Users\asa\AppData → C--Users-asa-AppData
  return p.replace(/[^a-zA-Z0-9]/g, '-')
}

/** Decode a project slug back to a Windows/Linux path */
export function decodeProjectSlug(slug: string): string {
  // "C--Users-asa-..." → "C:\Users\asa\..."
  // Detect drive letter: slug starts with a single letter followed by '--'
  const driveMatch = slug.match(/^([A-Z])--(.*)/i)
  if (driveMatch) {
    const drive = driveMatch[1]
    const rest = driveMatch[2].replace(/-/g, sep)
    return `${drive}:${sep}${rest}`
  }
  // Linux-style: slug starts with '-' (from leading /)
  return slug.replace(/-/g, '/')
}

// ─── History cache ───────────────────────────────────────────

interface HistoryEntry {
  sessionId: string
  display: string
  timestamp: string
}

function loadHistoryMap(): Map<string, HistoryEntry> {
  const historyPath = join(homedir(), '.claude', 'history.jsonl')
  const map = new Map<string, HistoryEntry>()
  if (!existsSync(historyPath)) return map

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
        rl.close()
        stream.destroy()
      }
    })

    rl.on('close', () => resolve(meta))
    rl.on('error', () => resolve(meta))
  })
}

// ─── Main scanner ────────────────────────────────────────────

export async function listDiskSessions(workspacePath: string): Promise<DiskSession[]> {
  const claudeProjectsDir = join(homedir(), '.claude', 'projects')
  if (!existsSync(claudeProjectsDir)) return []

  // Derive the slug for the workspace path
  const workspaceSlug = pathToProjectSlug(workspacePath)

  // Also scan the repo slug (miniMe project root)
  const slugsToScan = new Set<string>([workspaceSlug])

  // Scan all project directories for broader coverage
  try {
    const entries = readdirSync(claudeProjectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        slugsToScan.add(entry.name)
      }
    }
  } catch {
    // can't read projects dir
  }

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
