import type { ScheduledTask } from './types'

// ─── Types ──────────────────────────────────────────────────

export type Frequency = 'once' | 'daily' | 'weekly' | 'interval' | 'cron'

export interface TaskForm {
  name: string
  prompt: string
  frequency: Frequency
  startDate: string
  startTime: string
  weekdays: number[] // [1,3,5] = Mo, Mi, Fr
  intervalMin: number
  cronExpr: string
}

// ─── Cron Builders ──────────────────────────────────────────

export function buildCron(form: TaskForm): string {
  const [h, m] = form.startTime.split(':')
  const min = parseInt(m)
  const hour = parseInt(h)

  switch (form.frequency) {
    case 'once': {
      const [, mo, d] = form.startDate.split('-')
      return `${min} ${hour} ${parseInt(d)} ${parseInt(mo)} *`
    }
    case 'daily':
      return `${min} ${hour} * * *`
    case 'weekly': {
      if (form.weekdays.length === 0) return `${min} ${hour} * * *`
      const dow = [...form.weekdays].sort((a, b) => a - b).join(',')
      return `${min} ${hour} * * ${dow}`
    }
    case 'interval':
      return `*/${form.intervalMin} * * * *`
    case 'cron':
      return form.cronExpr
  }
}

export function describeCron(cronExpr: string): string {
  const parts = cronExpr.split(' ')
  if (parts.length !== 5) return cronExpr
  const [min, hour, dom, mon, dow] = parts

  // Pure interval: */N every hour
  if (min.startsWith('*/') && hour === '*') {
    const n = parseInt(min.slice(2))
    return n < 60 ? `Every ${n} min` : `Every ${Math.round(n / 60)}h`
  }

  // Interval with hour range: */N during specific hours
  if (min.startsWith('*/') && hour !== '*') {
    const n = parseInt(min.slice(2))
    const interval = n < 60 ? `Every ${n} min` : `Every ${Math.round(n / 60)}h`
    return `${interval} (${hour}h)`
  }

  // Need simple numeric min + hour for a readable time string
  if (!/^\d+$/.test(min) || !/^\d+$/.test(hour)) {
    return cronExpr
  }

  const timeStr = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`

  if (dom !== '*' && mon !== '*') {
    return `Once ${mon}/${dom} ${timeStr}`
  }

  if (dow !== '*') {
    const dayMap: Record<string, string> = { '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat' }
    if (dow === '1,2,3,4,5' || dow === '1-5') return `Mon-Fri ${timeStr}`
    if (dow === '0,1,2,3,4,5,6') return `Daily ${timeStr}`

    const days = dow.split(',').map((d) => dayMap[d] ?? d).join(', ')
    return `${days} ${timeStr}`
  }

  return `Daily ${timeStr}`
}

// ─── Cron Parsers ───────────────────────────────────────────

export function parseCronToForm(cronExpr: string, oneShot: boolean): Partial<TaskForm> {
  const parts = cronExpr.split(' ')
  if (parts.length !== 5) return { frequency: 'cron', cronExpr }
  const [min, hour, dom, mon, dow] = parts

  if (min.startsWith('*/') && hour === '*') {
    return { frequency: 'interval', intervalMin: parseInt(min.slice(2)) }
  }

  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`

  if (dom !== '*' && mon !== '*') {
    const now = new Date()
    return {
      frequency: 'once',
      startDate: `${now.getFullYear()}-${mon.padStart(2, '0')}-${dom.padStart(2, '0')}`,
      startTime: time
    }
  }

  if (dow !== '*') {
    const weekdays = dow.includes('-')
      ? expandRange(dow)
      : dow.split(',').map(Number)
    return { frequency: 'weekly', weekdays, startTime: time }
  }

  if (oneShot) {
    return { frequency: 'once', startTime: time }
  }

  // Only match "daily" if min and hour are simple numbers (no ranges, wildcards, steps)
  if (/^\d+$/.test(min) && /^\d+$/.test(hour)) {
    return { frequency: 'daily', startTime: time }
  }

  // Complex cron that doesn't fit simple categories
  return { frequency: 'cron', cronExpr }
}

export function expandRange(range: string): number[] {
  const [start, end] = range.split('-').map(Number)
  const result: number[] = []
  for (let i = start; i <= end; i++) result.push(i)
  return result
}

// ─── Date Matching ──────────────────────────────────────────

export function cronMatchesDate(cronExpr: string, date: Date): boolean {
  const parts = cronExpr.split(' ')
  if (parts.length !== 5) return false
  const [, , dom, mon, dow] = parts

  const d = date.getDate()
  const m = date.getMonth() + 1
  const w = date.getDay()

  if (dom !== '*' && mon !== '*') {
    return parseInt(dom) === d && parseInt(mon) === m
  }

  if (dow !== '*') {
    if (dow.includes(',')) {
      const days = dow.split(',').map(Number)
      if (!days.includes(w)) return false
    } else if (dow.includes('-')) {
      const [start, end] = dow.split('-').map(Number)
      if (w < start || w > end) return false
    } else {
      if (parseInt(dow) !== w) return false
    }
  }

  return true
}

export function getNextOccurrence(cronExpr: string): Date | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (let i = 0; i < 366; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    if (cronMatchesDate(cronExpr, date)) return date
  }
  return null
}

export function taskMatchesDate(task: ScheduledTask, date: Date): boolean {
  if (!cronMatchesDate(task.cronExpr, date)) return false
  if (task.startDate) {
    const start = new Date(task.startDate + 'T00:00:00')
    start.setHours(0, 0, 0, 0)
    const check = new Date(date)
    check.setHours(0, 0, 0, 0)
    if (check < start) return false
  }
  if (task.oneShot) {
    const next = getNextOccurrence(task.cronExpr)
    if (!next) return false
    return next.getFullYear() === date.getFullYear() &&
      next.getMonth() === date.getMonth() &&
      next.getDate() === date.getDate()
  }
  return true
}
