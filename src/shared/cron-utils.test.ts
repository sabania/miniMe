import { describe, it, expect } from 'vitest'
import {
  buildCron,
  describeCron,
  parseCronToForm,
  cronMatchesDate,
  taskMatchesDate,
  expandRange
} from './cron-utils'
import type { TaskForm } from './cron-utils'
import type { ScheduledTask } from './types'

// ─── Helper ──────────────────────────────────────────────────

function makeForm(overrides: Partial<TaskForm>): TaskForm {
  return {
    name: 'test',
    prompt: 'do something',
    frequency: 'daily',
    startDate: '2026-03-15',
    startTime: '09:00',
    weekdays: [1, 2, 3, 4, 5],
    intervalMin: 60,
    cronExpr: '',
    ...overrides
  }
}

function makeTask(overrides: Partial<ScheduledTask>): ScheduledTask {
  return {
    id: 'task-1',
    name: 'Test Task',
    prompt: 'test prompt',
    cronExpr: '0 9 * * *',
    enabled: true,
    oneShot: false,
    startDate: null,
    lastRunAt: null,
    createdAt: '2026-01-01',
    ...overrides
  }
}

// ─── buildCron ───────────────────────────────────────────────

describe('buildCron', () => {
  it('once → specific day/month + time', () => {
    const cron = buildCron(makeForm({ frequency: 'once', startDate: '2026-03-15', startTime: '14:30' }))
    expect(cron).toBe('30 14 15 3 *')
  })

  it('once with leading zeros in date', () => {
    const cron = buildCron(makeForm({ frequency: 'once', startDate: '2026-01-05', startTime: '08:05' }))
    expect(cron).toBe('5 8 5 1 *')
  })

  it('daily → wildcard dom/month/dow', () => {
    const cron = buildCron(makeForm({ frequency: 'daily', startTime: '09:00' }))
    expect(cron).toBe('0 9 * * *')
  })

  it('daily at midnight', () => {
    const cron = buildCron(makeForm({ frequency: 'daily', startTime: '00:00' }))
    expect(cron).toBe('0 0 * * *')
  })

  it('weekly with selected weekdays → comma-separated dow', () => {
    const cron = buildCron(makeForm({ frequency: 'weekly', weekdays: [1, 3, 5], startTime: '10:30' }))
    expect(cron).toBe('30 10 * * 1,3,5')
  })

  it('weekly with all weekdays sorted', () => {
    const cron = buildCron(makeForm({ frequency: 'weekly', weekdays: [5, 1, 3], startTime: '09:00' }))
    expect(cron).toBe('0 9 * * 1,3,5')
  })

  it('weekly with no weekdays falls back to daily', () => {
    const cron = buildCron(makeForm({ frequency: 'weekly', weekdays: [], startTime: '09:00' }))
    expect(cron).toBe('0 9 * * *')
  })

  it('interval → */N format', () => {
    const cron = buildCron(makeForm({ frequency: 'interval', intervalMin: 15 }))
    expect(cron).toBe('*/15 * * * *')
  })

  it('cron → passthrough', () => {
    const cron = buildCron(makeForm({ frequency: 'cron', cronExpr: '0 */2 * * 1-5' }))
    expect(cron).toBe('0 */2 * * 1-5')
  })
})

// ─── describeCron ────────────────────────────────────────────

describe('describeCron', () => {
  it('interval minutes', () => {
    expect(describeCron('*/15 * * * *')).toBe('Alle 15 min')
    expect(describeCron('*/5 * * * *')).toBe('Alle 5 min')
  })

  it('interval hours', () => {
    expect(describeCron('*/60 * * * *')).toBe('Alle 1h')
    expect(describeCron('*/120 * * * *')).toBe('Alle 2h')
  })

  it('specific date (once)', () => {
    expect(describeCron('30 14 15 3 *')).toBe('Einmalig 15.3. 14:30')
  })

  it('daily', () => {
    expect(describeCron('0 9 * * *')).toBe('Täglich 09:00')
  })

  it('weekdays Mo-Fr', () => {
    expect(describeCron('0 9 * * 1,2,3,4,5')).toBe('Mo-Fr 09:00')
    expect(describeCron('0 9 * * 1-5')).toBe('Mo-Fr 09:00')
  })

  it('specific weekdays', () => {
    expect(describeCron('30 10 * * 1,3,5')).toBe('Mo, Mi, Fr 10:30')
  })

  it('all weekdays = Täglich', () => {
    expect(describeCron('0 8 * * 0,1,2,3,4,5,6')).toBe('Täglich 08:00')
  })

  it('interval with hour range', () => {
    expect(describeCron('*/30 7-23 * * *')).toBe('Alle 30 min (7-23 Uhr)')
    expect(describeCron('*/15 8-18 * * *')).toBe('Alle 15 min (8-18 Uhr)')
  })

  it('complex cron passthrough', () => {
    expect(describeCron('0 */2 * * 1-5')).toBe('0 */2 * * 1-5')
  })

  it('invalid cron passthrough', () => {
    expect(describeCron('not a cron')).toBe('not a cron')
  })

  it('pads single-digit hours/minutes', () => {
    expect(describeCron('5 8 * * *')).toBe('Täglich 08:05')
  })
})

