import { useState, useEffect, useCallback, useRef } from 'react'
import type { WhatsAppState, AgentState, Conversation, Message } from '../../shared/types'

import { StatusHeader } from './components/StatusHeader'
import { UpdateBanner } from './components/UpdateBanner'
import { LanguageDialog } from './components/LanguageDialog'
import { SessionPanel } from './components/SessionPanel'
import { SessionDetail } from './components/SessionDetail'
import { WhatsAppPage } from './pages/WhatsAppPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SchedulerPage } from './pages/SchedulerPage'
import { SettingsPage } from './pages/SettingsPage'
import { useToast } from './hooks/useToast'

type View = 'sessions' | 'whatsapp' | 'projects' | 'scheduler' | 'settings'

// SVG nav icons — 20x20, stroke-based, currentColor
const NavIcons: Record<View, React.JSX.Element> = {
  sessions: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h8M8 14h4" opacity="0.5" />
    </svg>
  ),
  whatsapp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.82 14.01c-.24.68-1.41 1.3-1.95 1.38-.5.07-1.13.1-1.83-.11-.42-.13-.96-.32-1.65-.63-2.91-1.29-4.81-4.24-4.96-4.44-.14-.2-1.18-1.57-1.18-3s.75-2.13 1.01-2.42c.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.19-.14.31-.29.47-.14.17-.3.38-.43.51-.14.14-.29.3-.13.58.17.29.74 1.22 1.58 1.97 1.09.97 2.01 1.27 2.29 1.41.29.14.45.12.62-.07.17-.19.71-.83.9-1.12.19-.29.38-.24.63-.14.26.1 1.63.77 1.91.91.29.14.48.21.55.33.07.12.07.68-.17 1.36z" />
    </svg>
  ),
  projects: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
  scheduler: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="12" cy="16" r="2" opacity="0.5" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'sessions', label: 'Sessions' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'projects', label: 'Projects' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'settings', label: 'Settings' }
]

