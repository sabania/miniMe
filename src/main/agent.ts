import { join } from 'path'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { ensurePermissionsAtCwd } from './workspace'
import { createSchedulerMcpServer } from './mcp-scheduler'

// ─── Types ──────────────────────────────────────────────────

export interface AgentRunOptions {
  prompt: string
  cwd: string
  sdkSessionId?: string | null
  permissionMode: string
  model: string
  maxTurns: number
  streaming: boolean
  onMessage: (content: string) => void
  onPermissionRequest: (info: PermissionRequestInfo) => Promise<PermissionDecision>
  abortController: AbortController
}

export interface PermissionRequestInfo {
  toolName: string
  toolInput: Record<string, unknown>
}

export interface PermissionDecision {
  behavior: 'allow' | 'deny'
  updatedInput?: Record<string, unknown>
  message?: string
}

export interface AgentRunResult {
  content: string
  costUsd: number
  sdkSessionId: string
  durationMs: number
}

// ─── MCP sendMessage (in-process) ───────────────────────────

let onMcpMessage: ((content: string, filePath?: string) => void) | null = null

export function setMcpMessageHandler(handler: ((content: string, filePath?: string) => void) | null): void {
  onMcpMessage = handler
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createSendMessageMcpServer(): Promise<any> {
  const { createSdkMcpServer, tool } = await import('@anthropic-ai/claude-agent-sdk')
  const { z } = await import('zod')
  const { isAbsolute } = await import('path')

  return createSdkMcpServer({
    name: 'send-message',
    version: '1.0.0',
    tools: [
      tool(
        'sendMessage',
        'Send a message to the user via WhatsApp. Use this to provide status updates, results, or any communication during your work.',
        {
          content: z.string().describe('The message content to send to the user (becomes caption when sending a file)'),
          filePath: z.string().optional().describe('Optional: absolute path to a file to send as media attachment (image, video, audio, document)')
        },
        async (args) => {
          if (args.filePath && (args.filePath.includes('\0') || !isAbsolute(args.filePath))) {
            return { content: [{ type: 'text' as const, text: 'Invalid filePath — must be absolute, no null bytes' }], isError: true }
          }
          if (onMcpMessage) {
            console.log(`[agent] MCP sendMessage: "${args.content.slice(0, 80)}"${args.filePath ? ` [file: ${args.filePath}]` : ''}`)
            onMcpMessage(args.content, args.filePath)
          }
          return { content: [{ type: 'text' as const, text: 'Message sent.' }] }
        }
      )
    ]
  })
}

// ─── Load Allowed Tools from settings.json ───────────────────
// NOTE: The SDK does NOT check settings.json when canUseTool is provided.
// canUseTool overrides ALL permission evaluation, so we must check manually.

function loadAllowedTools(cwd: string): Set<string> {
  const paths = [
    join(cwd, '.claude', 'settings.json'),
    join(cwd, '.claude', 'settings.local.json')
  ]
  const tools = new Set<string>()
  for (const p of paths) {
    try {
      if (!existsSync(p)) continue
      const data = JSON.parse(readFileSync(p, 'utf-8'))
      const allow = data?.permissions?.allow
      if (Array.isArray(allow)) {
        for (const t of allow) if (typeof t === 'string') tools.add(t)
      }
    } catch { /* ignore parse errors */ }
  }
  return tools
}

// ─── Claude Executable Path ─────────────────────────────────

let cachedClaudePath: string | null = null

function findClaudeExecutable(): string {
  if (cachedClaudePath) return cachedClaudePath

  const home = process.env.USERPROFILE ?? process.env.HOME ?? ''

  // Common locations
  const candidates =
    process.platform === 'win32'
      ? [
          join(home, '.local', 'bin', 'claude.exe'),
          join(process.env.APPDATA ?? '', 'npm', 'claude.cmd'),
          join(process.env.APPDATA ?? '', 'npm', 'claude')
        ]
      : [
          join(home, '.local', 'bin', 'claude'),
          '/usr/local/bin/claude',
          '/usr/bin/claude'
        ]

  for (const p of candidates) {
    if (p && existsSync(p)) {
      cachedClaudePath = p
      console.log(`[agent] Found claude at: ${p}`)
      return p
    }
  }

  // Fallback: ask the system
  try {
    const cmd = process.platform === 'win32' ? 'where.exe claude' : 'which claude'
    const result = execSync(cmd, { encoding: 'utf-8', timeout: 5000 })
      .trim()
      .split('\n')[0]
      .trim()
    if (result && existsSync(result)) {
      cachedClaudePath = result
      console.log(`[agent] Found claude via PATH: ${result}`)
      return result
    }
  } catch {
    /* not found in PATH */
  }

  throw new Error(
    'Claude Code executable not found. Install with: npm install -g @anthropic-ai/claude-code'
  )
}

// ─── Dynamic SDK Import (ESM-only package) ──────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queryFn: ((params: { prompt: string; options?: any }) => any) | null = null

async function getQueryFn(): Promise<typeof queryFn> {
  if (queryFn) return queryFn
  const sdk = await import('@anthropic-ai/claude-agent-sdk')
  queryFn = sdk.query
  return queryFn
}

// ─── Model Cache ─────────────────────────────────────────────

import type { ModelOption } from '../shared/models'

let cachedModels: ModelOption[] | null = null

export function getCachedModels(): ModelOption[] | null {
  return cachedModels
}

export async function fetchModels(): Promise<ModelOption[]> {
  if (cachedModels) return cachedModels

  const sdkQuery = await getQueryFn()
  const claudePath = findClaudeExecutable()
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE

  // Use OS temp dir so no session files pollute the workspace
  const { tmpdir } = await import('os')
  const cwd = tmpdir()

  try {
    const abort = new AbortController()
    const stream = sdkQuery!({
      prompt: 'hi',
      options: {
        cwd,
        maxTurns: 1,
        abortController: abort,
        pathToClaudeCodeExecutable: claudePath,
        env: cleanEnv,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true
      }
    })

    if (typeof stream.supportedModels === 'function') {
      const models = await stream.supportedModels()
      cachedModels = models.map((m: { value: string; displayName: string; description: string }) => ({
        value: m.value,
        label: m.displayName,
        description: m.description
      }))
      console.log(`[agent] Fetched ${cachedModels.length} models from SDK:`, cachedModels.map(m => m.value))
    }

    // Abort immediately — we only needed the model list
    abort.abort()
  } catch (err) {
    console.error('[agent] Failed to fetch models:', (err as Error).message)
  }

  return cachedModels ?? []
}

// ─── Run Query ──────────────────────────────────────────────

export async function runQuery(options: AgentRunOptions): Promise<AgentRunResult> {
  const {
    prompt,
    cwd,
    sdkSessionId,
    permissionMode,
    model,
    maxTurns,
    streaming,
    onMessage,
    onPermissionRequest,
    abortController
  } = options

  const claudePath = findClaudeExecutable()
  const sdkQuery = await getQueryFn()
  const [sendMessageServer, schedulerServer] = await Promise.all([
    createSendMessageMcpServer(),
    createSchedulerMcpServer()
  ])

  // Strip CLAUDECODE env var to allow nested launch
  const cleanEnv = { ...process.env }
  delete cleanEnv.CLAUDECODE

  const sdkOptions: Record<string, unknown> = {
    cwd,
    abortController,
    model,
    maxTurns,
    permissionMode,
    pathToClaudeCodeExecutable: claudePath,
    env: cleanEnv,
    settingSources: ['user', 'project', 'local'],
    mcpServers: {
      'send-message': sendMessageServer,
      scheduler: schedulerServer
    }
  }

  if (permissionMode === 'bypassPermissions') {
    sdkOptions.allowDangerouslySkipPermissions = true
  } else {
    // NOTE: canUseTool overrides ALL SDK permission evaluation.
    // We must check settings.json allowlist manually here.
    const allowSet = loadAllowedTools(cwd)
    sdkOptions.canUseTool = async (
      toolName: string,
      toolInput: Record<string, unknown>
    ): Promise<PermissionDecision> => {
      if (allowSet.has(toolName)) return { behavior: 'allow' }
      for (const pattern of allowSet) {
        if (pattern.endsWith('*') && toolName.startsWith(pattern.slice(0, -1))) {
          return { behavior: 'allow' }
        }
      }
      return onPermissionRequest({ toolName, toolInput })
    }
  }

  if (sdkSessionId) {
    sdkOptions.resume = sdkSessionId
  }

  // Ensure default permissions exist at the CWD (handles /project switches)
  ensurePermissionsAtCwd(cwd)

  const startTime = Date.now()
  let resultContent = ''
  let costUsd = 0
  let resultSessionId = ''

  async function executeQuery(opts: Record<string, unknown>): Promise<void> {
    const stream = sdkQuery!({ prompt, options: opts })

    for await (const event of stream) {
      if (event.type === 'assistant') {
        const msg = event.message as
          | { content?: Array<{ type: string; text?: string }> }
          | undefined
        const text = msg?.content
          ?.filter((block) => block.type === 'text')
          ?.map((block) => block.text ?? '')
          ?.join('\n')

        if (text && streaming) {
          onMessage(text)
        }
      } else if (event.type === 'result') {
        const result = event as {
          result?: string
          total_cost_usd?: number
          session_id?: string
        }
        resultContent = result.result ?? ''
        costUsd = result.total_cost_usd ?? 0
        resultSessionId = result.session_id ?? ''
      }
    }
  }

  try {
    await executeQuery(sdkOptions)
  } catch (err: unknown) {
    const error = err as Error & { code?: number }
    // Graceful fallback: if resume fails, retry without resume
    if (sdkSessionId && error.message?.includes('exited with code 1')) {
      console.log('[agent] Resume failed, retrying without resume')
      delete sdkOptions.resume
      await executeQuery(sdkOptions)
    } else {
      throw err
    }
  }

  return {
    content: resultContent,
    costUsd,
    sdkSessionId: resultSessionId,
    durationMs: Date.now() - startTime
  }
}
