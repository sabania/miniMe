import { useState, useEffect } from 'react'
import type { ConfigMap } from '../../../shared/types'
import type { ModelOption } from '../../../shared/models'
import { Row, PillGroup, Pill, Toggle } from '../components/ui'

export function SettingsPage(): React.JSX.Element {
  const [permissionMode, setPermissionMode] = useState<ConfigMap['permissionMode']>('default')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<ModelOption[]>([])
  const [streamToWhatsApp, setStreamToWhatsApp] = useState(false)
  const [waAutoConnect, setWaAutoConnect] = useState(true)
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [startWithSystem, setStartWithSystem] = useState(false)
  const [useGit, setUseGit] = useState(true)
  const [gitAvailable, setGitAvailable] = useState(true)
  const [workspacePath, setWorkspacePath] = useState('')
  const [copied, setCopied] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const [updateChecking, setUpdateChecking] = useState(false)

  useEffect(() => {
    window.api.getConfig('permissionMode').then((m) => setPermissionMode(m as ConfigMap['permissionMode']))
    window.api.getConfig('model').then((m) => setModel(m as string))
    window.api.getModels().then(setModels)
    window.api.getConfig('streamToWhatsApp').then((v) => setStreamToWhatsApp(v as boolean))
    window.api.getConfig('whatsappAutoConnect').then((v) => setWaAutoConnect(v as boolean))
    window.api.getConfig('minimizeToTray').then((v) => setMinimizeToTray(v as boolean))
    window.api.getConfig('startWithSystem').then((v) => setStartWithSystem(v as boolean))
    window.api.getConfig('useGit').then((v) => setUseGit(v as boolean))
    window.api.getConfig('workspacePath').then((v) => setWorkspacePath(v as string))
    window.api.isGitAvailable().then(setGitAvailable)
    window.api.getAppVersion().then(setAppVersion)

    const unsubConfig = window.api.onConfigChanged((key, value) => {
      if (key === 'model') setModel(value as string)
      if (key === 'permissionMode') setPermissionMode(value as ConfigMap['permissionMode'])
      if (key === 'streamToWhatsApp') setStreamToWhatsApp(value === 'true' || value === true)
      if (key === 'minimizeToTray') setMinimizeToTray(value === 'true' || value === true)
      if (key === 'startWithSystem') setStartWithSystem(value === 'true' || value === true)
      if (key === 'useGit') setUseGit(value === 'true' || value === true)
    })
    const unsubUpdate = window.api.onUpdateStatus((s) => {
      if (s.state !== 'checking') setUpdateChecking(false)
    })
    return () => { unsubConfig(); unsubUpdate() }
  }, [])

  const handlePermissionChange = async (mode: ConfigMap['permissionMode']): Promise<void> => {
    await window.api.setConfig('permissionMode', mode)
    setPermissionMode(mode)
  }

  const handleStreamToggle = async (value: boolean): Promise<void> => {
    await window.api.setConfig('streamToWhatsApp', value)
    setStreamToWhatsApp(value)
  }

  const handleCopyPath = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(workspacePath)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available
    }
  }

  const PERMISSION_MODES: { value: ConfigMap['permissionMode']; label: string; tip: string; desc: string }[] = [
    { value: 'default', label: 'Ask', tip: 'Asks before every tool call', desc: 'Confirm each action' },
    { value: 'acceptEdits', label: 'Accept Edits', tip: 'File edits auto-approved, rest asks', desc: 'Auto-approve file changes' },
    { value: 'bypassPermissions', label: 'Bypass', tip: 'Fully autonomous, no prompts', desc: 'Full autonomy' },
    { value: 'plan', label: 'Plan', tip: 'Plan only, no execution', desc: 'Read-only analysis' }
  ]

  return (
    <div className="max-w-xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-base font-semibold text-zinc-100">Settings</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Agent configuration and preferences</p>
      </div>

      {/* Agent */}
      <section className="space-y-3">
        <SectionHeader icon={<AgentIcon />} label="Agent" />

        <div className="space-y-1.5">
          <Row label="Permission Mode">
            <PillGroup>
              {PERMISSION_MODES.map(({ value, label, tip }) => (
                <Pill key={value} active={permissionMode === value} onClick={() => handlePermissionChange(value)} title={tip}>
                  {label}
                </Pill>
              ))}
            </PillGroup>
          </Row>
          <div className="flex justify-end">
            <p className="text-[10px] text-zinc-600">
              {PERMISSION_MODES.find((m) => m.value === permissionMode)?.desc}
            </p>
          </div>
        </div>

        <Row label="Model">
          <PillGroup>
            {models.map((m) => (
              <Pill key={m.value} active={model === m.value} onClick={async () => {
                await window.api.setConfig('model', m.value)
                setModel(m.value)
              }} title={m.description}>
                {m.label}
              </Pill>
            ))}
          </PillGroup>
        </Row>
      </section>

      {/* WhatsApp */}
      <section className="space-y-3">
        <SectionHeader icon={<ChatIcon />} label="WhatsApp" />

        <Row label="Auto-Connect">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">{waAutoConnect ? 'On startup' : 'Manual'}</span>
            <Toggle checked={waAutoConnect} onChange={async (next) => {
              await window.api.setConfig('whatsappAutoConnect', next)
              setWaAutoConnect(next)
            }} title={waAutoConnect ? 'Connects on app start' : 'Manual connect only'} />
          </div>
        </Row>

        <Row label="Response Mode">
          <PillGroup>
            <Pill active={!streamToWhatsApp} onClick={() => handleStreamToggle(false)} title="Claude decides what to send via MCP tool">
              sendMessage
            </Pill>
            <Pill active={streamToWhatsApp} onClick={() => handleStreamToggle(true)} title="All assistant text sent immediately as it's generated">
              Streaming
            </Pill>
          </PillGroup>
        </Row>
      </section>

      {/* Application */}
      <section className="space-y-3">
        <SectionHeader icon={<AppIcon />} label="Application" />

        <Row label="Minimize to Tray">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">{minimizeToTray ? 'Close to tray' : 'Close quits'}</span>
            <Toggle checked={minimizeToTray} onChange={async (next) => {
              await window.api.setConfig('minimizeToTray', next)
              setMinimizeToTray(next)
            }} title={minimizeToTray ? 'Close button minimizes to tray' : 'Close button quits the app'} />
          </div>
        </Row>

        <Row label="Start with System">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">{startWithSystem ? 'Auto-launch' : 'Manual'}</span>
            <Toggle checked={startWithSystem} onChange={async (next) => {
              await window.api.setConfig('startWithSystem', next)
              setStartWithSystem(next)
            }} title={startWithSystem ? 'App starts automatically on login' : 'Manual start only'} />
          </div>
        </Row>

        <Row label="Use Git">
          <div className="flex items-center gap-2">
            {!gitAvailable && <span className="text-[10px] text-amber-500/80">Not installed</span>}
            {gitAvailable && <span className="text-[10px] text-zinc-600">{useGit ? 'Tracking enabled' : 'No history'}</span>}
            <Toggle checked={useGit && gitAvailable} onChange={async (next) => {
              await window.api.setConfig('useGit', next)
              setUseGit(next)
            }} title={!gitAvailable ? 'Git is not installed' : useGit ? 'Git tracking for workspace and projects' : 'Git disabled — no version history'} />
          </div>
        </Row>

        <Row label="Version">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500 font-mono">v{appVersion}</span>
            <button
              type="button"
              onClick={() => {
                setUpdateChecking(true)
                window.api.checkForUpdates()
              }}
              disabled={updateChecking}
              className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateChecking ? 'Checking...' : 'Check for Updates'}
            </button>
          </div>
        </Row>

        <Row label="Workspace">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyPath}
              className="flex items-center gap-1.5 group cursor-pointer"
              title="Click to copy path"
            >
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-300 font-mono truncate max-w-[240px] transition-colors">
                {workspacePath}
              </span>
              {copied ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 group-hover:text-zinc-400 shrink-0 transition-colors">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => window.api.openFolder(workspacePath)}
              className="px-2 py-0.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-md text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors shrink-0"
              title="Open workspace in file explorer"
            >
              Open
            </button>
          </div>
        </Row>
      </section>

      {/* Danger Zone */}
      <DangerZone />
    </div>
  )
}

