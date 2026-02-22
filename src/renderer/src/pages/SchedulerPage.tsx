import { useState, useEffect, useMemo, useRef } from 'react'
import type { ScheduledTask, SchedulerLogEntry, TaskType } from '../../../shared/types'
import type { Frequency, TaskForm } from '../../../shared/cron-utils'
import { buildCron, describeCron, parseCronToForm, taskMatchesDate } from '../../../shared/cron-utils'
import { Pill, Toggle } from '../components/ui'

type ViewMode = 'calendar' | 'list'

const EMPTY_FORM: TaskForm = {
  name: '',
  prompt: '',
  frequency: 'daily',
  startDate: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  weekdays: [1, 2, 3, 4, 5], // Mo-Fr default
  intervalMin: 60,
  cronExpr: ''
}

const TYPE_COLORS: Record<TaskType, { chip: string; badge: string; dot: string; ring: string }> = {
  system: {
    chip: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
    badge: 'text-blue-400 bg-blue-500/10',
    dot: 'bg-blue-500',
    ring: 'ring-blue-500/30'
  },
  agent: {
    chip: 'bg-purple-600/20 text-purple-400 border border-purple-500/30',
    badge: 'text-purple-400 bg-purple-500/10',
    dot: 'bg-purple-500',
    ring: 'ring-purple-500/30'
  },
  user: {
    chip: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
    badge: 'text-emerald-400 bg-emerald-500/10',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-500/30'
  }
}

const WEEKDAY_LABELS: [number, string][] = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']]
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// ─── Calendar Helpers ───────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

// ─── Component ──────────────────────────────────────────────

