// Revision engine v1. Mirrors public.prep_next_interval() in
// supabase/migrations/202611070001_prep_foundation.sql. Change both together, as a new version.

export const REVISION_VERSION = 'v1'

/** Days until the next revision, given how many revisions are already done. */
export function nextIntervalDays(revisionsDone: number): number {
  if (revisionsDone <= 0) return 3
  if (revisionsDone === 1) return 7
  if (revisionsDone === 2) return 15
  if (revisionsDone === 3) return 30
  return Math.min(90, Math.round(30 * Math.pow(1.5, revisionsDone - 3)))
}

const DAY = 86_400_000
export const toDay = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
export const daysBetween = (from: string, to: string) => Math.round((toDay(to) - toDay(from)) / DAY)
export const addDays = (iso: string, days: number) => new Date(toDay(iso) + days * DAY).toISOString().slice(0, 10)

export type RetentionStatus = 'not_scheduled' | 'current' | 'due_today' | 'overdue'

/** Where a topic stands on its revision schedule on `today`. */
export function retention(state: { nextRevisionOn: string | null; lastRevisedOn: string | null; touchedOn: string | null; intervalDays: number | null }, today: string): { status: RetentionStatus; daysOverdue: number; reason: string } {
  if (!state.nextRevisionOn) return { status: 'not_scheduled', daysOverdue: 0, reason: 'No revision scheduled yet.' }
  const diff = daysBetween(state.nextRevisionOn, today)
  const since = state.lastRevisedOn ?? state.touchedOn
  const ago = since ? daysBetween(since, today) : null
  const what = state.lastRevisedOn ? 'last revised' : 'first studied'
  const base = ago === null ? '' : `${what[0].toUpperCase()}${what.slice(1)} ${ago} day${ago === 1 ? '' : 's'} ago; current revision interval is ${state.intervalDays ?? '?'} days.`
  if (diff < 0) return { status: 'current', daysOverdue: 0, reason: `${base} Next revision on ${state.nextRevisionOn}.`.trim() }
  if (diff === 0) return { status: 'due_today', daysOverdue: 0, reason: `${base} Revision is due today.`.trim() }
  return { status: 'overdue', daysOverdue: diff, reason: `${base} Revision is ${diff} day${diff === 1 ? '' : 's'} overdue.`.trim() }
}
