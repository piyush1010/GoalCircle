export const EXAMS = [
  { id: 'upsc', label: 'UPSC' },
  { id: 'ssc', label: 'SSC' },
  { id: 'state_psc', label: 'State PSC' },
  { id: 'banking', label: 'Banking' },
  { id: 'cat', label: 'CAT' },
  { id: 'jee', label: 'JEE' },
  { id: 'neet', label: 'NEET' },
  { id: 'clat', label: 'CLAT' },
  { id: 'gate', label: 'GATE' },
  { id: 'sat', label: 'SAT' },
  { id: 'other', label: 'Other' },
] as const

export type ExamId = (typeof EXAMS)[number]['id']

export function examLabel(id: string | null | undefined) {
  return EXAMS.find((exam) => exam.id === id)?.label ?? null
}

const DAY_END_KEY = 'goalyaar-day-ends-hour'

/** "My day ends at": 0 = midnight, up to 4 = 4 AM. Kept on the device and in the account. */
export function dayEndsHour(): number {
  if (typeof window === 'undefined') return 0
  try { const v = Number(window.localStorage.getItem(DAY_END_KEY) ?? 0); return Number.isInteger(v) && v >= 0 && v <= 4 ? v : 0 } catch { return 0 }
}
export function setDayEndsHourLocal(hour: number) {
  try { if (hour) window.localStorage.setItem(DAY_END_KEY, String(hour)); else window.localStorage.removeItem(DAY_END_KEY) } catch { /* device-only default */ }
}

/**
 * Today's date in the user's own time zone, as YYYY-MM-DD. With "my day ends at 3 AM",
 * 1 AM still counts as the day before, so late-night study lands on the day it belongs to.
 * A date passed in is converted as it is.
 */
export function localDateString(date = new Date(Date.now() - dayEndsHour() * 3_600_000)) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
