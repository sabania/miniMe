import {
  existsSync,
  lstatSync,
  mkdirSync,
  symlinkSync,
  rmdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  renameSync
} from 'fs'
import { join, isAbsolute } from 'path'
import { execSync, execFileSync } from 'child_process'
import { app } from 'electron'
import { getTypedConfig } from './config'
import { getProjects, getContacts } from './db'

const NAME_RE = /^[a-zA-Z0-9_-]+$/

// ─── Git Helpers ──────────────────────────────────────────────

let gitAvailableCache: boolean | null = null

/** Check if git is installed (cached after first call) */
export function isGitAvailable(): boolean {
  if (gitAvailableCache !== null) return gitAvailableCache
  try {
    execSync('git --version', { stdio: 'ignore' })
    gitAvailableCache = true
  } catch {
    gitAvailableCache = false
  }
  return gitAvailableCache
}

/**
 * Initialize a git repo in a project directory with a baseline commit.
 * Skips if git disabled, git not available, or .git/ already exists.
 */
export function initProjectGit(projectPath: string): void {
  if (!getTypedConfig('useGit') || !isGitAvailable()) return
  if (existsSync(join(projectPath, '.git'))) return

  try {
    execSync('git init', { cwd: projectPath, stdio: 'ignore' })
    execSync('git add -A', { cwd: projectPath, stdio: 'ignore' })
    const status = execSync('git status --porcelain', { cwd: projectPath, encoding: 'utf-8' }).trim()
    if (status) {
      execFileSync('git', ['commit', '-m', 'baseline: project linked'], { cwd: projectPath, stdio: 'ignore' })
    }
    console.log(`[workspace] git repo initialized in project: ${projectPath}`)
  } catch (err) {
    console.warn(`[workspace] git init failed for project ${projectPath}:`, err)
  }
}

/** Initialize git repos for all linked projects that don't have one yet. */
export function initAllProjectGits(): void {
  for (const project of getProjects()) {
    if (existsSync(project.hostPath)) {
      initProjectGit(project.hostPath)
    }
  }
}

/**
 * Create a Windows Directory Junction from workspace/projects/<name> → hostPath.
 * Uses Node.js native fs.symlinkSync (no shell execution).
 * Returns the junction path.
 */
export function createJunction(name: string, hostPath: string): string {
  if (!NAME_RE.test(name)) {
    throw new Error(`Invalid project name: "${name}" (only a-z, 0-9, -, _)`)
  }
  if (!isAbsolute(hostPath)) {
    throw new Error(`Path must be absolute: "${hostPath}"`)
  }
  if (hostPath.includes('\0')) {
    throw new Error('Path contains null bytes')
  }
  if (!existsSync(hostPath)) {
    throw new Error(`Path does not exist: "${hostPath}"`)
  }

  const workspacePath = getTypedConfig('workspacePath')
  const projectsDir = join(workspacePath, 'projects')
  mkdirSync(projectsDir, { recursive: true })

  const junctionPath = join(projectsDir, name)
  if (existsSync(junctionPath)) {
    throw new Error(`Junction already exists: "${junctionPath}"`)
  }

  // Windows: junction (no admin needed), Linux: directory symlink
  symlinkSync(hostPath, junctionPath, process.platform === 'win32' ? 'junction' : 'dir')

  // Initialize git repo in the project directory (baseline commit)
  initProjectGit(hostPath)

  return junctionPath
}

/**
 * Remove a Windows Directory Junction (only the link, not the target content).
 * Uses Node.js native fs.rmdirSync (no shell execution).
 */
export function removeJunction(junctionPath: string): void {
  if (!existsSync(junctionPath)) return

  const stat = lstatSync(junctionPath)
  if (!stat.isSymbolicLink() && !stat.isDirectory()) {
    throw new Error(`Not a junction: "${junctionPath}"`)
  }

  // rmdirSync removes the junction link without touching the target directory
  rmdirSync(junctionPath)
}

// ─── First-Run Detection ─────────────────────────────────────

