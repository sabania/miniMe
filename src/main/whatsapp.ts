import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  Browsers,
  type WASocket,
  type WAMessage,
  type AnyMessageContent
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import { app } from 'electron'
import { join, extname } from 'path'
import { mkdirSync, existsSync, rmSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { sendToRenderer } from './ipc-util'
import { setTypedConfig } from './config'
import * as db from './db'
import { generateUserProfile, getMediaDir } from './workspace'
import type { WhatsAppState } from '../shared/types'

const MIN_SEND_INTERVAL_MS = 500
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_DELAY_MS = 300_000 // 5 minutes
const MAX_MEDIA_SIZE = 50 * 1024 * 1024 // 50 MB
const MAX_MESSAGE_LENGTH = 10_000

type MessageHandler = (jid: string, content: string, pushName?: string) => void

let sock: WASocket | null = null
let status: WhatsAppState['status'] = 'disconnected'
let ownJid: string | null = null
let ownLid: string | null = null
let qrCode: string | null = null
let stopped = false
let lastSendTime = 0
let reconnectAttempts = 0
let onMessage: MessageHandler | null = null
let onReconnectCallback: (() => void) | null = null

// Track sent message IDs to avoid processing own replies (id → timestamp)
const sentMessageIds = new Map<string, number>()
// Clean up old entries every 30 seconds instead of per-entry setTimeout
setInterval(() => {
  const cutoff = Date.now() - 60_000
  for (const [id, ts] of sentMessageIds) {
    if (ts < cutoff) sentMessageIds.delete(id)
  }
}, 30_000)
// Store last incoming message per JID for quoted replies (fixes self-chat corruption)
const lastIncomingMessages = new Map<string, WAMessage>()

export function setMessageHandler(handler: MessageHandler): void {
  onMessage = handler
}

export function setOnReconnect(callback: () => void): void {
  onReconnectCallback = callback
}

export function getWhatsAppState(): WhatsAppState {
  return { status, jid: ownJid, qrCode }
}

function emitState(): void {
  sendToRenderer('whatsapp:state', getWhatsAppState())
}

function normalizeJid(jid: string): string {
  // Remove device suffix: 49123:2@s.whatsapp.net → 49123@s.whatsapp.net
  return jid.replace(/:.*@/, '@')
}

function isAllowedSender(senderJid: string): boolean {
  const contacts = db.getContacts()
  if (contacts.length === 0) return false

  const normalized = normalizeJid(senderJid)
  const plain = normalized.replace(/@.*$/, '')

  return contacts.some((c) => {
    const cJid = c.jid.includes('@') ? c.jid : `${c.jid}@s.whatsapp.net`
    return normalizeJid(cJid) === normalized || c.jid === plain
  })
}

// ─── Media Helpers ──────────────────────────────────────────

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif',
    'video/mp4': '.mp4', 'audio/ogg; codecs=opus': '.ogg', 'audio/mpeg': '.mp3',
    'application/pdf': '.pdf'
  }
  return map[mime] ?? `.${mime.split('/')[1]?.split(';')[0] ?? 'bin'}`
}

const DOC_MIMETYPES: Record<string, string> = {
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.zip': 'application/zip', '.txt': 'text/plain', '.csv': 'text/csv'
}

function buildMediaContent(filePath: string, caption?: string): AnyMessageContent {
  const ext = extname(filePath).toLowerCase()
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  const videoExts = ['.mp4', '.mkv', '.avi']
  const audioExts = ['.ogg', '.mp3', '.m4a', '.wav']

  if (imageExts.includes(ext)) return { image: { url: filePath }, caption: caption || undefined }
  if (videoExts.includes(ext)) return { video: { url: filePath }, caption: caption || undefined }
  if (audioExts.includes(ext)) return { audio: { url: filePath }, mimetype: ext === '.ogg' ? 'audio/ogg; codecs=opus' : 'audio/mpeg' }
  const fileName = filePath.split(/[/\\]/).pop() ?? 'file'
  const mimetype = DOC_MIMETYPES[ext] ?? 'application/octet-stream'
  return { document: { url: filePath }, mimetype, fileName, caption: caption || undefined }
}

// ─── Connection ─────────────────────────────────────────────

