import { useEffect, useRef, useState, useCallback } from 'react'
import { formatDate, shortenPath } from '../lib/helpers'
import type { Conversation, Message, AgentState, PermissionRequest } from '../../../shared/types'

function formatDuration(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso).getTime()
  const end = endIso ? new Date(endIso).getTime() : Date.now()
  const diffMs = Math.max(0, end - start)
  const mins = Math.floor(diffMs / 60_000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ${hrs % 24}h`
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  if (mins > 0) return `${mins}m`
  return '<1m'
}

function formatCost(usd: number): string {
  if (usd === 0) return ''
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000)
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const mins = Math.floor(diffSec / 60)
  return `${mins}m ago`
}

interface AskUserQuestion {
  question?: string
  options?: Array<{ label?: string; description?: string }>
}

function PermissionBanner({
  permission,
  onRespond
}: {
  permission: PermissionRequest
  onRespond: (decision: 'allow' | 'deny', answer?: string) => void
}): React.JSX.Element {
  const [timeAgo, setTimeAgo] = useState(formatTimeAgo(permission.timestamp))
  const [customText, setCustomText] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(permission.timestamp))
    }, 1000)
    return () => clearInterval(interval)
  }, [permission.timestamp])

  const isQuestion = permission.toolName === 'AskUserQuestion'
  const questions = isQuestion
    ? (permission.toolInput.questions as AskUserQuestion[] | undefined)
    : undefined
  const q = questions?.[0]
  const questionText = q?.question ?? 'Agent has a question'
  const options = q?.options ?? []

  if (isQuestion) {
    return (
      <div className="px-4 py-3 border-b border-blue-500/30 bg-gradient-to-r from-blue-950/20 to-blue-950/5 space-y-2.5" role="alert">
        <div className="flex items-center gap-2">
          <div className="relative flex-shrink-0">
            <div className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
            <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping opacity-30" />
          </div>
          <span className="text-sm font-medium text-blue-300">Agent Question</span>
          <span className="ml-auto text-[10px] text-blue-400/40">{timeAgo}</span>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">{questionText}</p>
        {options.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onRespond('allow', opt.label ?? `Option ${i + 1}`)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-blue-600 border border-zinc-700/60 hover:border-blue-500/50 rounded-md text-xs font-medium transition-all duration-200 text-left"
                title={opt.description}
              >
                <span className="text-zinc-200">{opt.label ?? `Option ${i + 1}`}</span>
                {opt.description && (
                  <span className="block text-[10px] text-zinc-500 mt-0.5 max-w-[200px] truncate">{opt.description}</span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customText.trim()) {
                onRespond('allow', customText.trim())
              }
            }}
            placeholder="Or type a custom answer..."
            className="flex-1 px-3 py-1.5 bg-zinc-900/80 border border-zinc-700/60 rounded-md text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500/50"
          />
          <button
            type="button"
            onClick={() => { if (customText.trim()) onRespond('allow', customText.trim()) }}
            disabled={!customText.trim()}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-md text-xs font-medium transition-all duration-200"
          >
            Send
          </button>
        </div>
      </div>
    )
  }

  // Regular tool permission — Allow / Deny
  const inputStr = JSON.stringify(permission.toolInput, null, 2)
  const truncated = inputStr.length > 300 ? inputStr.slice(0, 297) + '...' : inputStr

  return (
    <div className="px-4 py-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-950/20 to-orange-950/5 space-y-2.5" role="alert">
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
          <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-orange-500 animate-ping opacity-30" />
        </div>
        <span className="text-sm font-medium text-orange-300">Permission Required</span>
        <span className="text-[10px] text-orange-400/50 font-mono ml-1">{permission.toolName}</span>
        <span className="ml-auto text-[10px] text-orange-400/40">{timeAgo}</span>
      </div>
      <pre className="text-xs text-zinc-400 bg-zinc-900/90 rounded-md p-2.5 overflow-x-auto max-h-32 border border-zinc-800/60 font-mono">{truncated}</pre>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onRespond('allow')}
          className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded-md text-xs font-medium transition-all duration-200 hover:shadow-sm hover:shadow-green-500/20"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Allow
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRespond('deny')}
          className="px-4 py-1.5 bg-zinc-700/80 hover:bg-red-600 rounded-md text-xs font-medium transition-all duration-200"
        >
          <span className="inline-flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Deny
          </span>
        </button>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: Message }): React.JSX.Element {
  if (msg.direction === 'system') {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <div className="flex-1 h-px bg-zinc-800/60" />
        <span className="text-[10px] text-zinc-500 whitespace-nowrap flex-shrink-0">
          {msg.content}
        </span>
        <div className="flex-1 h-px bg-zinc-800/60" />
      </div>
    )
  }

  const isInbound = msg.direction === 'inbound'
  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[75%] rounded-xl px-3.5 py-2 text-sm ${
          isInbound
            ? 'bg-zinc-800/70 text-zinc-200 border border-zinc-700/40 rounded-tl-sm'
            : 'bg-blue-600/15 text-blue-100 border border-blue-500/20 rounded-tr-sm'
        }`}
      >
        <p className="whitespace-pre-wrap break-words select-text leading-relaxed">{msg.content}</p>
        <div className={`flex items-center gap-1.5 mt-1 ${isInbound ? 'text-zinc-500' : 'text-blue-400/40'}`}>
          <span className="text-[10px]">{formatDate(msg.createdAt)}</span>
          {!isInbound && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-400/30">
              <path d="M5 12l5 5L20 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  )
}