// ─── parseCronToForm ─────────────────────────────────────────

describe('parseCronToForm', () => {
  it('interval → frequency + intervalMin', () => {
    const result = parseCronToForm('*/30 * * * *', false)
    expect(result.frequency).toBe('interval')
    expect(result.intervalMin).toBe(30)
  })

  it('specific date → once', () => {
    const result = parseCronToForm('30 14 15 3 *', false)
    expect(result.frequency).toBe('once')
    expect(result.startDate).toMatch(/\d{4}-03-15/)
    expect(result.startTime).toBe('14:30')
  })

  it('weekdays → weekly + weekday array', () => {
    const result = parseCronToForm('0 9 * * 1,3,5', false)
    expect(result.frequency).toBe('weekly')
    expect(result.weekdays).toEqual([1, 3, 5])
    expect(result.startTime).toBe('09:00')
  })

  it('weekday range → expanded', () => {
    const result = parseCronToForm('0 9 * * 1-5', false)
    expect(result.frequency).toBe('weekly')
    expect(result.weekdays).toEqual([1, 2, 3, 4, 5])
  })

  it('daily cron → daily', () => {
    const result = parseCronToForm('0 9 * * *', false)
    expect(result.frequency).toBe('daily')
    expect(result.startTime).toBe('09:00')
  })

  it('daily cron + oneShot → once', () => {
    const result = parseCronToForm('0 9 * * *', true)
    expect(result.frequency).toBe('once')
    expect(result.startTime).toBe('09:00')
  })

  it('complex cron → cron passthrough', () => {
    const result = parseCronToForm('*/30 7-23 * * *', false)
    expect(result.frequency).toBe('cron')
    expect(result.cronExpr).toBe('*/30 7-23 * * *')
  })

  it('step hour → cron passthrough', () => {
    const result = parseCronToForm('0 */2 * * *', false)
    expect(result.frequency).toBe('cron')
    expect(result.cronExpr).toBe('0 */2 * * *')
  })

  it('invalid cron → cron passthrough', () => {
    const result = parseCronToForm('invalid', false)
    expect(result.frequency).toBe('cron')
    expect(result.cronExpr).toBe('invalid')
  })
})

// ─── expandRange ─────────────────────────────────────────────