/** Flag set when workspace has no CLAUDE.md yet (first run) */
export let needsLanguageChoice = false

/** Check whether the workspace needs initial setup (no CLAUDE.md yet) */
export function workspaceNeedsSetup(): boolean {
  const ws = getTypedConfig('workspacePath')
  return !existsSync(join(ws, 'CLAUDE.md'))
}

// ─── Scaffolding ─────────────────────────────────────────────

function getTemplatesDir(): string {
  const lang = getTypedConfig('language')
  if (app.isPackaged) {
    return join(process.resourcesPath, 'templates', lang)
  }
  return join(app.getAppPath(), 'resources', 'templates', lang)
}

/** Copy a template file only if the destination does not exist yet. */
function scaffoldFile(srcRelative: string, destPath: string): void {
  if (existsSync(destPath)) return
  const src = join(getTemplatesDir(), srcRelative)
  if (!existsSync(src)) {
    console.warn(`[workspace] Template not found: ${src}`)
    return
  }
  mkdirSync(join(destPath, '..'), { recursive: true })
  copyFileSync(src, destPath)
}

/**
 * Recursively copy all files from srcDir into destDir.
 * Overwrites existing files (app-versioned). Does NOT delete user-created files.
 */
function copyDirRecursive(srcDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true })
  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry)
    const destPath = join(destDir, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

/**
 * Initialize workspace as a git repo (if git is available).
 * Creates .gitignore, initial commit. Safe to call repeatedly.
 */
export function initGitRepo(ws: string): void {
  if (!getTypedConfig('useGit') || !isGitAvailable()) return

  const gitDir = join(ws, '.git')
  const isNew = !existsSync(gitDir)

  if (isNew) {
    execSync('git init', { cwd: ws, stdio: 'ignore' })
    console.log('[workspace] git repo initialized')
  }

  // .gitignore — track CLAUDE.md (agent customizations), ignore CLAUDE.local.md (personal data)
  const gitignore = `# Personal data (regenerated on every app start)
/CLAUDE.local.md

# App-managed config and skills
.claude/

# Project junctions (symlinks to host paths)
projects/

# Temporary files (media, experiments)
tmp/
`
  writeFileSync(join(ws, '.gitignore'), gitignore, 'utf-8')

  // Auto-commit changes (scaffold files, memory updates, etc.)
  try {
    execSync('git add -A', { cwd: ws, stdio: 'ignore' })
    // Only commit if there are staged changes
    const status = execSync('git status --porcelain', { cwd: ws, encoding: 'utf-8' }).trim()
    if (status) {
      const msg = isNew ? 'Initial workspace scaffold' : 'Workspace update'
      execFileSync('git', ['commit', '-m', msg], { cwd: ws, stdio: 'ignore' })
      console.log(`[workspace] git commit: ${msg}`)
    }
  } catch (err) {
    console.warn('[workspace] git commit failed:', err)
  }
}

/**
 * Set up workspace directory structure, copy templates, generate dynamic files.
 * Safe to call on every app start — never overwrites user content.
 *
 * On first run (no CLAUDE.md yet), sets `needsLanguageChoice = true` and returns
 * without scaffolding. The main process will show the language dialog first,
 * then call this function again after the language is set.
 */
export function scaffoldWorkspace(): void {
  const ws = getTypedConfig('workspacePath')

  // First-run: need language choice before scaffolding
  if (!existsSync(join(ws, 'CLAUDE.md'))) {
    needsLanguageChoice = true
    return
  }

  _doScaffold(ws)
}

/** Internal: actual scaffolding logic (shared between scaffoldWorkspace and forceScaffoldWorkspace) */
function _doScaffold(ws: string): void {
  // 1. Create directories (Second Brain structure)
  for (const dir of [
    'memory',
    'memory/meta',
    'memory/user',
    'memory/people',
    'memory/projects',
    'memory/decisions',
    'memory/ideas',
    'memory/journal',
    'memory/journal/monthly',
    'tmp',
    'tmp/media'
  ]) {
    mkdirSync(join(ws, dir), { recursive: true })
  }

  // 2. Migrate MEMORY.md → CLAUDE.md (one-time, from previous version)
  const oldMemoryIndex = join(ws, 'memory', 'MEMORY.md')
  const newMemoryIndex = join(ws, 'memory', 'CLAUDE.md')
  if (existsSync(oldMemoryIndex) && !existsSync(newMemoryIndex)) {
    renameSync(oldMemoryIndex, newMemoryIndex)
    console.log('[workspace] Migrated memory/MEMORY.md → memory/CLAUDE.md')
  }

  // 3. Scaffold files (only if missing — never overwrite user content)
  scaffoldFile('CLAUDE.md', join(ws, 'CLAUDE.md'))
  scaffoldFile('CLAUDE.local.md', join(ws, 'CLAUDE.local.md'))
  scaffoldFile('SOUL.md', join(ws, 'SOUL.md'))
  scaffoldFile('HEARTBEAT.md', join(ws, 'HEARTBEAT.md'))
  scaffoldFile('memory/CLAUDE.md', join(ws, 'memory', 'CLAUDE.md'))
  scaffoldFile('memory/meta/CLAUDE.md', join(ws, 'memory', 'meta', 'CLAUDE.md'))
  scaffoldFile('memory/meta/strategy.md', join(ws, 'memory', 'meta', 'strategy.md'))
  scaffoldFile('memory/meta/procedures.md', join(ws, 'memory', 'meta', 'procedures.md'))
  scaffoldFile('memory/user/CLAUDE.md', join(ws, 'memory', 'user', 'CLAUDE.md'))
  scaffoldFile('memory/people/CLAUDE.md', join(ws, 'memory', 'people', 'CLAUDE.md'))
  scaffoldFile('memory/projects/CLAUDE.md', join(ws, 'memory', 'projects', 'CLAUDE.md'))
  scaffoldFile('memory/decisions/CLAUDE.md', join(ws, 'memory', 'decisions', 'CLAUDE.md'))
  scaffoldFile('memory/ideas/_inbox.md', join(ws, 'memory', 'ideas', '_inbox.md'))
  scaffoldFile('memory/journal/_current-week.md', join(ws, 'memory', 'journal', '_current-week.md'))

  // 4. Skills — always overwrite (app-versioned, not user content)
  //    Recursive copy so companion files (e.g. scripts/) are deployed too.
  const skillNames = ['memory-save', 'memory-recall', 'project-context', 'contact-lookup', 'task-context', 'rem-sleep', 'outlook', 'whisper-transcribe']
  for (const name of skillNames) {
    const srcDir = join(getTemplatesDir(), '.claude', 'skills', name)
    const destDir = join(ws, '.claude', 'skills', name)
    if (existsSync(srcDir)) {
      copyDirRecursive(srcDir, destDir)
    }
  }

  // 5. Merge hooks into .claude/settings.json
  mergeHooksConfig(ws)

  // 6. Generate dynamic files
  generateCLAUDEmd()
  generateUserProfile()

  // 7. Clean up old media files
  cleanupOldMedia(ws)

  // 8. Initialize git repo (tracks memory/ and SOUL.md history)
  initGitRepo(ws)

  console.log('[workspace] Scaffold complete:', ws)
}

// ─── Media Cleanup ───────────────────────────────────────────

function cleanupOldMedia(ws: string): void {
  const mediaDir = join(ws, 'tmp', 'media')
  if (!existsSync(mediaDir)) return

  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  const now = Date.now()
  let removed = 0

  try {
    for (const file of readdirSync(mediaDir)) {
      const filePath = join(mediaDir, file)
      const stat = statSync(filePath)
      if (stat.isFile() && now - stat.mtimeMs > maxAge) {
        unlinkSync(filePath)
        removed++
      }
    }
    if (removed > 0) console.log(`[workspace] Cleaned up ${removed} old media file(s)`)
  } catch (err) {
    console.warn('[workspace] Media cleanup error:', err)
  }
}

/**
 * Force scaffold — skips first-run check.
 * Called after language has been chosen (first run or reset).
 */
export function forceScaffoldWorkspace(): void {
  needsLanguageChoice = false
  const ws = getTypedConfig('workspacePath')
  _doScaffold(ws)
}

/** Delete workspace and re-scaffold from scratch */
export function resetWorkspace(): void {
  const ws = getTypedConfig('workspacePath')
  rmSync(ws, { recursive: true, force: true })
  // Don't auto-scaffold — caller will show language dialog first
}

/** Get the media directory path for storing downloaded WhatsApp media */
export function getMediaDir(): string {
  const ws = getTypedConfig('workspacePath')
  const dir = join(ws, 'tmp', 'media')
  mkdirSync(dir, { recursive: true })
  return dir
}

// ─── Default Permissions ──────────────────────────────────────

const DEFAULT_ALLOW_TOOLS = [
  'mcp__send-message__sendMessage',
  'mcp__scheduler__list_tasks',
  'mcp__scheduler__add_task',
  'mcp__scheduler__update_task',
  'mcp__scheduler__remove_task',
  'Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash'
]

/**
 * Ensure default tool permissions exist at {cwd}/.claude/settings.json.
 * Merges with existing settings — never overwrites user content.
 * Called before every SDK query to handle CWD changes (e.g. /project).
 */
export function ensurePermissionsAtCwd(cwd: string): void {
  const settingsPath = join(cwd, '.claude', 'settings.json')
  mkdirSync(join(cwd, '.claude'), { recursive: true })

  let settings: Record<string, unknown> = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    } catch { settings = {} }
  }

  const permissions = (settings.permissions ?? {}) as Record<string, string[]>
  const allow = permissions.allow ?? []
  let changed = false
  for (const tool of DEFAULT_ALLOW_TOOLS) {
    if (!allow.includes(tool)) {
      allow.push(tool)
      changed = true
    }
  }

  if (changed) {
    permissions.allow = allow
    settings.permissions = permissions
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
  }
}

