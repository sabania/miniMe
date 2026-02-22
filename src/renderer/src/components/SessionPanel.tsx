import { useState } from 'react'
import { formatDate } from '../lib/helpers'
import type { Conversation, AgentState } from '../../../shared/types'

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

function SessionItem({
  conv,
  isSelected,
  isWorking,
  confirmDelete,
  onSelect,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel
}: {
  conv: Conversation
  isSelected: boolean
  isWorking: boolean
  confirmDelete: boolean
  onSelect: () => void
  onDeleteClick: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}): React.JSX.Element {
  const isActive = conv.status === 'active'
  const duration = formatDuration(conv.createdAt, conv.closedAt)
  const costStr = formatCost(conv.totalCostUsd)
  const highCost = conv.totalCostUsd >= 1

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Session from ${conv.createdAt}, ${conv.messageCount} messages, duration ${duration}`}
      className={`w-full text-left rounded-lg p-2.5 cursor-pointer transition-all duration-200 group relative ${
        confirmDelete
          ? 'bg-red-950/30 border border-red-800/40 ring-1 ring-red-900/30'
          : isSelected
            ? 'bg-zinc-800/90 border border-blue-500/30 shadow-sm shadow-blue-500/5'
            : isActive
              ? 'bg-zinc-900/60 border border-green-900/30 hover:border-green-700/40 hover:bg-zinc-800/60'
              : 'border border-transparent hover:bg-zinc-800/50 hover:border-zinc-700/30'
      }`}
    >
      {/* Top row: status + date + delete */}
      <div className="flex items-center gap-2">
        {/* Status indicator */}
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

        <span className="text-xs text-zinc-400 truncate">{formatDate(conv.createdAt)}</span>

        {/* Duration pill */}
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          isActive ? 'text-green-400/70 bg-green-500/5' : 'text-zinc-500 bg-zinc-800/40'
        }`}>
          {duration}
        </span>

        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteClick() }}
          className="ml-auto text-zinc-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 p-0.5 rounded hover:bg-red-500/10"
          aria-label="Delete session"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Bottom row: message count + cost */}
      <div className="flex items-center gap-2 mt-1.5 pl-[18px]">
        <span className="text-[10px] text-zinc-500">{conv.messageCount} msg</span>
        {costStr && (
          <span className={`text-[10px] ${highCost ? 'text-orange-400/80 font-medium' : 'text-zinc-600'}`}>
            {costStr}
          </span>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="mt-2 pt-2 border-t border-red-800/30" onClick={(e) => e.stopPropagation()}>
          <p className="text-[10px] text-red-300/70 mb-1.5">Delete this session and all messages?</p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onDeleteConfirm}
              className="flex-1 px-2 py-1 bg-red-600/80 hover:bg-red-600 rounded-md text-xs font-medium transition-colors"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={onDeleteCancel}
              className="flex-1 px-2 py-1 bg-zinc-700/60 hover:bg-zinc-700 rounded-md text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </button>
  )
}

export function SessionPanel({
  conversations,
  selectedId,
  agentState,
  onSelect,
  onNewSession,
  onDelete
}: {
  conversations: Conversation[]
  selectedId: string | null
  agentState: AgentState
  onSelect: (id: string) => void
  onNewSession: () => void
  onDelete: (id: string) => void
}): React.JSX.Element {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const active = conversations.filter((c) => c.status === 'active')
  const closed = conversations.filter((c) => c.status === 'closed')

  return (
    <div className="w-64 flex-shrink-0 flex flex-col border-r border-zinc-800/80 bg-zinc-950">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sessions</span>
        <button
          type="button"
          onClick={onNewSession}
          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-medium transition-colors duration-200 hover:shadow-sm hover:shadow-blue-500/20"
        >
          + New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {/* Empty state */}
        {conversations.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center px-4">
            <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-zinc-500 text-xs font-medium">No sessions yet</p>
              <p className="text-zinc-600 text-[10px] leading-relaxed">
                Click &quot;+ New&quot; to start your first agent session
              </p>
            </div>
          </div>
        )}

        {/* Active sessions */}
        {active.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1.5 pt-2 pb-1.5">
              <div className="h-1 w-1 rounded-full bg-green-500" />
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Active
              </p>
              <span className="text-[10px] text-zinc-600">{active.length}</span>
            </div>
            {active.map((conv) => (
              <SessionItem
                key={conv.id}
                conv={conv}
                isSelected={selectedId === conv.id}
                isWorking={agentState.activeConversationId === conv.id}
                confirmDelete={confirmDeleteId === conv.id}
                onSelect={() => onSelect(conv.id)}
                onDeleteClick={() => setConfirmDeleteId(conv.id)}
                onDeleteConfirm={() => { onDelete(conv.id); setConfirmDeleteId(null) }}
                onDeleteCancel={() => setConfirmDeleteId(null)}
              />
            ))}
          </>
        )}

        {/* Divider between sections */}
        {active.length > 0 && closed.length > 0 && (
          <div className="border-t border-zinc-800/50 mx-1 my-1" />
        )}

        {/* Closed sessions */}
        {closed.length > 0 && (
          <>
            <div className="flex items-center gap-2 px-1.5 pt-2 pb-1.5">
              <div className="h-1 w-1 rounded-full bg-zinc-600" />
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Recent
              </p>
              <span className="text-[10px] text-zinc-600">{closed.length}</span>
            </div>
            {closed.map((conv) => (
              <SessionItem
                key={conv.id}
                conv={conv}
                isSelected={selectedId === conv.id}
                isWorking={false}
                confirmDelete={confirmDeleteId === conv.id}
                onSelect={() => onSelect(conv.id)}
                onDeleteClick={() => setConfirmDeleteId(conv.id)}
                onDeleteConfirm={() => { onDelete(conv.id); setConfirmDeleteId(null) }}
                onDeleteCancel={() => setConfirmDeleteId(null)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
