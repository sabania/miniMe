import { randomUUID } from 'crypto'
import { Notification, BrowserWindow } from 'electron'
import { sendMessage, isConnected } from './whatsapp'
import { getTypedConfig } from './config'
import * as db from './db'
import { runQuery, setMcpMessageHandler, type PermissionRequestInfo, type PermissionDecision } from './agent'
import { sendToRenderer } from './ipc-util'
import type { AgentState, PermissionRequest, PermissionResponse } from '../shared/types'

// ─── State ──────────────────────────────────────────────────

type BridgeStatus = 'idle' | 'querying' | 'waiting_permission'

let status: BridgeStatus = 'idle'
let activeConversationId: string | null = null
let activeJid: string | null = null
let abortController: AbortController | null = null

let pendingPermission: {
  id: string
  info: PermissionRequestInfo
  resolve: (decision: PermissionDecision) => void
  timeout: ReturnType<typeof setTimeout>
  createdAt: number
} | null = null

// Outbound queue for when WhatsApp is disconnected
const outboundQueue: Array<{ jid: string; content: string; filePath?: string }> = []

// Keep notification reference alive to prevent garbage collection before click
let activeNotification: Notification | null = null

// ─── State Broadcasting ────────────────────────────────────

function currentPermissionRequest(): PermissionRequest | null {
  if (!pendingPermission) return null
  return {
    id: pendingPermission.id,
    toolName: pendingPermission.info.toolName,
    toolInput: pendingPermission.info.toolInput,
    timestamp: pendingPermission.createdAt
  }
}

function emitAgentState(): void {
  sendToRenderer('agent:state', getState())
  // Lazy import to avoid circular dependency (tray → bridge → tray)
  import('./tray').then(({ rebuildTrayMenu }) => rebuildTrayMenu()).catch(() => {})
}

function notifyPermissionRequest(info: PermissionRequestInfo): void {
  // Flash taskbar
  const win = BrowserWindow.getAllWindows()[0]
  if (win) win.flashFrame(true)

  // Desktop notification
  if (!Notification.isSupported()) return
  const isQuestion = info.toolName === 'AskUserQuestion'
  const title = isQuestion ? 'Agent has a question' : 'Permission Required'
  const body = isQuestion
    ? (info.toolInput.questions as Array<{ question?: string }>)?.[0]?.question ?? 'Agent needs your input'
    : `${info.toolName} — click to review`

  // Close previous notification if any
  if (activeNotification) {
    activeNotification.close()
    activeNotification = null
  }

  const notification = new Notification({ title, body, silent: false })
  activeNotification = notification // prevent garbage collection

  notification.on('click', () => {
    const w = BrowserWindow.getAllWindows()[0]
    if (w) {
      if (!w.isVisible()) w.show()
      if (w.isMinimized()) w.restore()
      w.focus()
      sendToRenderer('navigate', 'sessions')
    }
    activeNotification = null
  })
  notification.on('close', () => {
    activeNotification = null
  })
  notification.show()
}

function addMessageAndEmit(convId: string, direction: 'inbound' | 'outbound' | 'system', content: string): void {
  db.addMessage(convId, direction, content)
  sendToRenderer('agent:newMessage', convId)
}

export function getState(): AgentState {
  return {
    status: status === 'querying' ? 'working' : status === 'waiting_permission' ? 'waiting_permission' : 'idle',
    activeConversationId,
    pendingPermission: currentPermissionRequest()
  }
}

// ─── Send to WhatsApp (with queue) ─────────────────────────

const MAX_QUEUE_SIZE = 100

async function safeSend(jid: string, content: string, filePath?: string): Promise<void> {
  if (!isConnected()) {
    if (outboundQueue.length >= MAX_QUEUE_SIZE) {
      console.warn('[bridge] Outbound queue full, dropping oldest message')
      outboundQueue.shift()
    }
    outboundQueue.push({ jid, content, filePath })
    return
  }
  try {
    await sendMessage(jid, content, filePath)
  } catch (err) {
    console.error('[bridge] Send failed:', err)
    if (outboundQueue.length >= MAX_QUEUE_SIZE) {
      console.warn('[bridge] Outbound queue full, dropping oldest message')
      outboundQueue.shift()
    }
    outboundQueue.push({ jid, content, filePath })
  }
}

export async function drainOutboundQueue(): Promise<void> {
  while (outboundQueue.length > 0 && isConnected()) {
    const msg = outboundQueue.shift()!
    try {
      await sendMessage(msg.jid, msg.content, msg.filePath)
    } catch {
      outboundQueue.unshift(msg)
      break
    }
  }
}