export function SchedulerPage(): React.JSX.Element {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<SchedulerLogEntry[]>([])
  const [activeJobIds, setActiveJobIds] = useState<string[]>([])
  const [showLog, setShowLog] = useState(false)
  const [typeFilter, setTypeFilter] = useState<Set<TaskType>>(new Set(['system', 'agent', 'user']))
  const logEndRef = useRef<HTMLDivElement>(null)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    window.api.getScheduledTasks().then(setTasks)
    window.api.getSchedulerStatus().then((s) => {
      setLogEntries(s.logEntries)
      setActiveJobIds(s.activeJobs)
    })
    const unsub1 = window.api.onScheduledTasksChanged(setTasks)
    const unsub2 = window.api.onSchedulerLog((entry) => {
      setLogEntries((prev) => [...prev.slice(-49), entry])
    })
    return () => { unsub1(); unsub2() }
  }, [])

  // ─── Task CRUD ──────────────────────────────────────────

  const handleSaveTask = async (): Promise<void> => {
    if (!form.name.trim() || !form.prompt.trim()) return
    const cron = buildCron(form)
    if (!cron) return
    const oneShot = form.frequency === 'once'
    // startDate for once is encoded in cron; for daily/weekly it's "active from" date
    const startDate = (form.frequency === 'once' || form.frequency === 'daily' || form.frequency === 'weekly')
      ? form.startDate
      : null

    if (editingId) {
      const updated = await window.api.updateScheduledTask(editingId, {
        name: form.name, prompt: form.prompt, cronExpr: cron, oneShot, startDate
      })
      setTasks(updated)
      setEditingId(null)
    } else {
      const updated = await window.api.addScheduledTask(form.name, form.prompt, cron, oneShot, startDate)
      setTasks(updated)
      setShowAddForm(false)
    }
    setForm(EMPTY_FORM)
  }

  const startEdit = (task: ScheduledTask): void => {
    const parsed = parseCronToForm(task.cronExpr, task.oneShot)
    // DB startDate takes priority over cron-parsed startDate
    const startDate = task.startDate ?? parsed.startDate ?? EMPTY_FORM.startDate
    setForm({ ...EMPTY_FORM, name: task.name, prompt: task.prompt, ...parsed, startDate })
    setEditingId(task.id)
    setShowAddForm(false)
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setShowAddForm(false)
    setForm(EMPTY_FORM)
  }

  const handleToggleTask = async (task: ScheduledTask): Promise<void> => {
    const updated = await window.api.updateScheduledTask(task.id, { enabled: !task.enabled })
    setTasks(updated)
  }

  const handleRemoveTask = async (id: string): Promise<void> => {
    const updated = await window.api.removeScheduledTask(id)
    setTasks(updated)
    setDeleteConfirm(null)
  }

  const toggleTypeFilter = (type: TaskType): void => {
    setTypeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(type)) { if (next.size > 1) next.delete(type) } else next.add(type)
      return next
    })
  }

  // ─── Filtered & Calendar ────────────────────────────────

  const typedTasks = useMemo(() =>
    tasks.filter((t) => typeFilter.has(t.type ?? 'user'))
  , [tasks, typeFilter])

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return typedTasks
    const q = search.toLowerCase()
    return typedTasks.filter((t) => t.name.toLowerCase().includes(q) || t.prompt.toLowerCase().includes(q))
  }, [typedTasks, search])

  const enabledTasks = typedTasks.filter((t) => t.enabled)

  // Count tasks per type for filter pills
  const typeCounts = useMemo(() => {
    const counts: Record<TaskType, number> = { system: 0, agent: 0, user: 0 }
    for (const t of tasks) counts[t.type ?? 'user']++
    return counts
  }, [tasks])

  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(calYear, calMonth)
    const firstDay = getFirstDayOfMonth(calYear, calMonth)
    const days: Array<{ day: number; tasks: ScheduledTask[] } | null> = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth, d)
      days.push({ day: d, tasks: enabledTasks.filter((t) => taskMatchesDate(t, date)) })
    }
    return days
  }, [calYear, calMonth, enabledTasks])

  const selectedDayTasks = useMemo(() => {
    if (selectedDay === null) return []
    const date = new Date(calYear, calMonth, selectedDay)
    return enabledTasks.filter((t) => taskMatchesDate(t, date))
  }, [selectedDay, calYear, calMonth, enabledTasks])

  const prevMonth = (): void => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1)
    setSelectedDay(null)
  }
  const nextMonth = (): void => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1)
    setSelectedDay(null)
  }
  const goToday = (): void => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); setSelectedDay(now.getDate()) }
  const isToday = (day: number): boolean => calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate()
  const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth()

  const taskDotColor = (task: ScheduledTask): string => TYPE_COLORS[task.type ?? 'user'].dot

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-base font-semibold text-zinc-100">Scheduler</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Automated tasks and scheduled agent runs</p>
      </div>

      {/* Scheduled Tasks */}
      <section className="space-y-3">
        <SectionHeader>Scheduled Tasks</SectionHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <ViewToggle mode={viewMode} onChange={setViewMode} />

          {/* Type filter pills with counts */}
          <div className="flex gap-1">
            {([['system', 'Sys'], ['agent', 'Agent'], ['user', 'User']] as [TaskType, string][]).map(([t, label]) => (
              <button key={t} type="button" onClick={() => toggleTypeFilter(t)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all duration-150 flex items-center gap-1 ${
                  typeFilter.has(t)
                    ? TYPE_COLORS[t].chip
                    : 'bg-zinc-800/30 text-zinc-600 border border-zinc-700/40'
                }`}>
                {label}
                <span className={`text-[9px] ${typeFilter.has(t) ? 'opacity-70' : 'opacity-50'}`}>{typeCounts[t]}</span>
              </button>
            ))}
          </div>

          {/* Search with icon */}
          <div className="relative flex-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text" placeholder="Search..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-2.5 py-1 rounded-md text-xs bg-zinc-900/50 border border-zinc-700/50 text-zinc-300 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <button type="button"
            onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); setForm(EMPTY_FORM) }}
            className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 transition-colors shrink-0">
            + Task
          </button>
        </div>

        {/* Add / Edit Form */}
        {(showAddForm || editingId) && (
          <TaskFormUI form={form} setForm={setForm} onSave={handleSaveTask} onCancel={cancelEdit} isEdit={!!editingId} />
        )}

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <div className="space-y-3">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between px-1">
              <button type="button" onClick={prevMonth}
                className="text-zinc-500 hover:text-zinc-200 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800/50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-zinc-200 min-w-[140px] text-center">{MONTH_NAMES[calMonth]} {calYear}</span>
                {!isCurrentMonth && (
                  <button type="button" onClick={goToday}
                    className="text-[10px] text-zinc-500 hover:text-blue-400 px-2 py-0.5 rounded-full border border-zinc-700/40 hover:border-blue-500/30 hover:bg-blue-600/10 transition-all">
                    Today
                  </button>
                )}
              </div>
              <button type="button" onClick={nextMonth}
                className="text-zinc-500 hover:text-zinc-200 w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-800/50 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>

            {/* Day name headers */}
            <div className="grid grid-cols-7">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] text-zinc-500 font-medium py-1.5">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((cell, i) => {
                if (!cell) return <div key={`e-${i}`} className="h-14" />
                const today = isToday(cell.day)
                const selected = selectedDay === cell.day
                const hasTasks = cell.tasks.length > 0
                return (
                  <button type="button" key={cell.day}
                    onClick={() => setSelectedDay(selected ? null : cell.day)}
                    className={`h-14 rounded-lg flex flex-col items-center justify-start pt-1.5 gap-1 transition-all duration-150 text-xs relative
                      ${selected
                        ? 'bg-blue-600/15 border border-blue-500/30 shadow-sm shadow-blue-500/5'
                        : 'hover:bg-zinc-800/40 border border-transparent'
                      }
                      ${today && !selected ? 'bg-zinc-800/30' : ''}`}>
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs leading-none
                      ${today ? 'bg-blue-500 text-white font-semibold' : ''}
                      ${!today && hasTasks ? 'text-zinc-200 font-medium' : ''}
                      ${!today && !hasTasks ? 'text-zinc-500' : ''}`}>
                      {cell.day}
                    </span>
                    {hasTasks && (
                      <div className="flex gap-[3px] items-center">
                        {cell.tasks.slice(0, 3).map((t) => (
                          <div key={t.id} className={`w-1.5 h-1.5 rounded-full ${taskDotColor(t)} ring-1 ring-black/20`} />
                        ))}
                        {cell.tasks.length > 3 && (
                          <span className="text-[8px] text-zinc-500 font-medium leading-none">+{cell.tasks.length - 3}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected Day Details */}
            {selectedDay !== null && (
              <div className="border border-zinc-800/60 rounded-lg p-4 space-y-2.5 bg-zinc-900/30">
                <div className="text-xs font-medium text-zinc-300">
                  {selectedDay}. {MONTH_NAMES[calMonth]} {calYear}
                  {selectedDayTasks.length > 0 && (
                    <span className="ml-2 text-zinc-600">{selectedDayTasks.length} {selectedDayTasks.length === 1 ? 'Task' : 'Tasks'}</span>
                  )}
                </div>
                {selectedDayTasks.length === 0 ? (
                  <div className="flex items-center gap-2 py-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <p className="text-xs text-zinc-600">No tasks on this day</p>
                  </div>
                ) : selectedDayTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2.5 py-2 border-b border-zinc-800/30 last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${taskDotColor(task)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-200 truncate">{task.name}</span>
                        {task.oneShot && (
                          <span className="text-[9px] text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded-full leading-none">one-time</span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate mt-0.5">{describeCron(task.cronExpr)}</div>
                    </div>
                    <button type="button" onClick={() => startEdit(task)} className="text-zinc-600 hover:text-zinc-300 p-1 rounded-md hover:bg-zinc-800/50 transition-colors" title="Edit">
                      <EditIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            {enabledTasks.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 pt-1">
                {enabledTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${taskDotColor(t)}`} />
                    <span className="text-[10px] text-zinc-500">{t.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="space-y-2">
            {filteredTasks.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <div className="w-10 h-10 rounded-full bg-zinc-800/50 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-600">
                    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">
                    {search ? 'No results' : 'No tasks yet'}
                  </p>
                  {!search && <p className="text-[11px] text-zinc-600 mt-0.5">Create your first task with the + button</p>}
                </div>
              </div>
            )}
            {filteredTasks.map((task) => {
              const colors = TYPE_COLORS[task.type ?? 'user']
              return (
                <div key={task.id} className={`rounded-xl border p-3.5 transition-all duration-150 ${
                  task.enabled
                    ? 'border-zinc-800/60 bg-zinc-900/40'
                    : 'border-zinc-800/30 bg-zinc-900/15 opacity-50'
                }`}>
                  {/* Header row: toggle, name, badges, actions */}
                  <div className="flex items-center gap-2.5">
                    <Toggle small checked={task.enabled} onChange={() => handleToggleTask(task)} />
                    <span className={`flex-1 text-sm font-medium truncate ${task.enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {task.name}
                    </span>

                    {/* Type badge */}
                    <span className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full ${colors.badge}`}>
                      {task.type ?? 'user'}
                    </span>

                    {/* One-shot indicator */}
                    {task.oneShot && (
                      <span className="text-[9px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-medium">
                        one-time
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-0.5">
                      <button type="button" onClick={() => startEdit(task)}
                        className="text-zinc-600 hover:text-zinc-300 p-1.5 rounded-md hover:bg-zinc-800/50 transition-colors" title="Edit">
                        <EditIcon />
                      </button>
                      {deleteConfirm === task.id ? (
                        <div className="flex gap-1 ml-0.5">
                          <button type="button" onClick={() => handleRemoveTask(task.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded-md bg-red-900/15 hover:bg-red-900/25 transition-colors font-medium">
                            Delete
                          </button>
                          <button type="button" onClick={() => setDeleteConfirm(null)}
                            className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800/50 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setDeleteConfirm(task.id)}
                          className="text-zinc-600 hover:text-red-400 p-1.5 rounded-md hover:bg-zinc-800/50 transition-colors" title="Delete">
                          <TrashIcon />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Details row */}
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-2 pl-9">
                    <span className="flex items-center gap-1">
                      <ClockIcon />
                      {describeCron(task.cronExpr)}
                    </span>
                    {task.startDate && !task.oneShot && (
                      <>
                        <span className="text-zinc-700">·</span>
                        <span className="text-zinc-600">from {new Date(task.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </>
                    )}
                    <span className="text-zinc-700">·</span>
                    <span className={task.lastRunAt ? 'text-zinc-500' : 'text-zinc-600 italic'}>
                      {task.lastRunAt
                        ? `Last: ${new Date(task.lastRunAt).toLocaleString('en-US', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                        : 'Never run'}
                    </span>
                  </div>

                  {/* Prompt preview */}
                  <div className="text-xs text-zinc-400/80 truncate mt-1.5 pl-9">{task.prompt}</div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Scheduler Log */}
      <section className="space-y-3">
        <button type="button" onClick={() => setShowLog(!showLog)}
          className="flex items-center gap-2 w-full group">
          <SectionHeader>
            <span className="flex items-center gap-2">
              Scheduler Log
              {activeJobIds.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-normal text-emerald-500/80 normal-case tracking-normal">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {activeJobIds.length} active
                </span>
              )}
              {activeJobIds.length === 0 && (
                <span className="text-[10px] font-normal text-zinc-600 normal-case tracking-normal">
                  no active jobs
                </span>
              )}
            </span>
          </SectionHeader>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-zinc-600 transition-transform duration-200 ${showLog ? 'rotate-180' : ''}`}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div className={`overflow-hidden transition-all duration-200 ${showLog ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 space-y-px font-mono text-[10px]">
            {logEntries.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 py-4">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-700">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-zinc-600">No events</p>
              </div>
            ) : logEntries.map((entry, i) => (
              <div key={i} className="flex gap-2 py-1 px-1 rounded-md hover:bg-zinc-800/30 transition-colors">
                <span className="text-zinc-600 shrink-0 tabular-nums">
                  {new Date(entry.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <LogBadge type={entry.type} />
                <span className={`truncate ${
                  entry.type === 'error' ? 'text-red-400' :
                  entry.type === 'fire' ? 'text-emerald-400' :
                  entry.type === 'skip' ? 'text-amber-400' :
                  entry.type === 'register' ? 'text-blue-400' :
                  'text-zinc-400'
                }`}>{entry.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </section>
    </div>
  )
}

function LogBadge({ type }: { type: SchedulerLogEntry['type'] }): React.JSX.Element {
  const colors: Record<string, string> = {
    register: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    fire: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    skip: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    error: 'text-red-400 bg-red-500/10 border-red-500/20',
    info: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
    seed: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  }
  return (
    <span className={`px-1.5 py-px rounded-full shrink-0 text-[9px] font-medium border ${colors[type] ?? colors.info}`}>
      {type}
    </span>
  )
}

// ─── Task Form ──────────────────────────────────────────────

function TaskFormUI({
  form, setForm, onSave, onCancel, isEdit
}: {
  form: TaskForm
  setForm: (f: TaskForm) => void
  onSave: () => void
  onCancel: () => void
  isEdit: boolean
}): React.JSX.Element {
  const toggleWeekday = (day: number): void => {
    const next = form.weekdays.includes(day)
      ? form.weekdays.filter((d) => d !== day)
      : [...form.weekdays, day]
    setForm({ ...form, weekdays: next })
  }

  const nameEmpty = form.name.trim().length === 0
  const promptEmpty = form.prompt.trim().length === 0
  const canSave = !nameEmpty && !promptEmpty

  return (
    <div className="space-y-4 p-4 rounded-xl bg-zinc-800/20 border border-zinc-700/40">
      {/* Form header */}
      <div className="text-xs font-medium text-zinc-400">
        {isEdit ? 'Edit Task' : 'New Task'}
      </div>

      {/* Name + Prompt fields */}
      <div className="space-y-2.5">
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Name</label>
          <input type="text" placeholder="e.g. Daily Standup Summary" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={`w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-900/50 border text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all ${
              nameEmpty && form.name !== undefined
                ? 'border-zinc-700/50 focus:border-blue-500/50 focus:ring-blue-500/20'
                : 'border-zinc-700/50 focus:border-blue-500/50 focus:ring-blue-500/20'
            }`} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Prompt</label>
          <textarea placeholder="What should the agent do..." value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3}
            className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-900/50 border border-zinc-700/50 text-zinc-200 placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all resize-none" />
        </div>
      </div>

      {/* Frequency picker */}
      <div className="space-y-2">
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Frequency</label>
        <div className="flex gap-1 flex-wrap">
          {([
            ['once', 'Once', OnceIcon],
            ['daily', 'Daily', DailyIcon],
            ['weekly', 'Weekly', WeeklyIcon],
            ['interval', 'Interval', IntervalIcon],
            ['cron', 'Cron', CronIcon]
          ] as [Frequency, string, () => React.JSX.Element][]).map(([freq, label, Icon]) => (
            <Pill key={freq} active={form.frequency === freq} onClick={() => setForm({ ...form, frequency: freq })}>
              <span className="flex items-center gap-1.5">
                <Icon />
                {label}
              </span>
            </Pill>
          ))}
        </div>
      </div>

      {/* Start date + time (for once/daily/weekly) */}
      {form.frequency !== 'interval' && form.frequency !== 'cron' && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
            {form.frequency === 'once' ? 'Execution' : 'Start Date & Time'}
          </label>
          <div className="flex gap-2 items-center">
            <input type="date" value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="px-2 py-1.5 rounded-md text-xs bg-zinc-900/50 border border-zinc-700/50 text-zinc-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all" />
            <input type="time" value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="px-2 py-1.5 rounded-md text-xs bg-zinc-900/50 border border-zinc-700/50 text-zinc-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all" />
          </div>
        </div>
      )}

      {/* Weekly: weekday pill selector */}
      {form.frequency === 'weekly' && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Repeat on</label>
          <div className="flex gap-1">
            {WEEKDAY_LABELS.map(([num, label]) => (
              <button key={num} type="button" onClick={() => toggleWeekday(num)}
                className={`w-9 h-8 rounded-full text-xs font-medium transition-all duration-150 ${
                  form.weekdays.includes(num)
                    ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-sm shadow-blue-500/10'
                    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 hover:border-zinc-600/80 hover:text-zinc-400'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interval */}
      {form.frequency === 'interval' && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Interval</label>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-zinc-400">Every</span>
            <input type="number" min={1} max={1440} value={form.intervalMin}
              onChange={(e) => setForm({ ...form, intervalMin: parseInt(e.target.value) || 60 })}
              className="w-16 px-2 py-1.5 rounded-md text-xs bg-zinc-900/50 border border-zinc-700/50 text-zinc-200 text-center focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all" />
            <span className="text-xs text-zinc-400">Minutes</span>
          </div>
        </div>
      )}

      {/* Custom Cron */}
      {form.frequency === 'cron' && (
        <div className="space-y-1.5">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Cron Expression</label>
          <input type="text" placeholder="* * * * *" value={form.cronExpr}
            onChange={(e) => setForm({ ...form, cronExpr: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-md text-xs bg-zinc-900/50 border border-zinc-700/50 text-zinc-200 font-mono placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all" />
          <p className="text-[10px] text-zinc-600">min hour dom month dow</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-zinc-700/30">
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={onSave}
          disabled={!canSave}
          className="px-4 py-1.5 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          {isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  )
}

// ─── Shared UI ──────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <h2 className="flex-1 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/60 pb-2">{children}</h2>
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }): React.JSX.Element {
  return (
    <div className="flex gap-0.5 bg-zinc-800/50 rounded-lg p-0.5 border border-zinc-700/30">
      <button type="button" onClick={() => onChange('calendar')} title="Calendar"
        className={`px-2 py-1 rounded-md text-xs transition-all duration-150 ${mode === 'calendar' ? 'bg-zinc-700/80 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </button>
      <button type="button" onClick={() => onChange('list')} title="List"
        className={`px-2 py-1 rounded-md text-xs transition-all duration-150 ${mode === 'list' ? 'bg-zinc-700/80 text-zinc-200 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>
    </div>
  )
}

// ─── Icons ──────────────────────────────────────────────────

function EditIcon(): React.JSX.Element {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
}

function TrashIcon(): React.JSX.Element {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
}

function ClockIcon(): React.JSX.Element {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
}

function OnceIcon(): React.JSX.Element {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
}

function DailyIcon(): React.JSX.Element {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
}

function WeeklyIcon(): React.JSX.Element {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
}

function IntervalIcon(): React.JSX.Element {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" /></svg>
}

function CronIcon(): React.JSX.Element {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 16 4-4-4-4M6 8l-4 4 4 4M14.5 4l-5 16" /></svg>
}
