import { addDays } from './revision'

/** Consecutive days with any logged study, ending today (or yesterday, so the streak survives until tonight). */
export function studyStreak(days: string[], today: string): { current: number; studiedToday: boolean; week: { date: string; studied: boolean }[] } {
  const set = new Set(days)
  const studiedToday = set.has(today)
  let current = 0
  let cursor = studiedToday ? today : addDays(today, -1)
  while (set.has(cursor)) { current++; cursor = addDays(cursor, -1) }
  const week = Array.from({ length: 7 }, (_, i) => { const date = addDays(today, i - 6); return { date, studied: set.has(date) } })
  return { current, studiedToday, week }
}