describe('expandRange', () => {
  it('expands 1-5', () => {
    expect(expandRange('1-5')).toEqual([1, 2, 3, 4, 5])
  })

  it('expands single-element range', () => {
    expect(expandRange('3-3')).toEqual([3])
  })

  it('expands 0-6 (full week)', () => {
    expect(expandRange('0-6')).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

// ─── cronMatchesDate ─────────────────────────────────────────

describe('cronMatchesDate', () => {
  it('daily cron matches any date', () => {
    expect(cronMatchesDate('0 9 * * *', new Date(2026, 2, 15))).toBe(true)
    expect(cronMatchesDate('0 9 * * *', new Date(2026, 5, 1))).toBe(true)
  })

  it('specific date matches only that day', () => {
    expect(cronMatchesDate('0 9 15 3 *', new Date(2026, 2, 15))).toBe(true) // Mar 15
    expect(cronMatchesDate('0 9 15 3 *', new Date(2026, 2, 16))).toBe(false) // Mar 16
    expect(cronMatchesDate('0 9 15 3 *', new Date(2026, 3, 15))).toBe(false) // Apr 15
  })

  it('weekday comma list', () => {
    // 2026-03-16 is Monday (dow=1), 2026-03-17 is Tuesday (dow=2)
    const monday = new Date(2026, 2, 16)
    const tuesday = new Date(2026, 2, 17)
    expect(cronMatchesDate('0 9 * * 1,3,5', monday)).toBe(true) // Mo
    expect(cronMatchesDate('0 9 * * 1,3,5', tuesday)).toBe(false) // Di
  })

  it('weekday range', () => {
    const monday = new Date(2026, 2, 16) // dow=1
    const saturday = new Date(2026, 2, 21) // dow=6
    expect(cronMatchesDate('0 9 * * 1-5', monday)).toBe(true)
    expect(cronMatchesDate('0 9 * * 1-5', saturday)).toBe(false)
  })

  it('single weekday', () => {
    const wednesday = new Date(2026, 2, 18) // dow=3
    expect(cronMatchesDate('0 9 * * 3', wednesday)).toBe(true)
    expect(cronMatchesDate('0 9 * * 4', wednesday)).toBe(false)
  })

  it('invalid cron returns false', () => {
    expect(cronMatchesDate('nope', new Date())).toBe(false)
  })
})

// ─── taskMatchesDate ─────────────────────────────────────────

describe('taskMatchesDate', () => {
  it('daily task matches any date', () => {
    const task = makeTask({ cronExpr: '0 9 * * *' })
    expect(taskMatchesDate(task, new Date(2026, 2, 15))).toBe(true)
  })

  it('respects startDate — before start returns false', () => {
    const task = makeTask({ cronExpr: '0 9 * * *', startDate: '2026-03-20' })
    expect(taskMatchesDate(task, new Date(2026, 2, 19))).toBe(false) // Mar 19 < Mar 20
    expect(taskMatchesDate(task, new Date(2026, 2, 20))).toBe(true)  // Mar 20 = start
    expect(taskMatchesDate(task, new Date(2026, 2, 25))).toBe(true)  // Mar 25 > start
  })

  it('weekly task with startDate', () => {
    // Mo,Mi,Fr — but only from March 18 (a Wednesday)
    const task = makeTask({ cronExpr: '0 9 * * 1,3,5', startDate: '2026-03-18' })
    const monday16 = new Date(2026, 2, 16) // Mo before start
    const wednesday18 = new Date(2026, 2, 18) // Mi = start day
    const friday20 = new Date(2026, 2, 20) // Fr after start
    expect(taskMatchesDate(task, monday16)).toBe(false) // before startDate
    expect(taskMatchesDate(task, wednesday18)).toBe(true)
    expect(taskMatchesDate(task, friday20)).toBe(true)
  })

  it('null startDate = no restriction', () => {
    const task = makeTask({ cronExpr: '0 9 * * *', startDate: null })
    expect(taskMatchesDate(task, new Date(2020, 0, 1))).toBe(true) // any past date
  })

  it('oneShot task matches only next occurrence', () => {
    // Daily cron but oneShot — should only match "today" (next occurrence)
    const task = makeTask({ cronExpr: '0 9 * * *', oneShot: true })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expect(taskMatchesDate(task, today)).toBe(true)

    // A date far in the future should NOT match (oneShot = only next occurrence)
    const farFuture = new Date(today)
    farFuture.setDate(farFuture.getDate() + 100)
    expect(taskMatchesDate(task, farFuture)).toBe(false)
  })

  it('specific date oneShot matches only that date', () => {
    const task = makeTask({ cronExpr: '0 9 25 3 *', oneShot: true })
    expect(taskMatchesDate(task, new Date(2026, 2, 25))).toBe(true)
    expect(taskMatchesDate(task, new Date(2026, 2, 26))).toBe(false)
  })

  it('disabled cron pattern does not match', () => {
    const task = makeTask({ cronExpr: '0 9 * * 1' }) // only Mondays
    const tuesday = new Date(2026, 2, 17) // Tuesday
    expect(taskMatchesDate(task, tuesday)).toBe(false)
  })
})

// ─── Roundtrip: buildCron → parseCronToForm ──────────────────

describe('buildCron ↔ parseCronToForm roundtrip', () => {
  it('daily roundtrips', () => {
    const form = makeForm({ frequency: 'daily', startTime: '10:45' })
    const cron = buildCron(form)
    const parsed = parseCronToForm(cron, false)
    expect(parsed.frequency).toBe('daily')
    expect(parsed.startTime).toBe('10:45')
  })

  it('weekly roundtrips', () => {
    const form = makeForm({ frequency: 'weekly', weekdays: [1, 3, 5], startTime: '08:30' })
    const cron = buildCron(form)
    const parsed = parseCronToForm(cron, false)
    expect(parsed.frequency).toBe('weekly')
    expect(parsed.weekdays).toEqual([1, 3, 5])
    expect(parsed.startTime).toBe('08:30')
  })

  it('interval roundtrips', () => {
    const form = makeForm({ frequency: 'interval', intervalMin: 45 })
    const cron = buildCron(form)
    const parsed = parseCronToForm(cron, false)
    expect(parsed.frequency).toBe('interval')
    expect(parsed.intervalMin).toBe(45)
  })

  it('once roundtrips', () => {
    const form = makeForm({ frequency: 'once', startDate: '2026-06-15', startTime: '14:00' })
    const cron = buildCron(form)
    const parsed = parseCronToForm(cron, false)
    expect(parsed.frequency).toBe('once')
    expect(parsed.startDate).toMatch(/-06-15$/)
    expect(parsed.startTime).toBe('14:00')
  })
})