export async function connect(): Promise<void> {
  if (sock && !stopped) return // Already connected/connecting

  stopped = false
  status = 'connecting'
  qrCode = null
  emitState()

  const authDir = join(app.getPath('userData'), 'whatsapp-auth')
  if (!existsSync(authDir)) mkdirSync(authDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    auth: state,
    version,
    logger: pino({ level: 'silent' }) as never,
    browser: Browsers.appropriate('Desktop'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    getMessage: async () => undefined
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update
    console.log('[WA] connection.update:', JSON.stringify({ connection, qr: qr ? '(qr data)' : undefined, error: lastDisconnect?.error?.message }))

    if (qr) {
      qrCode = qr
      emitState()
    }

    if (connection === 'open') {
      status = 'connected'
      qrCode = null
      reconnectAttempts = 0
      ownJid = sock?.user?.id ? normalizeJid(sock.user.id) : null
      ownLid = sock?.user?.lid ? normalizeJid(sock.user.lid) : null
      if (ownJid) {
        setTypedConfig('whatsappJid', ownJid)
        // Auto-create owner contact if none exists
        const contacts = db.getContacts()
        const hasOwner = contacts.some((c) => c.isOwner)
        if (!hasOwner) {
          const plain = ownJid.replace(/@.*$/, '')
          const existing = db.getContactByJid(plain) ?? db.getContactByJid(ownJid)
          if (existing) {
            db.updateContact(existing.jid, { isOwner: true })
          } else {
            db.addContact(plain, sock?.user?.name ?? '', undefined, true)
          }
          generateUserProfile()
          console.log('[WA] Auto-created owner contact')
        }
      }
      console.log('[WA] Connected as', ownJid)
      emitState()
      if (onReconnectCallback) onReconnectCallback()
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error
      const statusCode = (error as Boom)?.output?.statusCode
      const loggedOut = statusCode === DisconnectReason.loggedOut
      console.log('[WA] Connection closed — statusCode:', statusCode, 'loggedOut:', loggedOut, 'error:', error?.message)

      const oldSock = sock
      sock = null
      status = 'disconnected'
      ownJid = null
      ownLid = null
      qrCode = null
      emitState()

      // Clean up old socket
      try { oldSock?.end(undefined) } catch { /* already closed */ }

      if (loggedOut) {
        // Wipe credentials so next connect shows fresh QR
        const authDir = join(app.getPath('userData'), 'whatsapp-auth')
        try { rmSync(authDir, { recursive: true }) } catch { /* ok */ }
        console.log('[WA] Logged out — credentials wiped, must re-scan QR')
      } else if (!stopped) {
        const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS)
        reconnectAttempts++
        console.log(`[WA] Will reconnect in ${delay}ms (attempt ${reconnectAttempts})`)
        setTimeout(() => {
          if (!stopped) connect()
        }, delay)
      }
    }
  })

  sock.ev.on('creds.update', async () => {
    await saveCreds()
  })

  sock.ev.on('messages.upsert', async (upsert) => {
    for (const msg of upsert.messages) {
      if (!msg.message || msg.key.remoteJid === 'status@broadcast') continue

      // Skip messages we sent ourselves (prevents reply loops)
      if (msg.key.id && sentMessageIds.has(msg.key.id)) continue

      const remoteJid = msg.key.remoteJid!

      // Self-chat: allow messages from own JID or own LID
      const isSelfChat =
        msg.key.fromMe && (
          remoteJid === ownJid ||
          (ownLid != null && normalizeJid(remoteJid) === ownLid)
        )

      // Skip other fromMe messages (sent from other devices etc.)
      if (msg.key.fromMe && !isSelfChat) continue

      // Extract text content: text, button reply, or list reply
      const buttonReply = msg.message.buttonsResponseMessage?.selectedButtonId
      const listReply = msg.message.listResponseMessage?.singleSelectReply?.selectedRowId
      const textContent =
        buttonReply ??
        listReply ??
        msg.message.conversation ??
        msg.message.extendedTextMessage?.text ??
        null

      // Extract media if present
      const mediaMsg = (msg.message.imageMessage
        ?? msg.message.videoMessage
        ?? msg.message.audioMessage
        ?? msg.message.documentMessage) as
        { mimetype?: string; caption?: string; fileName?: string } | null

      // Skip if no text and no media
      if (!textContent && !mediaMsg) continue

      // Download media to tmp/media/
      let mediaPath: string | null = null
      if (mediaMsg && sock) {
        try {
          const buffer = await downloadMediaMessage(msg, 'buffer', {}) as Buffer
          if (buffer.length > MAX_MEDIA_SIZE) {
            console.warn(`[WA] Media too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB), skipping`)
          } else {
            const mime = mediaMsg.mimetype ?? 'application/octet-stream'
            const ext = mimeToExt(mime)
            const fileName = `${randomUUID()}${ext}`
            const mediaDir = getMediaDir()
            mediaPath = join(mediaDir, fileName)
            writeFileSync(mediaPath, buffer)
            console.log(`[WA] Media saved: ${mediaPath} (${mime}, ${buffer.length} bytes)`)
          }
        } catch (err) {
          console.error('[WA] Media download failed:', err)
        }
      }

      // Build final content: text + media path
      const caption = mediaMsg?.caption ?? null
      const text = textContent ?? caption
      let finalContent: string
      if (text && mediaPath) {
        finalContent = `${text}\n[Attached file: ${mediaPath}]`
      } else if (mediaPath) {
        finalContent = `[Attached file: ${mediaPath}]`
      } else if (text) {
        finalContent = text
      } else {
        continue
      }

      // Truncate overly long messages
      if (finalContent.length > MAX_MESSAGE_LENGTH) {
        finalContent = finalContent.slice(0, MAX_MESSAGE_LENGTH) + '\n[...truncated]'
      }

      // For self-chat, normalize to own JID
      const jid = isSelfChat ? ownJid ?? remoteJid : remoteJid

      // Check if sender is allowed (self-chat is always allowed)
      if (!isSelfChat && !isAllowedSender(jid)) continue

      // Store for quoted replies (cap size to prevent memory leak)
      if (lastIncomingMessages.size >= 50) {
        const oldest = lastIncomingMessages.keys().next().value
        if (oldest) lastIncomingMessages.delete(oldest)
      }
      lastIncomingMessages.set(jid, msg)

      if (onMessage) {
        onMessage(jid, finalContent, msg.pushName ?? undefined)
      }
    }
  })
}