// ─── Permission Handling ────────────────────────────────────

function formatPermissionMessage(info: PermissionRequestInfo): string {
  if (info.toolName === 'AskUserQuestion') {
    const questions = info.toolInput.questions as
      | Array<{
          question?: string
          options?: Array<{ label?: string; description?: string }>
        }>
      | undefined
    const q = questions?.[0]
    const question = q?.question ?? 'Frage von Claude'
    const options = q?.options ?? []

    let msg = `*${question}*\n`
    if (options.length > 0) {
      options.forEach((opt, i) => {
        msg += `\n${i + 1}. ${opt.label ?? opt.description ?? `Option ${i + 1}`}`
      })
      msg += '\n\n_Antwort mit Nummer oder eigenem Text._'
    } else {
      msg += '\n_Antwort als Text._'
    }
    return msg
  }

  // Regular tool permission
  const inputStr = JSON.stringify(info.toolInput, null, 2)
  const truncated = inputStr.length > 500 ? inputStr.slice(0, 497) + '...' : inputStr
  return [
    `*Permission: ${info.toolName}*`,
    '```',
    truncated,
    '```',
    '',
    '✅ 1 = Ja',
    '❌ 2 = Nein'
  ].join('\n')
}

function parsePermissionResponse(text: string, info: PermissionRequestInfo): PermissionDecision {
  const lower = text.trim().toLowerCase()

  if (info.toolName === 'AskUserQuestion') {
    const questions = info.toolInput.questions as Array<{
      question?: string
      options?: Array<{ label?: string }>
    }> | undefined
    const options = questions?.[0]?.options ?? []
    const num = parseInt(lower, 10)

    if (num >= 1 && num <= options.length) {
      return {
        behavior: 'allow',
        updatedInput: {
          ...info.toolInput,
          answers: { [String(questions?.[0]?.question ?? '')]: options[num - 1]?.label ?? text.trim() }
        }
      }
    }
    return {
      behavior: 'allow',
      updatedInput: {
        ...info.toolInput,
        answers: { [String(questions?.[0]?.question ?? '')]: text.trim() }
      }
    }
  }

  // Regular permission: number or text
  if (
    lower === 'allow' ||
    lower === '1' ||
    lower === 'ja' ||
    lower === 'yes' ||
    lower === 'j' ||
    lower === 'y'
  ) {
    return { behavior: 'allow', updatedInput: info.toolInput }
  }
  return { behavior: 'deny', message: 'User denied' }
}

async function handlePermissionRequest(info: PermissionRequestInfo): Promise<PermissionDecision> {
  if (!activeJid) {
    return { behavior: 'deny', message: 'No active WhatsApp session' }
  }

  const timeoutSec = getTypedConfig('permissionTimeoutSec')
  const requestId = randomUUID()

  return new Promise<PermissionDecision>((resolve) => {
    const timeout = setTimeout(() => {
      pendingPermission = null
      status = 'querying'
      emitAgentState()

      db.logPermission(
        activeConversationId,
        info.toolName,
        JSON.stringify(info.toolInput),
        'deny',
        'timeout',
        timeoutSec * 1000
      )

      safeSend(activeJid!, `Timeout (${timeoutSec}s) — automatisch abgelehnt.`)
      resolve({ behavior: 'deny', message: `Timeout after ${timeoutSec}s` })
    }, timeoutSec * 1000)

    // Set pendingPermission BEFORE emitAgentState so renderer gets the permission data
    pendingPermission = { id: requestId, info, resolve, timeout, createdAt: Date.now() }
    status = 'waiting_permission'
    emitAgentState()
    notifyPermissionRequest(info)
    sendToRenderer('navigate', 'sessions')

    safeSend(activeJid!, formatPermissionMessage(info))
  })
}

// ─── Public: Respond from WhatsApp ──────────────────────────

function resolvePermission(text: string): void {
  if (!pendingPermission) return

  const responseTimeMs = Date.now() - pendingPermission.createdAt
  const info = pendingPermission.info

  clearTimeout(pendingPermission.timeout)
  const decision = parsePermissionResponse(text, info)

  db.logPermission(
    activeConversationId,
    info.toolName,
    JSON.stringify(info.toolInput),
    decision.behavior,
    'whatsapp',
    responseTimeMs
  )

  const resolver = pendingPermission.resolve
  pendingPermission = null
  status = 'querying'
  emitAgentState()

  resolver(decision)
}

// ─── Public: Respond from UI ────────────────────────────────