function App(): React.JSX.Element {
  const [activeView, setActiveView] = useState<View>('sessions')
  const [showLanguageDialog, setShowLanguageDialog] = useState(false)
  const [toast, showToast] = useToast()

  // Global state
  const [waState, setWaState] = useState<WhatsAppState>({ status: 'disconnected', jid: null, qrCode: null })
  const [agentState, setAgentState] = useState<AgentState>({ status: 'idle', activeConversationId: null, pendingPermission: null })

  // Session state
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeCwd, setActiveCwd] = useState('')

  // Refs for polling (avoid stale closures)
  const selectedIdRef = useRef(selectedId)
  selectedIdRef.current = selectedId

  const loadConversations = useCallback(async () => {
    const list = await window.api.getConversations()
    setConversations(list)
  }, [])

  // Init global state + events
  useEffect(() => {
    window.api.whatsappGetState().then(setWaState)
    window.api.getAgentState().then(setAgentState)
    window.api.getConfig('currentCwd').then((c) => setActiveCwd(c as string))
    loadConversations()
    const unsubWa = window.api.onWhatsAppState(setWaState)
    const unsubAgent = window.api.onAgentState((s) => {
      setAgentState(s)
      loadConversations()
      // Refresh activeCwd — agent may have changed it
      window.api.getConfig('currentCwd').then((c) => setActiveCwd(c as string))
    })
    const unsubMsg = window.api.onNewMessage((convId) => {
      // Refresh messages if viewing this conversation
      if (selectedIdRef.current === convId) {
        window.api.getMessages(convId).then((msgs) => {
          if (selectedIdRef.current === convId) setMessages(msgs)
        })
      }
      loadConversations()
    })
    const unsubNav = window.api.onNavigate((view) => {
      if (['sessions', 'whatsapp', 'projects', 'scheduler', 'settings'].includes(view)) {
        setActiveView(view as View)
      }
    })
    const unsubLang = window.api.onChooseLanguage(() => {
      setShowLanguageDialog(true)
    })
    return () => { unsubWa(); unsubAgent(); unsubMsg(); unsubNav(); unsubLang() }
  }, [loadConversations])

  // Auto-select active session when switching to sessions view
  useEffect(() => {
    if (activeView !== 'sessions') return
    if (selectedId && conversations.some((c) => c.id === selectedId)) return
    const active = conversations.find((c) => c.status === 'active')
    if (active) setSelectedId(active.id)
    else if (conversations.length > 0) setSelectedId(conversations[0].id)
  }, [activeView, conversations, selectedId])

  // Auto-select the active conversation when a permission request arrives
  useEffect(() => {
    if (!agentState.pendingPermission || !agentState.activeConversationId) return
    if (activeView === 'sessions' && selectedId === agentState.activeConversationId) return
    // Switch to sessions view and select the conversation with the pending permission
    setActiveView('sessions')
    setSelectedId(agentState.activeConversationId)
  }, [agentState.pendingPermission, agentState.activeConversationId, activeView, selectedId])

  // Load messages when selection changes
  useEffect(() => {
    if (!selectedId) { setMessages([]); return }
    window.api.getMessages(selectedId).then((msgs) => {
      // Guard: only update if selection hasn't changed
      if (selectedIdRef.current === selectedId) setMessages(msgs)
    })
  }, [selectedId])


  // Actions
  const handleNewSession = async (): Promise<void> => {
    const newId = await window.api.newConversation()
    await loadConversations()
    setSelectedId(newId ?? null)
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.api.deleteConversation(id)
    if (selectedId === id) setSelectedId(null)
    await loadConversations()
    showToast('Session deleted')
  }

  const handleResume = async (id: string): Promise<void> => {
    await window.api.resumeConversation(id)
    await loadConversations()
    showToast('Session resumed')
  }

  const handleStop = async (): Promise<void> => {
    await window.api.abortAgent()
    showToast('Agent stopped')
  }

  const handlePermissionRespond = async (decision: 'allow' | 'deny', answer?: string): Promise<void> => {
    if (!agentState.pendingPermission) return
    await window.api.respondPermission({ id: agentState.pendingPermission.id, decision, answer })
  }

  const handleLanguageSelect = async (lang: 'de' | 'en'): Promise<void> => {
    await window.api.setConfig('language', lang)
    await window.api.workspaceScaffold()
    setShowLanguageDialog(false)
  }

  const selectedConv = conversations.find((c) => c.id === selectedId)

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      {/* Language Dialog */}
      {showLanguageDialog && <LanguageDialog onSelect={handleLanguageSelect} />}

      {/* Icon Rail */}
      <nav className="flex w-12 flex-col items-center border-r border-zinc-800/80 bg-zinc-900/60 pt-3 gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              type="button"
              key={item.id}
              onClick={() => setActiveView(item.id)}
              aria-label={item.label}
              className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400'
                  : 'text-zinc-500 hover:bg-zinc-800/80 hover:text-zinc-300'
              }`}
              title={item.label}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[1px] w-[3px] h-4 bg-blue-500 rounded-r" />
              )}
              {NavIcons[item.id]}
              {/* Permission badge on Sessions icon */}
              {item.id === 'sessions' && agentState.pendingPermission && (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse ring-2 ring-zinc-900" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <StatusHeader waState={waState} agentState={agentState} cwd={activeCwd} />
        <UpdateBanner />

        <div className="flex-1 flex overflow-hidden relative">
          {/* Toast */}
          {toast && (
            <div
              role="alert"
              aria-live="assertive"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-medium px-4 py-2 rounded-lg shadow-xl z-20 animate-toast-in"
            >
              {toast}
            </div>
          )}

          {/* Sessions view */}
          <div className={`flex-1 flex overflow-hidden ${activeView === 'sessions' ? '' : 'hidden'}`}>
            <SessionPanel
              conversations={conversations}
              selectedId={selectedId}
              agentState={agentState}
              onSelect={setSelectedId}
              onNewSession={handleNewSession}
              onDelete={handleDelete}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedConv ? (
                <SessionDetail
                  conversation={selectedConv}
                  messages={messages}
                  agentState={agentState}
                  onResume={() => handleResume(selectedConv.id)}
                  onStop={handleStop}
                  onOpenTerminal={() => window.api.openSessionTerminal(selectedConv.id)}
                  onOpenVSCode={() => window.api.openSessionVSCode(selectedConv.id)}
                  onOpenWorkspace={async () => {
                    const ws = await window.api.getConfig('workspacePath')
                    window.api.openFolder(ws as string)
                  }}
                  onPermissionRespond={handlePermissionRespond}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-zinc-500 text-sm">Select a session</span>
                  <span className="text-zinc-600 text-xs">or create a new one to get started</span>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp view */}
          <div className={`flex-1 overflow-y-auto ${activeView === 'whatsapp' ? '' : 'hidden'}`}>
            <WhatsAppPage waState={waState} />
          </div>

          {/* Projects view */}
          <div className={`flex-1 overflow-y-auto ${activeView === 'projects' ? '' : 'hidden'}`}>
            <ProjectsPage />
          </div>

          {/* Scheduler view */}
          <div className={`flex-1 overflow-y-auto ${activeView === 'scheduler' ? '' : 'hidden'}`}>
            <SchedulerPage />
          </div>

          {/* Settings view */}
          <div className={`flex-1 overflow-y-auto ${activeView === 'settings' ? '' : 'hidden'}`}>
            <SettingsPage />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
