import { getTypedConfig, setTypedConfig } from './config'
import { isAbsolute } from 'path'
import { existsSync, statSync } from 'fs'
import * as whatsapp from './whatsapp'
import * as db from './db'
import * as bridge from './bridge'
import { getCachedModels } from './agent'
import type { ConfigMap } from '../shared/types'

export interface CommandResult {
  handled: boolean
  reply?: string
}

const PERMISSION_MODES: Record<string, ConfigMap['permissionMode']> = {
  '/bypass': 'bypassPermissions',
  '/accept': 'acceptEdits',
  '/ask': 'default',
  '/plan': 'plan'
}

function isOwnerJid(jid: string): boolean {
  const plain = jid.replace(/:.*@/, '@').replace(/@.*$/, '')
  return db.getContacts().some((c) => c.isOwner && (c.jid === plain || c.jid === jid))
}

export function parseCommand(content: string, jid: string): CommandResult {
  const trimmed = content.trim()
  if (!trimmed.startsWith('/')) return { handled: false }

  const parts = trimmed.split(/\s+/)
  const cmd = parts[0].toLowerCase()
  const arg = parts.slice(1).join(' ')

  // ─── Permission Mode Commands (owner only) ─────────────
  if (cmd in PERMISSION_MODES) {
    if (!isOwnerJid(jid)) return { handled: true, reply: 'Nur der Owner kann den Modus aendern.' }
    const mode = PERMISSION_MODES[cmd]
    setTypedConfig('permissionMode', mode)
    return { handled: true, reply: `Modus: ${mode}` }
  }

  // ─── Session Commands ─────────────────────────────────
  if (cmd === '/new') {
    const active = db.getActiveConversation()
    if (active) db.closeConversation(active.id)
    return { handled: true, reply: 'Neue Conversation gestartet.' }
  }

  if (cmd === '/stop') {
    bridge.abort()
    return { handled: true, reply: 'Stop angefordert.' }
  }

  // ─── Status ───────────────────────────────────────────
  if (cmd === '/status') {
    const mode = getTypedConfig('permissionMode')
    const cwd = getTypedConfig('currentCwd')
    const project = getTypedConfig('currentProject')
    const active = db.getActiveConversation()
    const waState = whatsapp.getWhatsAppState()

    const lines = [
      `WhatsApp: ${waState.status}${waState.jid ? ` (${waState.jid})` : ''}`,
      `Modus: ${mode}`,
      `CWD: ${cwd}`,
      project ? `Projekt: ${project}` : null,
      active
        ? `Session: ${active.id.slice(0, 8)}... | ${active.messageCount} msgs | $${active.totalCostUsd.toFixed(4)}`
        : 'Keine aktive Session'
    ]
    return { handled: true, reply: lines.filter(Boolean).join('\n') }
  }

  // ─── Workspace Navigation (owner only) ─────────────────
  if (cmd === '/project') {
    if (!isOwnerJid(jid)) return { handled: true, reply: 'Nur der Owner kann Projekte wechseln.' }
    if (!arg) {
      return { handled: true, reply: 'Usage: /project <name>' }
    }
    const projects = db.getProjects()
    const project = projects.find((p) => p.name === arg)
    if (!project) {
      const names = projects.map((p) => p.name).join(', ') || '(keine)'
      return { handled: true, reply: `Projekt "${arg}" nicht gefunden.\nVerfuegbar: ${names}` }
    }
    setTypedConfig('currentCwd', project.junctionPath)
    setTypedConfig('currentProject', project.name)
    return { handled: true, reply: `CWD: ${project.junctionPath}` }
  }

  // ─── Model Command (owner only for changes) ────────────
  if (cmd === '/model') {
    const models = getCachedModels() ?? []
    if (!arg) {
      const current = getTypedConfig('model')
      const list = models.map((m) =>
        `${m.value === current ? '→ ' : '  '}${m.label} (${m.value})`
      ).join('\n')
      return { handled: true, reply: `Modell: ${current}\n\n${list}\n\n/model <name> zum Wechseln` }
    }
    const q = arg.toLowerCase()
    if (!isOwnerJid(jid)) return { handled: true, reply: 'Nur der Owner kann das Modell aendern.' }
    const match = models.find((m) =>
      m.value.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)
    )
    if (!match) {
      return { handled: true, reply: `Unbekanntes Modell "${arg}". /model für Liste.` }
    }
    setTypedConfig('model', match.value)
    return { handled: true, reply: `Modell: ${match.label} (${match.value})` }
  }

  if (cmd === '/cwd') {
    if (!arg) {
      return { handled: true, reply: `CWD: ${getTypedConfig('currentCwd')}` }
    }
    if (!isOwnerJid(jid)) return { handled: true, reply: 'Nur der Owner kann CWD aendern.' }
    if (!isAbsolute(arg) || arg.includes('\0') || arg.startsWith('\\\\')) {
      return { handled: true, reply: 'Ungueltiger Pfad (muss absolut sein, kein UNC).' }
    }
    try {
      if (!existsSync(arg) || !statSync(arg).isDirectory()) {
        return { handled: true, reply: `Pfad existiert nicht oder ist kein Verzeichnis: ${arg}` }
      }
    } catch {
      return { handled: true, reply: `Pfad nicht zugreifbar: ${arg}` }
    }
    setTypedConfig('currentCwd', arg)
    setTypedConfig('currentProject', '')
    return { handled: true, reply: `CWD: ${arg}` }
  }

  if (cmd === '/projects') {
    const projects = db.getProjects()
    if (projects.length === 0) {
      return { handled: true, reply: 'Keine Projekte konfiguriert.' }
    }
    const current = getTypedConfig('currentProject')
    const lines = projects.map(
      (p) => `${p.name === current ? '> ' : '  '}${p.name} → ${p.hostPath}`
    )
    return { handled: true, reply: lines.join('\n') }
  }

  // ─── Help ────────────────────────────────────────────────
  if (cmd === '/help') {
    return {
      handled: true,
      reply: [
        '*App Commands:*',
        '/new — Neue Conversation',
        '/stop — Query abbrechen',
        '/status — Aktueller Status',
        '/model [name] — Modell anzeigen/wechseln',
        '/bypass /accept /ask /plan — Permission Mode',
        '/project <name> — Projekt wechseln',
        '/cwd [pfad] — CWD setzen/anzeigen',
        '/projects — Projekte auflisten',
        '',
        '_Andere /commands (z.B. /compact) gehen direkt an den Agent._'
      ].join('\n')
    }
  }

  // Unknown slash command → pass through to agent (SDK commands like /compact, /clear, custom commands)
  return { handled: false }
}