/**
 * Merge our hooks into workspace/.claude/settings.json.
 * Preserves existing permissions and other config.
 */
function mergeHooksConfig(ws: string): void {
  const settingsPath = join(ws, '.claude', 'settings.json')
  mkdirSync(join(ws, '.claude'), { recursive: true })

  let settings: Record<string, unknown> = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    } catch {
      // Corrupted file — start fresh but keep backup
      settings = {}
    }
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>

  hooks.PreCompact = [
    {
      hooks: [
        {
          type: 'command',
          command:
            'echo LEARNING TRIGGER — Context wird komprimiert! ' +
            'Jetzt alles Wichtige aus dieser Session sichern bevor es verloren geht: ' +
            '1. Erkenntnisse, Entscheidungen, Patterns, Anti-Patterns → memory/ schreiben ' +
            '2. User-Praeferenzen oder neue Fakten → memory/user/ updaten ' +
            '3. Offene Punkte, laufende Arbeit → Status in memory/ dokumentieren ' +
            '4. Alle betroffenen CLAUDE.md Indexe aktualisieren ' +
            '5. git add memory/ SOUL.md CLAUDE.md .claude/skills/ && git commit -m Was gelernt: ...'
        }
      ]
    }
  ]

  settings.hooks = hooks

  // Ensure default permissions
  const permissions = (settings.permissions ?? {}) as Record<string, string[]>
  const allow = permissions.allow ?? []
  for (const tool of DEFAULT_ALLOW_TOOLS) {
    if (!allow.includes(tool)) allow.push(tool)
  }
  permissions.allow = allow
  settings.permissions = permissions

  // Enable auto memory by default
  const env = (settings.env ?? {}) as Record<string, string>
  if (!env.CLAUDE_CODE_DISABLE_AUTO_MEMORY) {
    env.CLAUDE_CODE_DISABLE_AUTO_MEMORY = '0'
  }
  // Trigger auto-compaction at 90% context usage → PreCompact hook fires with 10% room for memory saving
  if (!env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE) {
    env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE = '90'
  }
  settings.env = env

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

