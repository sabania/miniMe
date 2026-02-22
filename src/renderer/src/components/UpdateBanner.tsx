import { useState, useEffect } from 'react'
import type { UpdateStatus } from '../../../shared/types'

export function UpdateBanner(): React.JSX.Element | null {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    window.api.getUpdateStatus().then(setStatus)
    return window.api.onUpdateStatus((s) => {
      setStatus(s)
      // Reset dismiss when state changes to a new actionable state
      if (s.state === 'available' || s.state === 'downloaded') {
        setDismissed(false)
      }
    })
  }, [])

  if (dismissed) return null

  if (status.state === 'checking') {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800/40 text-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-500 shrink-0 animate-spin">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span className="text-zinc-400">Checking for updates...</span>
      </div>
    )
  }

  if (status.state === 'available') {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-950/40 border-b border-blue-800/30 text-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 shrink-0">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span className="text-blue-300">
          Version <strong>{status.info.version}</strong> verfuegbar
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.api.downloadUpdate()}
            className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-600/30 text-blue-300 border border-blue-500/30 hover:bg-blue-600/50 transition-colors"
          >
            Download
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  if (status.state === 'downloading') {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-blue-950/40 border-b border-blue-800/30 text-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-blue-400 shrink-0 animate-spin">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        <span className="text-blue-300">Downloading... {status.percent}%</span>
        <div className="flex-1 max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden ml-2">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${status.percent}%` }}
          />
        </div>
      </div>
    )
  }

  if (status.state === 'downloaded') {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-green-950/40 border-b border-green-800/30 text-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="text-green-300">
          Update <strong>{status.info.version}</strong> bereit
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.api.installUpdate()}
            className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-green-600/30 text-green-300 border border-green-500/30 hover:bg-green-600/50 transition-colors"
          >
            Restart & Update
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-zinc-600 hover:text-zinc-400 transition-colors text-[11px]"
          >
            Later
          </button>
        </div>
      </div>
    )
  }

  if (status.state === 'error') {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-red-950/40 border-b border-red-800/30 text-xs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <span className="text-red-300 truncate">{status.message}</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="ml-auto text-zinc-600 hover:text-zinc-400 transition-colors"
          title="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    )
  }

  return null
}
