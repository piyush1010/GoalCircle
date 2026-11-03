import { addDays } from './revision'

/**
 * Consecutive study days ending today (or yesterday, so the streak survives until tonight).
 * One rest day a week is allowed: a single missed day does not break the streak if no other
 * rest day was used in the 7 days after it. Rest days are not counted as study days.
 */
export function studyStreak(days: string[], today: string): { current: number; studiedToday: boolean; restDays: number; week: { date: string; studied: boolean }[] } {
  const set = new Set(days)
  const studiedToday = set.has(today)
  let current = 0, restDays = 0
  let lastRest: string | null = null
  let cursor = studiedToday ? today : addDays(today, -1)
  for (;;) {
    if (set.has(cursor)) { current++; cursor = addDays(cursor, -1); continue }
    const before = addDays(cursor, -1)
    const restAllowed = current > 0 && set.has(before) && (lastRest === null || addDays(cursor, 7) <= lastRest)
    if (!restAllowed) break
    restDays++; lastRest = cursor; cursor = before
  }
  const week = Array.from({ length: 7 }, (_, i) => { const date = addDays(today, i - 6); return { date, studied: set.has(date) } })
  return { current, studiedToday, restDays, week }
}