export function respondPermissionFromUI(response: PermissionResponse): void {
  if (!pendingPermission || pendingPermission.id !== response.id) return

  clearTimeout(pendingPermission.timeout)

  let decision: PermissionDecision

  if (pendingPermission.info.toolName === 'AskUserQuestion' && response.answer) {
    // AskUserQuestion: always allow, pass user's answer in updatedInput
    const questions = pendingPermission.info.toolInput.questions as Array<{ question?: string }>
    const questionText = questions?.[0]?.question ?? ''
    decision = {
      behavior: 'allow',
      updatedInput: {
        ...pendingPermission.info.toolInput,
        answers: { [questionText]: response.answer }
      }
    }
  } else {
    // Regular tool permission
    decision = {
      behavior: response.decision,
      updatedInput: response.decision === 'allow' ? pendingPermission.info.toolInput : undefined,
      message: response.decision === 'deny' ? 'User denied' : response.message
    }
  }

  db.logPermission(
    activeConversationId,
    pendingPermission.info.toolName,
    JSON.stringify(pendingPermission.info.toolInput),
    response.decision,
    'ui',
    Date.now() - pendingPermission.createdAt
  )

  const resolver = pendingPermission.resolve
  pendingPermission = null
  status = 'querying'
  emitAgentState()

  resolver(decision)
}

// ─── Public: Abort ──────────────────────────────────────────

export function abort(): void {
  if (abortController) {
    abortController.abort()
  }
  if (pendingPermission) {
    clearTimeout(pendingPermission.timeout)
    pendingPermission.resolve({ behavior: 'deny', message: 'Aborted by user' })
    pendingPermission = null
  }
}

// ─── Heartbeat ──────────────────────────────────────────────

export function isIdle(): boolean {
  return status === 'idle'
}

export async function handleScheduledPrompt(prompt: string, label: string): Promise<void> {
  if (!isIdle()) {
    console.log(`[bridge] Skipping "${label}" — agent is busy (status: ${status})`)
    return
  }

  // Lock immediately to prevent concurrent entry
  status = 'querying'
  abortController = new AbortController()
  emitAgentState()

  const timeout = setTimeout(() => abortController?.abort(), 120_000)
  let convId: string | null = null

  try {
    const owner = db.getContacts().find((c) => c.isOwner)
    if (!owner) {
      console.log(`[bridge] Skipping "${label}" — no owner contact set`)
      return
    }

    let conversation = db.getActiveConversation()
    if (!conversation) {
      const newId = randomUUID()
      const cwd = getTypedConfig('currentCwd')
      const mode = getTypedConfig('permissionMode')
      db.createConversation(newId, cwd, mode)
      conversation = db.getActiveConversation()
      if (!conversation) throw new Error('Failed to create conversation')
    }

    convId = conversation.id
    activeConversationId = convId
    activeJid = owner.jid

    let mcpMessageSent = false
    setMcpMessageHandler((mcpContent: string, filePath?: string) => {
      safeSend(owner.jid, mcpContent, filePath).catch((e) => console.error('[bridge] MCP send failed:', e))
      addMessageAndEmit(convId!, 'outbound', filePath ? `${mcpContent}\n[File: ${filePath}]` : mcpContent)
      mcpMessageSent = true
    })

    const result = await runQuery({
      prompt,
      cwd: conversation.cwd,
      sdkSessionId: conversation.sdkSessionId,
      permissionMode: 'bypassPermissions',
      model: getTypedConfig('model'),
      maxTurns: 5,
      streaming: false,
      onMessage: () => {},
      onPermissionRequest: async () => ({ behavior: 'allow' as const, updatedInput: {} }),
      abortController
    })

    db.updateConversation(convId, {
      sdkSessionId: result.sdkSessionId,
      totalCostUsd: (conversation.totalCostUsd ?? 0) + result.costUsd
    })

    // Suppress "OK" responses (heartbeat or task with nothing to report)
    const content = result.content?.trim() ?? ''
    const isOk = /^(heartbeat.?ok|ok|nothing.to.report)$/i.test(content) || content === ''

    // Only send result.content if MCP sendMessage wasn't already used
    if (!mcpMessageSent && !isOk && content.length > 10) {
      await safeSend(owner.jid, content)
      addMessageAndEmit(convId, 'outbound', content)
    }

    const costStr = result.costUsd > 0 ? ` | $${result.costUsd.toFixed(4)}` : ''
    const durationStr = result.durationMs > 0 ? ` | ${Math.round(result.durationMs / 1000)}s` : ''
    addMessageAndEmit(convId, 'system', `${label}${costStr}${durationStr}${isOk ? ' | OK' : ''}`)
  } catch (err: unknown) {
    const error = err as Error
    if (error.name !== 'AbortError') {
      console.error(`[bridge] ${label} error:`, error.message)
    }
    if (convId) {
      try { addMessageAndEmit(convId, 'system', `${label} error: ${error.message}`) } catch { /* DB may be locked */ }
    }
  } finally {
    clearTimeout(timeout)
    status = 'idle'
    activeConversationId = null
    activeJid = null
    abortController = null
    pendingPermission = null
    setMcpMessageHandler(null)
    emitAgentState()
  }
}