// ─── Marker-based Section Replacement ────────────────────────

/**
 * Replace content between <!-- GENERATED:name --> and <!-- /GENERATED:name --> markers.
 * If markers not found, appends the section at the end.
 * If file doesn't exist, returns null (caller should create from template).
 */
function replaceGeneratedSection(filePath: string, sectionName: string, newContent: string): boolean {
  if (!existsSync(filePath)) return false

  const content = readFileSync(filePath, 'utf-8')
  const startMarker = `<!-- GENERATED:${sectionName} -->`
  const endMarker = `<!-- /GENERATED:${sectionName} -->`
  const startIdx = content.indexOf(startMarker)
  const endIdx = content.indexOf(endMarker)

  const block = `${startMarker}\n${newContent}\n${endMarker}`

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing section
    const updated = content.slice(0, startIdx) + block + content.slice(endIdx + endMarker.length)
    writeFileSync(filePath, updated, 'utf-8')
  } else {
    // Markers not found — append section
    writeFileSync(filePath, content.trimEnd() + '\n\n' + block + '\n', 'utf-8')
  }
  return true
}

/**
 * Update the PROJECTS section in workspace/CLAUDE.md.
 * Only replaces the generated block — agent customizations are preserved.
 * If file doesn't exist yet, scaffoldFile creates it from template first.
 */
