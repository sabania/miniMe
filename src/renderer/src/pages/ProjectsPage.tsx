import { useState, useEffect, useCallback } from 'react'
import type { Project } from '../../../shared/types'

export function ProjectsPage(): React.JSX.Element {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [list, current] = await Promise.all([
      window.api.getProjects(),
      window.api.getConfig('currentProject')
    ])
    setProjects(list as Project[])
    setCurrentProject(current as string)
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleBrowse = async (): Promise<void> => {
    const path = await window.api.openFolderDialog()
    if (path) setNewPath(path)
  }

  const handleAdd = async (): Promise<void> => {
    const name = newName.trim()
    const path = newPath.trim()
    if (!name || !path) return
    setError(null)
    setIsAdding(true)
    try {
      await window.api.addProject(name, path)
      setNewName('')
      setNewPath('')
      setShowAdd(false)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add project')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemove = async (name: string): Promise<void> => {
    setIsRemoving(true)
    try {
      await window.api.removeProject(name)
      setConfirmDeleteName(null)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove project')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleCopyPath = async (path: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(path)
      setCopiedPath(path)
      setTimeout(() => setCopiedPath(null), 1500)
    } catch {
      // clipboard not available
    }
  }

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  const canCreate = newName.trim().length > 0 && newPath.trim().length > 0

  return (
    <div className="max-w-xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-zinc-100">Projects</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Local directories linked into the workspace</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md text-xs font-medium transition-colors"
        >
          + Add
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-800/40 bg-red-900/15 px-4 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400/70 shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span className="text-xs text-red-400 flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300 transition-colors shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4 space-y-3">
          <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">New Project</h2>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name (e.g. my-app)"
                className="w-full rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
              {showAdd && newName.trim().length === 0 && newPath.trim().length > 0 && (
                <p className="text-[10px] text-amber-500/70 pl-1">Project name is required</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="Host path (e.g. C:\Users\...)"
                  className="flex-1 rounded-md border border-zinc-700/50 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleBrowse}
                  className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-md text-xs font-medium transition-colors"
                  title="Browse for folder"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  Browse
                </button>
              </div>
              {showAdd && newPath.trim().length === 0 && newName.trim().length > 0 && (
                <p className="text-[10px] text-amber-500/70 pl-1">Host path is required</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!canCreate || isAdding}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-md text-xs font-medium transition-colors"
              title={!canCreate ? 'Fill in both name and path to create a project' : 'Create project'}
            >
              {isAdding ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(''); setNewPath(''); setError(null) }}
              className="px-4 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-md text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            {!canCreate && (newName.trim().length > 0 || newPath.trim().length > 0) && (
              <span className="text-[10px] text-zinc-600">Both fields required</span>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && !showAdd && (
        <div className="rounded-xl border border-dashed border-zinc-700/50 bg-zinc-900/30 p-12 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700/80 mx-auto mb-4">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          <p className="text-zinc-400 text-sm font-medium">No projects yet</p>
          <p className="text-zinc-600 text-xs mt-1.5 max-w-[240px] mx-auto">
            Link local directories into the agent workspace so the agent can access your code.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-4 px-4 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-md text-xs font-medium text-zinc-300 transition-colors"
          >
            Add your first project
          </button>
        </div>
      )}

      {/* Project list */}
      <div className="space-y-3">
        {projects.map((project) => {
          const isCurrent = project.name === currentProject
          const isDeleting = confirmDeleteName === project.name
          return (
            <div
              key={project.name}
              className={`rounded-xl border p-4 transition-all ${
                isCurrent
                  ? 'border-blue-500/25 bg-blue-600/5'
                  : 'border-zinc-800/60 bg-zinc-900/50'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCurrent ? 'bg-blue-400' : 'bg-zinc-700'}`} />
                  <span className={`text-sm font-medium ${isCurrent ? 'text-blue-400' : 'text-zinc-200'}`}>
                    {project.name}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-600/20 text-[10px] text-blue-400 font-medium uppercase tracking-wide">
                      active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {project.createdAt && (
                    <span className="text-[10px] text-zinc-600" title={project.createdAt}>
                      {formatDate(project.createdAt)}
                    </span>
                  )}
                  {isDeleting ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-red-400/80 mr-1">Remove?</span>
                      <button
                        type="button"
                        onClick={() => handleRemove(project.name)}
                        disabled={isRemoving}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-md text-[11px] font-medium transition-colors"
                      >
                        {isRemoving ? 'Removing...' : 'Yes, remove'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteName(null)}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded-md text-[11px] transition-colors"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteName(project.name)}
                      className="text-zinc-600 hover:text-red-400 transition-colors duration-150"
                      title="Remove project"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Paths */}
              <div className="mt-2.5 space-y-1">
                <div className="flex items-center gap-1.5 group">
                  <span className="text-[10px] text-zinc-600 w-10 shrink-0">Host</span>
                  <p className="text-[11px] text-zinc-500 font-mono truncate select-text flex-1" title={project.hostPath}>
                    {project.hostPath}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 group">
                  <span className="text-[10px] text-zinc-600 w-10 shrink-0">Link</span>
                  <p className="text-[11px] text-zinc-600 font-mono truncate select-text flex-1" title={project.junctionPath}>
                    {project.junctionPath}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCopyPath(project.junctionPath)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Copy junction path"
                  >
                    {copiedPath === project.junctionPath ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 hover:text-zinc-400">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
