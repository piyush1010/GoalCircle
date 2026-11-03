// Time-bound study planner ("finish Prelims in 5 months"). Deterministic and recomputed every day:
// fall behind and the daily target rises; get ahead and it falls. A revision window is kept free at the end.
import type { Stage, SyllabusNode, TopicState } from './types'
import { childrenMap } from './explorer'
import { addDays, daysBetween } from './revision'

export const PACE_VERSION = 'v1'
export interface Unit { id: string; title: string; topicId: string; topicTitle: string; paperTitle: string }

/** Study units for a stage, in syllabus order: each official subtopic, or the topic itself if it has none. */
export function studyUnits(nodes: SyllabusNode[], stage: Stage, opts: { skipPapers?: (paper: SyllabusNode) => boolean } = {}): Unit[] {
  const kids = childrenMap(nodes)
  const out: Unit[] = []
  const roots = (kids.get('') ?? []).filter((r) => r.kind === 'stage' && r.stages.includes(stage) && r.stages.length === 1)
  for (const root of roots) for (const paper of kids.get(root.id) ?? []) {
    if (opts.skipPapers?.(paper)) continue
    for (const subject of kids.get(paper.id) ?? []) for (const topic of kids.get(subject.id) ?? []) {
      if (topic.kind !== 'topic' || topic.ownerId) continue
      const subs = (kids.get(topic.id) ?? []).filter((s) => s.kind === 'subtopic' && !s.ownerId)
      if (subs.length) for (const s of subs) out.push({ id: s.id, title: s.title, topicId: topic.id, topicTitle: topic.title, paperTitle: paper.title })
      else out.push({ id: topic.id, title: topic.title, topicId: topic.id, topicTitle: topic.title, paperTitle: paper.title })
    }
  }
  return out
}

export interface PacePlan {
  total: number; done: number; remaining: number
  daysLeft: number; studyDaysLeft: number; revisionDays: number
  perDay: number; topicsToday: number
  doneToday: number
  expectedByToday: number; behindBy: number
  status: 'on_track' | 'slightly_behind' | 'behind' | 'revision_window' | 'complete' | 'past'
  days: { date: string; units: Unit[] }[]
  reasons: string[]
  version: string
}

/**
 * @param bufferPct share of the whole period kept for revision at the end (default 15%).
 */
export function pacePlan(units: Unit[], states: Map<string, TopicState>, today: string, startOn: string, targetOn: string, bufferPct = 15, horizon = 7): PacePlan {
  const ticked = (u: Unit) => Boolean(states.get(u.id)?.touchedOn)
  const done = units.filter(ticked).length
  const doneToday = units.filter((u) => states.get(u.id)?.touchedOn === today).length
  const total = units.length, remaining = total - done
  const totalDays = Math.max(1, daysBetween(startOn, targetOn))
  const revisionDays = Math.round((totalDays * bufferPct) / 100)
  const daysLeft = daysBetween(today, targetOn)
  const studyDaysLeft = Math.max(0, daysLeft - revisionDays)
  const studyDaysTotal = Math.max(1, totalDays - revisionDays)
  // Units still to do at the start of today, spread over the study days left (today included).
  const remainingAtStart = remaining + doneToday
  const perDay = studyDaysLeft > 0 ? Math.ceil(remainingAtStart / studyDaysLeft) : remainingAtStart
  const elapsed = Math.min(studyDaysTotal, Math.max(0, daysBetween(startOn, today)))
  const expectedByToday = Math.round((total * elapsed) / studyDaysTotal)
  const behindBy = Math.max(0, expectedByToday - (done - doneToday))
  const status: PacePlan['status'] = remaining === 0 ? 'complete' : daysLeft < 0 ? 'past' : studyDaysLeft === 0 ? 'revision_window'
    : behindBy === 0 ? 'on_track' : behindBy <= perDay * 2 ? 'slightly_behind' : 'behind'

  // Lay out the next days: today gets what's left of today's target, later days a full target each.
  const queue = units.filter((u) => !ticked(u))
  const days: PacePlan['days'] = []
  let cursor = 0
  for (let i = 0; i < horizon && cursor < queue.length && i < Math.max(1, studyDaysLeft); i++) {
    const take = i === 0 ? Math.max(0, perDay - doneToday) : perDay
    days.push({ date: addDays(today, i), units: queue.slice(cursor, cursor + take) })
    cursor += take
  }
  const topicsToday = new Set((days[0]?.units ?? []).map((u) => u.topicId)).size

  const reasons = [
    `${remaining} of ${total} subtopics left, ${studyDaysLeft} study day${studyDaysLeft === 1 ? '' : 's'} left before a ${revisionDays}-day revision window (${bufferPct}% of your plan).`,
    `${remainingAtStart} ÷ ${Math.max(1, studyDaysLeft)} days = ${perDay} a day, rounded up.`,
  ]
  if (behindBy > 0 && status !== 'complete') reasons.push(`To be on schedule you would have ${expectedByToday} done by today; you are ${behindBy} behind, so the daily target has gone up.`)
  return { total, done, remaining, daysLeft, studyDaysLeft, revisionDays, perDay, topicsToday, doneToday, expectedByToday, behindBy, status, days, reasons, version: PACE_VERSION }
}

/**
 * The student's plan from their saved settings; null until an exam date is set.
 * Optional papers count only for the optional subject the student picked (Mains).
 */
export function planFor(nodes: SyllabusNode[], states: Map<string, TopicState>, settings: { examDate: string | null; planStartOn: string | null; targetStage: 'prelims' | 'mains'; revisionBufferPct: number; optionalSubjectId?: string | null }, today: string): (PacePlan & { units: Unit[] }) | null {
  if (!settings.examDate) return null
  const parent = new Map(nodes.map((n) => [n.id, n.parentId]))
  const isOpt = (p: SyllabusNode) => (p.code ?? '').endsWith('.OPT')
  const optional = settings.optionalSubjectId ?? null
  const units = studyUnits(nodes, settings.targetStage).filter((u) => {
    const subject = parent.get(u.topicId) ?? null
    const paper = subject ? nodes.find((n) => n.id === parent.get(subject)) : undefined
    return !paper || !isOpt(paper) || (optional !== null && subject === optional)
  })
  const start = settings.planStartOn && settings.planStartOn <= today ? settings.planStartOn : today
  return { ...pacePlan(units, states, today, start, settings.examDate, settings.revisionBufferPct), units }
}

/** Optional subjects of an exam (subjects under a paper coded *.OPT), in syllabus order. */
export function optionalSubjects(nodes: SyllabusNode[]): SyllabusNode[] {
  const optPapers = new Set(nodes.filter((n) => n.kind === 'paper' && (n.code ?? '').endsWith('.OPT')).map((n) => n.id))
  return nodes.filter((n) => n.kind === 'subject' && n.parentId !== null && optPapers.has(n.parentId)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
}
