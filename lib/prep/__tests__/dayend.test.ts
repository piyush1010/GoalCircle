import { describe, expect, it } from 'vitest'
import { dayEndsHour, localDateString } from '@/lib/exams'

// A minimal browser storage, so the device setting can be read.
const store = new Map<string, string>()
;(globalThis as unknown as { window: unknown }).window = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) } }

describe('my day ends at', () => {
  it('defaults to midnight', () => {
    store.clear()
    expect(dayEndsHour()).toBe(0)
    expect(localDateString()).toBe(localDateString(new Date()))
  })
  it('counts the early hours as the day before', () => {
    store.set('goalyaar-day-ends-hour', '3')
    expect(dayEndsHour()).toBe(3)
    expect(localDateString()).toBe(localDateString(new Date(Date.now() - 3 * 3_600_000)))
  })
  it('ignores values outside midnight to 4 AM', () => {
    store.set('goalyaar-day-ends-hour', '9')
    expect(dayEndsHour()).toBe(0)
  })
  it('converts a given date unchanged', () => {
    store.set('goalyaar-day-ends-hour', '3')
    const d = new Date(2026, 10, 10, 1, 30)
    expect(localDateString(d)).toBe('2026-11-10')
  })
})