/* ─── Section Header ────────────────────────────────────────── */

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }): React.JSX.Element {
  return (
    <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60 pb-2">
      <span className="text-zinc-600">{icon}</span>
      {label}
    </h2>
  )
}

/* ─── Inline SVG Icons (16px) ───────────────────────────────── */

function AgentIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
    </svg>
  )
}

function ChatIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function AppIcon(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

/* ─── Danger Zone ───────────────────────────────────────────── */

const RESET_OPTIONS: { key: string; label: string; tip: string; action: () => Promise<void> }[] = [
  { key: 'settings', label: 'Settings', tip: 'Reset config to defaults', action: () => window.api.resetSettings() },
  { key: 'conversations', label: 'Conversations', tip: 'All conversations + messages', action: () => window.api.resetConversations() },
  { key: 'scheduler', label: 'Scheduler', tip: 'All tasks (system tasks will be re-created)', action: () => window.api.resetScheduler() },
  { key: 'workspace', label: 'Workspace', tip: 'Memory, templates, tmp/', action: () => window.api.resetWorkspace() },
  { key: 'whatsapp', label: 'WhatsApp', tip: 'Disconnect + re-scan QR code', action: () => window.api.resetWhatsApp() }
]

function DangerZone(): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const toggle = (key: string): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
    setConfirming(false)
  }

  const selectAll = (): void => {
    if (selected.size === RESET_OPTIONS.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(RESET_OPTIONS.map((o) => o.key)))
    }
    setConfirming(false)
  }

  const runReset = async (): Promise<void> => {
    if (selected.size === 0) return

    setRunning(true)
    setConfirming(false)
    try {
      // If all selected, use full reset (also clears contacts + projects)
      if (selected.size === RESET_OPTIONS.length) {
        await window.api.resetFull()
      } else {
        for (const opt of RESET_OPTIONS) {
          if (selected.has(opt.key)) await opt.action()
        }
      }
      const needsReload = selected.has('settings')
      setSelected(new Set())
      if (needsReload) {
        window.location.reload()
        return
      }
      setStatus('Reset successful.')
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`)
    } finally {
      setRunning(false)
    }
  }

  const selectedLabels = RESET_OPTIONS.filter((o) => selected.has(o.key)).map((o) => o.label).join(', ')
  const isFullReset = selected.size === RESET_OPTIONS.length

  return (
    <section className="space-y-0">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full group"
      >
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400/80 uppercase tracking-wider">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500/60">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Danger Zone
        </h2>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-zinc-600 group-hover:text-zinc-400 transition-all duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="border-b border-red-900/30 mt-2" />

      {/* Collapsible body */}
      {expanded && (
        <div className="pt-3 space-y-3">
          <p className="text-[10px] text-zinc-600">
            Select components to reset. This cannot be undone.
          </p>

          <div className="space-y-1.5">
            {RESET_OPTIONS.map(({ key, label, tip }) => (
              <label key={key} className="flex items-center gap-2.5 cursor-pointer group py-0.5" title={tip}>
                <input
                  type="checkbox"
                  checked={selected.has(key)}
                  onChange={() => toggle(key)}
                  className="accent-red-500 w-3.5 h-3.5"
                />
                <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors w-24">{label}</span>
                <span className="text-[10px] text-zinc-600">{tip}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={selectAll}
              className="px-2.5 py-1 rounded-md text-[10px] text-zinc-500 border border-zinc-700/50 hover:border-zinc-600 hover:text-zinc-400 transition-colors"
            >
              {selected.size === RESET_OPTIONS.length ? 'None' : 'All'}
            </button>

            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={selected.size === 0 || running}
                className="px-3 py-1 rounded-md text-xs font-medium border bg-red-900/30 text-red-300 border-red-700/40 hover:bg-red-900/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Reset
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runReset}
                  disabled={running}
                  className="px-3 py-1 rounded-md text-xs font-medium border bg-red-600 text-white border-red-500 hover:bg-red-500 disabled:opacity-50 transition-colors"
                >
                  {running ? 'Resetting...' : isFullReset ? 'Confirm Full Reset' : 'Confirm Reset'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="px-2.5 py-1 rounded-md text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Confirmation warning */}
          {confirming && selected.size > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-800/30 bg-amber-900/10 px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500/70 shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="text-[11px] text-amber-400/90 font-medium">
                  {isFullReset ? 'Full reset will also clear contacts and projects.' : `Will reset: ${selectedLabels}`}
                </p>
                <p className="text-[10px] text-zinc-600 mt-0.5">
                  This action cannot be undone.{selected.has('settings') && ' App will reload after reset.'}
                </p>
              </div>
            </div>
          )}

          {status && (
            <p className={`text-xs ${status.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {status}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
