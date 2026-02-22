import { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { formatPhoneDisplay } from '../lib/helpers'
import type { WhatsAppState, Contact } from '../../../shared/types'

function QrCodeDisplay({ data }: { data: string }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current && data) {
      QRCode.toCanvas(canvasRef.current, data, {
        width: 256,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).catch((err) => console.error('QR render failed:', err))
    }
  }, [data])

  return <canvas ref={canvasRef} className="rounded" />
}

export function WhatsAppPage({
  waState
}: {
  waState: WhatsAppState
}): React.JSX.Element {
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newIsOwner, setNewIsOwner] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmDeleteCreds, setConfirmDeleteCreds] = useState(false)
  const [confirmDeleteJid, setConfirmDeleteJid] = useState<string | null>(null)
  const [editingJid, setEditingJid] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editNumber, setEditNumber] = useState('')
  const [userName, setUserName] = useState('')
  const [userPreferences, setUserPreferences] = useState('')

  useEffect(() => {
    window.api.getContacts().then((list) => {
      setContacts(list)
      // Sync: if userName empty, use owner's displayName
      window.api.getConfig('userName').then((v) => {
        const name = (v as string) || ''
        if (!name) {
          const owner = list.find((c) => c.isOwner)
          if (owner?.displayName) {
            setUserName(owner.displayName)
            window.api.setConfig('userName', owner.displayName)
          }
        } else {
          setUserName(name)
        }
      })
    })
    window.api.getConfig('userPreferences').then((v) => setUserPreferences((v as string) || ''))
  }, [])

  const handleConnect = async (): Promise<void> => {
    setLoading(true)
    try { await window.api.whatsappConnect() } catch (err) { console.error('Connect failed:', err) }
    setLoading(false)
  }

  const handleDisconnect = async (): Promise<void> => {
    setLoading(true)
    try { await window.api.whatsappDisconnect() } catch (err) { console.error('Disconnect failed:', err) }
    setLoading(false)
  }

  const handleDeleteCredentials = async (): Promise<void> => {
    setLoading(true)
    try { await window.api.whatsappDeleteCredentials() } catch (err) { console.error('Delete creds failed:', err) }
    setLoading(false)
    setConfirmDeleteCreds(false)
  }

  const refreshUserName = (): void => {
    window.api.getConfig('userName').then((v) => setUserName((v as string) || ''))
  }

  const handleAddContact = async (): Promise<void> => {
    const trimmed = newNumber.trim()
    if (!trimmed) return
    const digits = trimmed.replace(/[^\d]/g, '')
    if (digits.length < 5) { setError('At least 5 digits (e.g. +41 79 123 45 67)'); return }
    try {
      const updated = await window.api.addContact(
        trimmed,
        newName.trim(),
        newDesc.trim() || undefined,
        newIsOwner
      )
      setContacts(updated)
      setNewNumber('')
      setNewName('')
      setNewDesc('')
      setNewIsOwner(false)
      setShowAdd(false)
      setError(null)
      refreshUserName()
    } catch (err) { setError(err instanceof Error ? err.message : String(err)) }
  }

  const handleRemoveContact = async (jid: string): Promise<void> => {
    const updated = await window.api.removeContact(jid)
    setContacts(updated)
    setConfirmDeleteJid(null)
    refreshUserName()
  }

  const handleToggleOwner = async (jid: string, currentlyOwner: boolean): Promise<void> => {
    const updated = await window.api.updateContact(jid, { isOwner: !currentlyOwner })
    setContacts(updated)
    refreshUserName()
  }

  const startEdit = (c: Contact): void => {
    setEditingJid(c.jid)
    setEditName(c.displayName)
    setEditDesc(c.description ?? '')
    setEditNumber(c.jid)
    setConfirmDeleteJid(null)
  }

  const handleSaveEdit = async (): Promise<void> => {
    if (!editingJid) return
    const updated = await window.api.updateContact(editingJid, {
      displayName: editName.trim(),
      description: editDesc.trim()
    })
    // If number changed, need to remove old + add new
    const newJid = editNumber.replace(/[^\d]/g, '')
    if (newJid !== editingJid) {
      await window.api.removeContact(editingJid)
      const contact = contacts.find((c) => c.jid === editingJid)
      const finalList = await window.api.addContact(newJid, editName.trim(), editDesc.trim(), contact?.isOwner)
      setContacts(finalList)
    } else {
      setContacts(updated)
    }
    setEditingJid(null)
    refreshUserName()
  }

  const statusColor =
    waState.status === 'connected' ? 'bg-green-500' : waState.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'

  const isConnected = waState.status === 'connected'
  const isConnecting = waState.status === 'connecting'

  return (
    <div className="max-w-xl mx-auto space-y-5 p-6">
      <div>
        <h1 className="text-base font-semibold text-zinc-100">WhatsApp</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Connection & contacts management</p>
      </div>

      {/* Connection Card */}
      <div className={`rounded-xl border p-4 space-y-3 ${
        isConnected
          ? 'border-green-900/30 bg-green-950/10'
          : isConnecting
            ? 'border-yellow-900/30 bg-yellow-950/10'
            : 'border-zinc-800/60 bg-zinc-900/50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${statusColor} ${isConnecting ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium capitalize">{waState.status}</span>
            {waState.jid && (
              <span className="text-zinc-500 text-xs font-mono">{waState.jid}</span>
            )}
          </div>
          <div className="flex gap-1.5">
            {waState.status === 'disconnected' && (
              <>
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={loading}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-md text-xs font-medium transition-colors"
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
                {confirmDeleteCreds ? (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleDeleteCredentials}
                      disabled={loading}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-md text-xs font-medium transition-colors"
                    >
                      Sure?
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCreds(false)}
                      className="px-2.5 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-md text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteCreds(true)}
                    className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-md text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </>
            )}
            {waState.status !== 'disconnected' && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={loading}
                className="px-3 py-1.5 bg-zinc-800/80 hover:bg-red-600/80 border border-zinc-700/50 hover:border-red-600/50 disabled:opacity-50 rounded-md text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {waState.qrCode && (
          <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-lg mt-2">
            <QrCodeDisplay data={waState.qrCode} />
            <p className="text-zinc-600 text-xs font-medium">Scan with WhatsApp</p>
          </div>
        )}
      </div>

      {/* Contacts */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Contacts</h2>
            <p className="text-xs text-zinc-600 mt-0.5">Who can message the agent. Empty = self-chat only.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd(!showAdd)}
            className="px-2.5 py-1.5 bg-blue-600/15 border border-blue-500/30 hover:bg-blue-600/25 rounded-md text-xs font-medium text-blue-400 transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Contact'}
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="space-y-2.5 p-3.5 rounded-lg bg-zinc-800/40 border border-zinc-700/40">
            <div className="flex gap-2">
              <input
                type="text"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="flex-1 rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                placeholder="+41 79 123 45 67"
              />
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                placeholder="Name"
              />
            </div>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
              placeholder="Description (optional)"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newIsOwner}
                  onChange={(e) => setNewIsOwner(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500/20"
                />
                Set as owner
              </label>
              <button
                type="button"
                onClick={handleAddContact}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-medium transition-colors"
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>
        )}

        {/* Contact list */}
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-4 text-center">
            <span className="text-zinc-500 text-xs">No contacts configured</span>
            <span className="text-zinc-600 text-[11px]">Self-chat only mode</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {contacts.map((c) => editingJid === c.jid ? (
              <div key={c.jid} className="space-y-2 p-3 rounded-lg bg-zinc-800/40 border border-blue-500/30">
                <div className="flex gap-2">
                  <input type="text" value={editNumber} onChange={(e) => setEditNumber(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-700/50 bg-zinc-900/50 px-2.5 py-1.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                    placeholder="Number" />
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-zinc-700/50 bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                    placeholder="Name" />
                </div>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2}
                  className="w-full rounded-md border border-zinc-700/50 bg-zinc-900/50 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
                  placeholder="Description (optional)" />
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => setEditingJid(null)}
                    className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-md transition-colors">Cancel</button>
                  <button type="button" onClick={handleSaveEdit}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-medium transition-colors">Save</button>
                </div>
              </div>
            ) : (
              <div
                key={c.jid}
                className="flex items-center justify-between rounded-lg bg-zinc-800/30 border border-zinc-700/30 px-3 py-2.5 group transition-colors hover:bg-zinc-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 truncate">
                      {c.displayName || '(no name)'}
                    </span>
                    {c.isOwner ? (
                      <button type="button" onClick={() => handleToggleOwner(c.jid, true)}
                        className="px-1.5 py-0.5 rounded bg-blue-600/20 text-xs text-blue-400 font-medium hover:bg-blue-600/30 transition-colors flex-shrink-0">
                        Owner
                      </button>
                    ) : (
                      <button type="button" onClick={() => handleToggleOwner(c.jid, false)}
                        className="px-1.5 py-0.5 rounded bg-zinc-700/50 text-xs text-zinc-400 font-medium opacity-0 group-hover:opacity-100 hover:bg-blue-600/20 hover:text-blue-400 transition-all flex-shrink-0"
                        title="Set as owner">
                        Owner
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-500">
                    {formatPhoneDisplay(c.jid.replace(/@.*$/, ''))}
                  </span>
                  {c.description && (
                    <p className="text-xs text-zinc-500 truncate">{c.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {confirmDeleteJid === c.jid ? (
                    <div className="flex gap-1">
                      <button type="button" onClick={() => handleRemoveContact(c.jid)}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 rounded-md text-xs font-medium transition-colors">Sure?</button>
                      <button type="button" onClick={() => setConfirmDeleteJid(null)}
                        className="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-md text-xs transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => startEdit(c)}
                        className="text-zinc-600 hover:text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-all duration-150">edit</button>
                      <button type="button" onClick={() => setConfirmDeleteJid(c.jid)}
                        className="text-zinc-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-all duration-150">remove</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Profile */}
      <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
        <div>
          <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Your Profile</h2>
          <p className="text-xs text-zinc-600 mt-0.5">How the agent knows and addresses you.</p>
        </div>

        <div className="space-y-2.5">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onBlur={async () => {
              await window.api.setConfig('userName', userName.trim())
              window.api.getContacts().then(setContacts)
            }}
            className="w-full rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            placeholder="Your name"
          />
          <textarea
            value={userPreferences}
            onChange={(e) => setUserPreferences(e.target.value)}
            onBlur={() => window.api.setConfig('userPreferences', userPreferences.trim())}
            rows={3}
            className="w-full rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all resize-none"
            placeholder="Preferences, context, how the agent should behave..."
          />
        </div>
      </div>
    </div>
  )
}
