/**
 * Goal reports: what a personal goal counts (km, pages, minutes...) and how its weeks went.
 * Pure functions, so they're easy to test and the same on the goal page and Progress.
 */

export interface UnitChoice { id: string; label: string; ask: string }

/** The units offered when setting up a goal. People can also type their own word. */
export const UNITS: UnitChoice[] = [
  { id: 'km', label: 'Kilometres', ask: 'How many km?' },
  { id: 'minutes', label: 'Minutes', ask: 'How many minutes?' },
  { id: 'pages', label: 'Pages', ask: 'How many pages?' },
  { id: 'steps', label: 'Steps', ask: 'How many steps?' },
  { id: 'reps', label: 'Reps', ask: 'How many reps?' },
  { id: 'kg', label: 'Weight in kg', ask: 'Your weight today, in kg?' },
]

/** Units that make sense for a goal category, offered first. */
export function suggestedUnits(category: string | null | undefined): string[] {
  switch (category) {
    case 'fitness': return ['km', 'minutes', 'steps', 'reps', 'kg']
    case 'reading': return ['pages', 'minutes']
    case 'health': return ['minutes', 'kg', 'steps']
    case 'learning': return ['minutes', 'pages']
    default: return ['minutes', 'pages', 'km']
  }
}

/** Weight is a reading on the day, not something you add up over the week. */
export const isLevel = (unit: string | null | undefined) => unit === 'kg'

export function askFor(unit: string) {
  return UNITS.find((u) => u.id === unit)?.ask ?? `How many ${unit}?`
}

/** 12, 1.5, 0.25: no trailing zeros, Indian digit grouping for big numbers. */
export function formatAmount(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/** "12 km", "1 page", "40 pages", "70.5 kg" */
export function withUnit(n: number, unit: string) {
  const singular = n === 1 && unit.endsWith('s') && unit !== 'reps' ? unit.slice(0, -1) : n === 1 && unit === 'reps' ? 'rep' : unit
  return `${formatAmount(n)} ${singular}`
}

export interface CheckIn { created_at: string; amount?: number | string | null; checkin_status?: string | null; minutes_logged?: number | null }

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mondayOf = (d: Date) => { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m }

export interface WeekBar { start: string; label: string; days: number; amount: number | null; current: boolean }

export interface GoalReport {
  unit: string | null
  weeks: WeekBar[] // oldest first, the current week last
  thisWeek: WeekBar
  lastWeek: WeekBar
  monthDays: number // days checked in this month
  monthSoFar: number // days of this month so far
  bestRun: number // longest run of days in a row, ever
  summary: string // one plain sentence about this week
}

/**
 * Build the report from a goal's check-ins. Missed check-ins don't count. Several check-ins on one
 * day count as one day; their numbers add up (or, for weight, the last one counts).
 */
export function goalReport(checkIns: CheckIn[], unit: string | null, now = new Date(), weeksBack = 8): GoalReport {
  const counted = checkIns.filter((c) => c.checkin_status !== 'missed')
  const amountOf = (c: CheckIn) => {
    const raw = c.amount ?? (unit === 'minutes' ? c.minutes_logged : null)
    const n = raw === null || raw === undefined || raw === '' ? null : Number(raw)
    return n !== null && Number.isFinite(n) ? n : null
  }
  const days = new Set(counted.map((c) => dayKey(new Date(c.created_at))))

  const thisMonday = mondayOf(now)
  const weeks: WeekBar[] = []
  for (let i = weeksBack - 1; i >= 0; i--) {
    const start = new Date(thisMonday); start.setDate(start.getDate() - i * 7)
    const end = new Date(start); end.setDate(end.getDate() + 7)
    const inWeek = counted.filter((c) => { const t = new Date(c.created_at); return t >= start && t < end }).sort((a, b) => a.created_at.localeCompare(b.created_at))
    const amounts = inWeek.map(amountOf).filter((n): n is number => n !== null)
    const amount = !unit || amounts.length === 0 ? null : isLevel(unit) ? amounts[amounts.length - 1] : Math.round(amounts.reduce((s, n) => s + n, 0) * 100) / 100
    weeks.push({
      start: dayKey(start),
      label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      days: new Set(inWeek.map((c) => dayKey(new Date(c.created_at)))).size,
      amount, current: i === 0,
    })
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthDays = [...days].filter((k) => k >= dayKey(monthStart) && k <= dayKey(now)).length

  // Longest run of consecutive days.
  const sorted = [...days].sort()
  let bestRun = 0, run = 0, prev: Date | null = null
  for (const k of sorted) {
    const d = new Date(`${k}T12:00:00`)
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1
    bestRun = Math.max(bestRun, run); prev = d
  }

  const thisWeek = weeks[weeks.length - 1]
  const lastWeek = weeks[weeks.length - 2] ?? { start: '', label: '', days: 0, amount: null, current: false }
  return { unit, weeks, thisWeek, lastWeek, monthDays, monthSoFar: now.getDate(), bestRun, summary: weekSummary(thisWeek, lastWeek, unit) }
}

/** One sentence about this week compared with last. */
export function weekSummary(now: WeekBar, before: WeekBar, unit: string | null) {
  const dayWord = (n: number) => (n === 1 ? 'one day' : `${n} days`)
  if (now.days === 0) return before.days > 0 ? `Nothing logged yet this week. Last week you showed up on ${dayWord(before.days)}.` : 'Nothing logged yet this week.'
  if (unit && now.amount !== null) {
    if (isLevel(unit)) {
      if (before.amount === null) return `${withUnit(now.amount, unit)} at your last weigh-in.`
      const diff = Math.round((now.amount - before.amount) * 100) / 100
      return diff === 0 ? `${withUnit(now.amount, unit)}, the same as last week.` : `${withUnit(now.amount, unit)}, ${withUnit(Math.abs(diff), unit)} ${diff < 0 ? 'less' : 'more'} than last week.`
    }
    const base = `${withUnit(now.amount, unit)} this week, over ${dayWord(now.days)}.`
    if (before.amount === null || before.amount === 0) return base
    const diff = Math.round((now.amount - before.amount) * 100) / 100
    return diff === 0 ? `${base} The same as last week.` : `${base} That's ${withUnit(Math.abs(diff), unit)} ${diff > 0 ? 'more' : 'less'} than last week.`
  }
  const diff = now.days - before.days
  const base = `You showed up on ${dayWord(now.days)} this week.`
  if (before.days === 0) return base
  return diff === 0 ? `${base} The same as last week.` : `${base} That's ${dayWord(Math.abs(diff))} ${diff > 0 ? 'more' : 'fewer'} than last week.`
}
