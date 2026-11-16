import { describe, expect, it } from 'vitest'
import { goalReport, weekSummary, withUnit } from '@/lib/goalReport'

// Wednesday 18 November 2026, midday. This week starts Monday 16 Nov.
const now = new Date(2026, 10, 18, 12)
const at = (d: number, m = 10) => new Date(2026, m, d, 7).toISOString()

describe('goal reports', () => {
  it('adds up a week of runs and compares with last week', () => {
    const r = goalReport([
      { created_at: at(16), amount: 5 }, { created_at: at(17), amount: '4.5' }, { created_at: at(17), amount: 1 },
      { created_at: at(18), amount: null }, { created_at: at(15), amount: 9, checkin_status: 'missed' },
      { created_at: at(10), amount: 6 }, { created_at: at(12), amount: 2 },
    ], 'km', now)
    expect(r.thisWeek.days).toBe(3)
    expect(r.thisWeek.amount).toBe(10.5)
    expect(r.lastWeek.amount).toBe(8)
    expect(r.weeks).toHaveLength(8)
    expect(r.summary).toBe("10.5 km this week, over 3 days. That's 2.5 km more than last week.")
    expect(r.bestRun).toBe(3)
    expect(r.monthDays).toBe(5)
  })
  it('uses the last weigh-in for weight', () => {
    const r = goalReport([{ created_at: at(16), amount: 71.2 }, { created_at: at(18), amount: 70.8 }, { created_at: at(11), amount: 71.5 }], 'kg', now)
    expect(r.thisWeek.amount).toBe(70.8)
    expect(r.summary).toBe('70.8 kg, 0.7 kg less than last week.')
  })
  it('counts days when nothing is measured', () => {
    const r = goalReport([{ created_at: at(16) }, { created_at: at(9) }, { created_at: at(10) }], null, now)
    expect(r.thisWeek.amount).toBeNull()
    expect(r.summary).toBe("You showed up on one day this week. That's one day fewer than last week.")
  })
  it('says so plainly when the week is empty', () => {
    expect(weekSummary({ start: '', label: '', days: 0, amount: null, current: true }, { start: '', label: '', days: 4, amount: null, current: false }, 'km')).toBe('Nothing logged yet this week. Last week you showed up on 4 days.')
  })
  it('writes units naturally', () => {
    expect(withUnit(1, 'pages')).toBe('1 page')
    expect(withUnit(1, 'reps')).toBe('1 rep')
    expect(withUnit(12000, 'steps')).toBe('12,000 steps')
    expect(withUnit(1, 'km')).toBe('1 km')
  })
})
