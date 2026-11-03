// Rule-based draft plan, version 1. Deterministic: same candidates and budget -> same plan.
// Nothing here is saved or applied; the student accepts, edits or removes every item.
export const PLAN_VERSION = 'v1'

export type CandidateType = 'mentor_task' | 'revision_overdue' | 'revision_due' | 'carried_forward' | 'mock_weakness' | 'uncovered'
export interface Candidate { nodeId: string; title: string; type: CandidateType; minutes: number; daysOverdue?: number; pyqFrequency?: number | null; weight?: number }
export interface PlanItem extends Candidate { bucket: 'must' | 'should' | 'can_defer'; reason: string; score: number }

const BASE: Record<CandidateType, number> = { mentor_task: 100, revision_overdue: 80, revision_due: 60, carried_forward: 50, mock_weakness: 45, uncovered: 30 }

/** Priority score: type first, then how overdue, how often it appears in PYQs, and its syllabus weight. */
export function priority(c: Candidate): number {
  return BASE[c.type] + Math.min(c.daysOverdue ?? 0, 30) + (c.pyqFrequency ?? 0) * 2 + (c.weight ?? 1)
}

function reason(c: Candidate): string {
  switch (c.type) {
    case 'mentor_task': return 'Assigned by your mentor.'
    case 'revision_overdue': return `Revision is ${c.daysOverdue} day${c.daysOverdue === 1 ? '' : 's'} overdue.`
    case 'revision_due': return 'Revision is due today.'
    case 'carried_forward': return 'Started; some subtopics are not ticked yet.'
    case 'mock_weakness': return 'Came up as a weak area in a recent mock.'
    case 'uncovered': return `Not started yet${c.pyqFrequency ? `; appears often in PYQs (${c.pyqFrequency}/5)` : ''}.`
  }
}

/**
 * Orders candidates and fills the day's minutes. Items that fit are "must" (mentor tasks and overdue revision)
 * or "should"; anything beyond the budget is "can_defer". `lighter` halves the budget (the "lighter plan" option).
 */
export function draftPlan(candidates: Candidate[], budgetMinutes: number, options: { lighter?: boolean } = {}): PlanItem[] {
  const budget = options.lighter ? Math.floor(budgetMinutes / 2) : budgetMinutes
  const ordered = [...candidates].sort((a, b) => priority(b) - priority(a) || a.nodeId.localeCompare(b.nodeId) || a.type.localeCompare(b.type))
  let used = 0
  return ordered.map((c) => {
    const fits = used + c.minutes <= budget
    if (fits) used += c.minutes
    const bucket: PlanItem['bucket'] = !fits ? 'can_defer' : c.type === 'mentor_task' || c.type === 'revision_overdue' ? 'must' : 'should'
    return { ...c, bucket, reason: reason(c), score: priority(c) }
  })
}
