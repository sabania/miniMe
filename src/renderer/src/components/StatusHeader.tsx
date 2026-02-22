import { shortenPath } from '../lib/helpers'
import type { WhatsAppState, AgentState } from '../../../shared/types'

export function StatusHeader({
  waState,
  agentState,
  cwd
}: {
  waState: WhatsAppState
  agentState: AgentState
  cwd: string
}): React.JSX.Element {
  const waConnected = waState.status === 'connected'
  const waConnecting = waState.status === 'connecting'

  const agentWorking = agentState.status === 'working'
  const agentPermission = agentState.status === 'waiting_permission'
  const agentBusy = agentWorking || agentPermission

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-zinc-800/60 bg-zinc-900/50 text-[11px]">
      {/* WhatsApp status */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
        waConnected
          ? 'bg-green-950/30 border-green-800/40 text-green-400'
          : waConnecting
            ? 'bg-yellow-950/30 border-yellow-800/40 text-yellow-400'
            : 'bg-zinc-800/60 border-zinc-700/30 text-zinc-500'
      }`}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2z" />
        </svg>
        <span>{waConnected ? 'Connected' : waConnecting ? 'Connecting' : 'Offline'}</span>
      </div>

      {/* Agent status */}
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
        agentWorking
          ? 'bg-blue-950/30 border-blue-800/40 text-blue-400'
          : agentPermission
            ? 'bg-orange-950/30 border-orange-800/40 text-orange-400'
            : 'bg-zinc-800/60 border-zinc-700/30 text-zinc-500'
      }`}>
        {agentBusy ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`flex-shrink-0 ${agentWorking ? 'animate-spin' : 'animate-pulse'}`}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <div className="h-1.5 w-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
        )}
        <span>
          {agentWorking ? 'Working' : agentPermission ? 'Awaiting Permission' : 'Idle'}
        </span>
      </div>

      {/* CWD */}
      {cwd && (
        <span className="ml-auto text-zinc-600 font-mono truncate max-w-xs text-[10px]" title={cwd}>
          {shortenPath(cwd)}
        </span>
      )}
    </div>
  )
}