export function SessionDetail({
  conversation,
  messages,
  agentState,
  onResume,
  onStop,
  onOpenTerminal,
  onOpenVSCode,
  onOpenWorkspace,
  onPermissionRespond
}: {
  conversation: Conversation
  messages: Message[]
  agentState: AgentState
  onResume: () => void
  onStop: () => void
  onOpenTerminal: () => void
  onOpenVSCode: () => void
  onOpenWorkspace: () => void
  onPermissionRespond: (decision: 'allow' | 'deny', answer?: string) => void
}): React.JSX.Element {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showNewMessages, setShowNewMessages] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const isActive = conversation.status === 'active'
  const isWorking = agentState.activeConversationId === conversation.id && agentState.status !== 'idle'
  // Show permission banner regardless of which conversation is selected — there's only one agent
  const pendingPermission = agentState.pendingPermission

  const duration = formatDuration(conversation.createdAt, conversation.closedAt)
  const costStr = formatCost(conversation.totalCostUsd)
  const highCost = conversation.totalCostUsd >= 1

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const threshold = 80
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setIsAtBottom(atBottom)
    if (atBottom) setShowNewMessages(false)
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowNewMessages(false)
  }, [])

  // Auto-scroll on new messages if already at bottom; show pill otherwise
  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else {
      setShowNewMessages(true)
    }
  }, [messages, isAtBottom])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Session banner */}
      <div className={`px-4 py-2.5 border-b text-sm ${
        isActive
          ? 'border-green-900/30 bg-green-950/10'
          : 'border-zinc-800/60 bg-zinc-900/30'
      }`}>
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div className="relative flex-shrink-0">
            <div className={`h-2.5 w-2.5 rounded-full ${
              isWorking
                ? 'bg-yellow-400 shadow-sm shadow-yellow-400/40'
                : isActive
                  ? 'bg-green-500 shadow-sm shadow-green-500/30'
                  : 'bg-zinc-600'
            }`} />
            {isWorking && (
              <div className="absolute inset-0 h-2.5 w-2.5 rounded-full bg-yellow-400 animate-ping opacity-40" />
            )}
          </div>

          {/* Session label + metadata */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-zinc-300 text-sm font-medium whitespace-nowrap">
              {isWorking ? 'Working' : isActive ? 'Active Session' : 'Closed Session'}
            </span>
            <span className="text-zinc-600 text-[10px]">|</span>
            <span className="text-zinc-500 text-xs whitespace-nowrap">{formatDate(conversation.createdAt)}</span>
            <span className="text-zinc-600 text-[10px]">|</span>
            <span className={`text-xs whitespace-nowrap ${isActive ? 'text-green-400/60' : 'text-zinc-500'}`}>{duration}</span>
            {costStr && (
              <>
                <span className="text-zinc-600 text-[10px]">|</span>
                <span className={`text-xs whitespace-nowrap ${highCost ? 'text-orange-400 font-medium' : 'text-zinc-500'}`}>
                  {costStr}
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="ml-auto flex items-center gap-1">
            {/* Tool buttons group */}
            <div className="flex items-center border border-zinc-700/40 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={onOpenTerminal}
                className="px-2 py-1 bg-zinc-800/60 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-200 border-r border-zinc-700/40"
                title={`Open terminal: ${conversation.cwd}${conversation.sdkSessionId ? ' (with Claude resume)' : ''}`}
              >
                <span className="inline-flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 17 10 11 4 5" />
                    <line x1="12" y1="19" x2="20" y2="19" />
                  </svg>
                  <span>Terminal</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenVSCode}
                className="px-2 py-1 bg-zinc-800/60 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-200 border-r border-zinc-700/40"
                title={`Open VS Code: ${conversation.cwd}`}
              >
                <span className="inline-flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </svg>
                  <span>Code</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenWorkspace}
                className="px-2 py-1 bg-zinc-800/60 hover:bg-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-200"
                title="Open workspace in file explorer"
              >
                <span className="inline-flex items-center gap-1">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Files</span>
                </span>
              </button>
            </div>

            {/* Session control buttons */}
            {!isActive && (
              <button
                type="button"
                onClick={onResume}
                className="ml-1 px-3 py-1 bg-green-600 hover:bg-green-500 rounded-md text-xs font-medium transition-all duration-200 hover:shadow-sm hover:shadow-green-500/20"
              >
                Resume
              </button>
            )}
            {isWorking && (
              <button
                type="button"
                onClick={onStop}
                className="ml-1 px-3 py-1 bg-red-600/90 hover:bg-red-600 rounded-md text-xs font-medium transition-all duration-200"
              >
                Stop
              </button>
            )}
          </div>
        </div>
        {/* Path info */}
        <div className="flex items-center gap-1.5 mt-1.5 ml-[18px]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-600 flex-shrink-0" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-[10px] text-zinc-600 font-mono truncate" title={conversation.cwd}>
            {shortenPath(conversation.cwd)}
          </span>
          {conversation.sdkSessionId && (
            <>
              <span className="text-zinc-700 text-[10px]">|</span>
              <span className="text-[10px] text-zinc-600" title={conversation.sdkSessionId}>
                session: {conversation.sdkSessionId.slice(0, 8)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Permission request banner */}
      {pendingPermission && (
        <PermissionBanner permission={pendingPermission} onRespond={onPermissionRespond} />
      )}

      {/* Messages area wrapper (relative for pill positioning) */}
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto p-4 space-y-2.5"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 h-full">
              <div className="p-2.5 rounded-lg bg-zinc-800/20 border border-zinc-800/40">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className="text-zinc-600 text-sm">No messages yet</span>
              <span className="text-zinc-700 text-xs">Messages will appear here when the session starts</span>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* New messages pill */}
        {showNewMessages && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
            <button
              type="button"
              onClick={scrollToBottom}
              className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 rounded-full text-xs font-medium text-white shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center gap-1.5 backdrop-blur-sm"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
              New messages
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