export function generateCLAUDEmd(): void {
  const ws = getTypedConfig('workspacePath')
  const filePath = join(ws, 'CLAUDE.md')
  const projects = getProjects()

  const lang = getTypedConfig('language')
  let projectTable: string
  if (projects.length > 0) {
    projectTable = lang === 'de'
      ? '## Projekte\n| Projekt | Pfad |\n|---------|------|\n' +
        projects.map((p) => `| ${p.name} | projects/${p.name}/ |`).join('\n')
      : '## Projects\n| Project | Path |\n|---------|------|\n' +
        projects.map((p) => `| ${p.name} | projects/${p.name}/ |`).join('\n')
  } else {
    projectTable = lang === 'de'
      ? '## Projekte\n(keine Projekte konfiguriert)'
      : '## Projects\n(no projects configured)'
  }

  replaceGeneratedSection(filePath, 'PROJECTS', projectTable)
}

/**
 * Update the USER section in workspace/CLAUDE.local.md.
 * Only replaces the generated block — agent customizations are preserved.
 */
export function generateUserProfile(): void {
  const ws = getTypedConfig('workspacePath')
  const filePath = join(ws, 'CLAUDE.local.md')
  const name = getTypedConfig('userName')
  const prefs = getTypedConfig('userPreferences')
  const contacts = getContacts()
  const owner = contacts.find((c) => c.isOwner)

  const lang = getTypedConfig('language')
  const lines = ['# User']
  if (name) lines.push(`Name: ${name}`)
  lines.push(lang === 'de' ? 'Sprache: Deutsch' : 'Language: English')
  if (owner) {
    lines.push(`${lang === 'de' ? 'Telefon' : 'Phone'}: +${owner.jid.replace(/@.*$/, '')}`)
    if (owner.displayName) lines.push(`WhatsApp: ${owner.displayName}`)
  }

  if (prefs) {
    lines.push('')
    lines.push(lang === 'de' ? '## Praeferenzen' : '## Preferences')
    lines.push(prefs)
  }

  if (contacts.length > 0) {
    lines.push('')
    lines.push(lang === 'de' ? '## Kontakte' : '## Contacts')
    lines.push(lang === 'de'
      ? '| Name | Nummer | Beschreibung |'
      : '| Name | Number | Description |')
    lines.push('|------|--------|-------------|')
    for (const c of contacts) {
      const num = '+' + c.jid.replace(/@.*$/, '')
      const desc = c.description || ''
      const tag = c.isOwner ? ' (Owner)' : ''
      lines.push(`| ${c.displayName || '?'}${tag} | ${num} | ${desc} |`)
    }
  }

  replaceGeneratedSection(filePath, 'USER', lines.join('\n'))
}
