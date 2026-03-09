import { join } from 'path'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { getTypedConfig } from './config'
import { ensurePermissionsAtCwd } from './workspace'
import { createSchedulerMcpServer } from './mcp-scheduler'
import { platform } from './platform'

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

// ─── Claude Executable Path ─────────────────────────────────

let cachedClaudePath: string | null = null

function findClaudeExecutable(): string {
  if (cachedClaudePath) return cachedClaudePath

  const home = process.env.USERPROFILE ?? process.env.HOME ?? ''
  const candidates = platform.claudeExecutableCandidates(home)

  for (const p of candidates) {
    if (p && existsSync(p)) {
      cachedClaudePath = p
      console.log(`[agent] Found claude at: ${p}`)
      return p
    }
  }

  // Fallback: ask the system
  try {
    const result = execSync(platform.whichCommand('claude'), { encoding: 'utf-8', timeout: 5000 })
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
let cachedProvider: string | null = null

export function getCachedModels(): ModelOption[] | null {
  return cachedModels
}

export function clearModelCache(): void {
  cachedModels = null
  cachedProvider = null
}

async function fetchOllamaModels(): Promise<ModelOption[]> {
  const { net } = await import('electron')
  const url = getTypedConfig('ollamaUrl')
  try {
    const res = await net.fetch(`${url}/api/tags`)
    const data = (await res.json()) as { models: { name: string; size: number }[] }

    // Fetch context length per model via /api/show (parallel)
    const details = await Promise.all(data.models.map(async (m) => {
      try {
        const r = await net.fetch(`${url}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: m.name })
        })
        const info = (await r.json()) as { parameters?: string; model_info?: Record<string, unknown> }
        // Only use num_ctx from parameters (actual runtime value).
        // model_info.context_length is the architecture capability, not what Ollama uses.
        const ctxMatch = info.parameters?.match(/num_ctx\s+(\d+)/)
        return ctxMatch ? parseInt(ctxMatch[1]) : null
      } catch {
        return null
      }
    }))

    cachedModels = data.models.map((m, i) => {
      const ctx = details[i]
      const size = `${(m.size / 1e9).toFixed(1)}GB`
      const ctxStr = ctx
        ? ` · ${ctx >= 1024 ? `${Math.round(ctx / 1024)}K` : ctx} ctx`
        : ' · 2K default'
      return { value: m.name, label: m.name, description: `${size}${ctxStr}` }
    })
  } catch (err) {
    console.error('[agent] Failed to fetch Ollama models:', (err as Error).message)
    cachedModels = [{ value: 'error', label: 'Ollama not reachable', description: url }]
  }
  return cachedModels
}

export async function fetchModels(): Promise<ModelOption[]> {
  const provider = getTypedConfig('provider')
  if (cachedModels && cachedProvider !== provider) {
    cachedModels = null
  }
  if (cachedModels) return cachedModels
  cachedProvider = provider

  if (provider === 'ollama') return fetchOllamaModels()

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

  // Set Ollama base URL so SDK routes requests to local server
  const provider = getTypedConfig('provider')
  if (provider === 'ollama') {
    cleanEnv.ANTHROPIC_BASE_URL = getTypedConfig('ollamaUrl')
  }

  console.log(`[agent] runQuery | provider=${provider} model=${model} resume=${sdkSessionId ?? 'none'}`)

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

  // Disable thinking for Ollama — Ollama generates thinking blocks with empty
  // signatures that break resume (SDK validates signatures in message history).
  // The model still generates thinking (ignores the option), but on next resume
  // the SDK strips them from the history, avoiding signature validation errors.
  if (provider === 'ollama') {
    sdkOptions.thinking = { type: 'disabled' }
  }

  if (permissionMode === 'bypassPermissions') {
    sdkOptions.allowDangerouslySkipPermissions = true
  } else {
    // canUseTool is the LAST step in the SDK's permission evaluation:
    // Hooks → settings.json (deny → allow → ask) → Permission Mode → canUseTool
    // The SDK natively reads settings.json deny/allow rules BEFORE reaching here.
    // We only need canUseTool as a fallback to forward unresolved permission
    // requests to the user via WhatsApp.
    sdkOptions.canUseTool = async (
      toolName: string,
      toolInput: Record<string, unknown>
    ): Promise<PermissionDecision> => {
      console.log(`[agent] canUseTool: ${toolName}`, JSON.stringify(toolInput).slice(0, 200))
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
      // Capture session_id from the first event (init) — available before result.
      // Critical: if the query is aborted, the result event never fires,
      // but we still need the session_id for resume.
      const evSessionId = (event as Record<string, unknown>).session_id as string | undefined
      if (evSessionId && !resultSessionId) {
        resultSessionId = evSessionId
      }

      // Log all event types for debugging
      const evType = (event as Record<string, unknown>).type as string
      if (evType !== 'assistant') {
        console.log(`[agent] event: ${evType}`, evType === 'result'
          ? `session_id=${(event as Record<string, unknown>).session_id}`
          : (evSessionId && evType === 'system' ? `session_id=${evSessionId}` : ''))
      }

      if (event.type === 'assistant') {
        const msg = event.message as
          | { content?: Array<{ type: string; text?: string; thinking?: string }> }
          | undefined
        // Log assistant message block types
        const blockTypes = msg?.content?.map((b) => b.type) ?? []
        console.log(`[agent] assistant blocks: [${blockTypes.join(', ')}]`)

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
          num_turns?: number
        }
        resultContent = result.result ?? ''
        costUsd = result.total_cost_usd ?? 0
        if (result.session_id) resultSessionId = result.session_id
        console.log(`[agent] result: session=${resultSessionId} cost=${costUsd} turns=${result.num_turns ?? '?'}`)
      }
    }
  }

  try {
    await executeQuery(sdkOptions)
  } catch (err: unknown) {
    const error = err as Error & { code?: number }
    // Abort: return partial result with session_id captured from init event
    if (error.name === 'AbortError' || abortController.signal.aborted) {
      console.log(`[agent] Aborted — returning partial result with session=${resultSessionId}`)
      return {
        content: resultContent,
        costUsd,
        sdkSessionId: resultSessionId,
        durationMs: Date.now() - startTime
      }
    }
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