export async function disconnect(): Promise<void> {
  stopped = true
  if (sock) {
    sock.end(undefined)
    sock = null
  }
  status = 'disconnected'
  ownJid = null
  ownLid = null
  qrCode = null
  emitState()
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sendMessage(jid: string, content: string, filePath?: string): Promise<void> {
  if (!sock || status !== 'connected') {
    throw new Error('WhatsApp not connected')
  }

  // Ensure full JID format (DB stores plain numbers like "41765042659")
  const fullJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`

  // Rate limiting
  const now = Date.now()
  const elapsed = now - lastSendTime
  if (elapsed < MIN_SEND_INTERVAL_MS) {
    await delay(MIN_SEND_INTERVAL_MS - elapsed)
  }

  const quoted = lastIncomingMessages.get(jid) ?? lastIncomingMessages.get(fullJid)
  const opts = quoted ? { quoted } : undefined

  let sent: WAMessage | undefined
  if (filePath && existsSync(filePath)) {
    const msgContent = buildMediaContent(filePath, content || undefined)
    sent = await sock.sendMessage(fullJid, msgContent, opts)
  } else {
    sent = await sock.sendMessage(fullJid, { text: content }, opts)
  }
  trackSentMessage(sent)

  lastSendTime = Date.now()
}

function trackSentMessage(msg: WAMessage | undefined): void {
  if (msg?.key?.id) {
    sentMessageIds.set(msg.key.id, Date.now())
  }
}

export function deleteCredentials(): void {
  const authDir = join(app.getPath('userData'), 'whatsapp-auth')
  try {
    rmSync(authDir, { recursive: true })
    console.log('[WA] Credentials deleted')
  } catch {
    /* ok — directory might not exist */
  }
}

export function isConnected(): boolean {
  return status === 'connected'
}

export function hasCredentials(): boolean {
  const authDir = join(app.getPath('userData'), 'whatsapp-auth')
  return existsSync(join(authDir, 'creds.json'))
}

export function getOwnJid(): string | null {
  return ownJid
}