// ─── Main Entry: Handle WhatsApp Message ────────────────────

export async function handleMessage(jid: string, content: string, pushName?: string): Promise<void> {
  // If waiting for permission, route to resolver
  if (status === 'waiting_permission' && pendingPermission && jid === activeJid) {
    resolvePermission(content)
    return
  }

  // If agent is busy, notify user
  if (status !== 'idle') {
    await safeSend(jid, 'Agent arbeitet... Bitte warten oder /stop zum Abbrechen.')
    return
  }

  // Lock immediately to prevent concurrent entry
  status = 'querying'
  abortController = new AbortController()
  activeJid = jid
  emitAgentState()

  let convId: string | null = null

  try {
    // Get or create conversation
    let conversation = db.getActiveConversation()
    if (!conversation) {
      const newId = randomUUID()
      const cwd = getTypedConfig('currentCwd')
      const mode = getTypedConfig('permissionMode')
      db.createConversation(newId, cwd, mode)
      conversation = db.getActiveConversation()
      if (!conversation) throw new Error('Failed to create conversation')
    }

    convId = conversation.id
    activeConversationId = convId

    // Resolve sender name: contact displayName > pushName > "Unbekannt"
    const contactName = db.resolveContactName(jid)
    const senderName = contactName || pushName || 'Unbekannt'

    // Save inbound message
    addMessageAndEmit(convId, 'inbound', content)

    // Set MCP message handler for sendMessage mode
    const streamToWhatsApp = getTypedConfig('streamToWhatsApp')
    let mcpMessageSent = false

    setMcpMessageHandler((mcpContent: string, filePath?: string) => {
      safeSend(jid, mcpContent, filePath).catch((e) => console.error('[bridge] MCP send failed:', e))
      addMessageAndEmit(convId!, 'outbound', filePath ? `${mcpContent}\n[File: ${filePath}]` : mcpContent)
      mcpMessageSent = true
    })

    const result = await runQuery({
      prompt: `[${senderName}] ${content}`,
      cwd: conversation.cwd,
      sdkSessionId: conversation.sdkSessionId,
      permissionMode: getTypedConfig('permissionMode'),
      model: getTypedConfig('model'),
      maxTurns: getTypedConfig('maxTurns'),
      streaming: streamToWhatsApp,
      onMessage: (text) => {
        safeSend(jid, text).catch((e) => console.error('[bridge] Stream send failed:', e))
        addMessageAndEmit(convId!, 'outbound', text)
      },
      onPermissionRequest: handlePermissionRequest,
      abortController
    })

    // Update conversation
    db.updateConversation(convId, {
      sdkSessionId: result.sdkSessionId,
      totalCostUsd: (conversation.totalCostUsd ?? 0) + result.costUsd
    })

    // In sendMessage mode, send final result only if substantial AND MCP didn't already send
    if (!streamToWhatsApp && !mcpMessageSent && result.content && result.content.length > 10) {
      await safeSend(jid, result.content)
      addMessageAndEmit(convId, 'outbound', result.content)
    }

    // Log cost
    const costStr = result.costUsd > 0 ? ` | $${result.costUsd.toFixed(4)}` : ''
    const durationStr = result.durationMs > 0 ? ` | ${Math.round(result.durationMs / 1000)}s` : ''
    addMessageAndEmit(convId, 'system', `Done${costStr}${durationStr}`)
  } catch (err: unknown) {
    const error = err as Error
    if (error.name === 'AbortError') {
      await safeSend(jid, 'Query abgebrochen.')
      if (convId) addMessageAndEmit(convId, 'system', 'Aborted')
    } else {
      console.error('[bridge] Query error:', error)
      await safeSend(jid, 'Ein Fehler ist aufgetreten. Details im Log.')
      if (convId) addMessageAndEmit(convId, 'system', `Error: ${error.message}`)
    }
  } finally {
    status = 'idle'
    activeConversationId = null
    activeJid = null
    abortController = null
    pendingPermission = null
    setMcpMessageHandler(null)
    emitAgentState()
  }
}

