// Preparation scoring, version 2. Pure and deterministic.
// - Study progress comes from ticked subtopics: a topic's study share = ticked official subtopics / all of them.
// - Coverage never goes down. "Current preparation" fades for topics whose revision is overdue and comes back
//   as soon as they are revised.
import type { Band, Indicator, Stage, SyllabusNode, TopicStageName, TopicState } from '../types'
import { daysBetween, retention } from '../revision'
import { band as bandV1, hasPracticeEvidence, V1 } from './v1'

export const SCORING_VERSION = 'v2'

export const V2 = {
  minTopicsForReadiness: 5,
  readinessCap: 95,
  parts: { study: 0.4, practice: 0.3, revised: 0.3 },
  // An overdue topic loses strength linearly until it reaches the floor, over max(14 days, 2 x its interval).
  decayFloor: 0.25,
  decayMinDays: 14,
} as const

export const band = (index: number): Band => bandV1(index)

/** Study share per official topic: ticked official subtopics / total; topics without subtopics count 1 once studied. */
export function studyShares(nodes: SyllabusNode[], states: Map<string, TopicState>): Map<string, number> {
  const subs = new Map<string, SyllabusNode[]>()
  for (const n of nodes) if (n.kind === 'subtopic' && !n.ownerId && n.parentId) {
    if (!subs.has(n.parentId)) subs.set(n.parentId, [])
    subs.get(n.parentId)!.push(n)
  }
  const out = new Map<string, number>()
  for (const n of nodes) {
    if (n.kind !== 'topic' || n.ownerId) continue
    const list = subs.get(n.id)
    out.set(n.id, list?.length ? list.filter((s) => states.get(s.id)?.touchedOn).length / list.length : states.get(n.id)?.touchedOn ? 1 : 0)
  }
  return out
}

/** 1 = fresh. Falls once the next revision date has passed; never below the floor. */
export function retentionStrength(s: TopicState | undefined, today: string): number {
  if (!s?.touchedOn || !s.nextRevisionOn) return 1
  const overdue = daysBetween(s.nextRevisionOn, today)
  if (overdue <= 0) return 1
  const span = Math.max(V2.decayMinDays, 2 * (s.intervalDays ?? 7))
  return Math.max(V2.decayFloor, 1 - (overdue / span) * (1 - V2.decayFloor))
}

/** One topic's score (0-1) today, and what it would be if its revision were up to date. */
export function topicScore(s: TopicState | undefined, share: number, today: string): { current: number; peak: number; strength: number } {
  const p = V2.parts
  const practice = s && hasPracticeEvidence(s) ? 1 : 0
  const revised = s && s.revisionCount >= 1 ? 1 : 0
  const peak = p.study * share + p.practice * practice + p.revised * revised
  const strength = retentionStrength(s, today)
  return { current: strength * peak, peak, strength }
}

/** The seven stages, driven by subtopic ticks. Coverage never goes backwards; only retention makes a topic "Revision due". */
export function topicStage(s: TopicState | undefined, share: number, today: string): TopicStageName {
  if (share === 0 && !(s && hasPracticeEvidence(s))) return 'not_started'
  if (s && retention(s, today).status === 'overdue') return 'revision_due'
  if (share < 1) return 'touched'
  if (!s || !hasPracticeEvidence(s)) return 'foundation_complete'
  if (s.revisionCount < 1) return 'practised'
  const accuracyOk = s.pyqAttempted >= V1.examReadyMinPyq && s.pyqCorrect / s.pyqAttempted >= V1.examReadyPyqAccuracy
  return s.revisionCount >= V1.examReadyRevisions && accuracyOk ? 'exam_ready' : 'revision_current'
}

export interface Readiness extends Indicator { peak: number | null; overdueTopics: number; touchedTopics: number; totalTopics: number }

const topicsFor = (nodes: SyllabusNode[], stage?: Stage) => nodes.filter((n) => n.kind === 'topic' && !n.ownerId && (!stage || n.stages.includes(stage)))

/** Preparation index (0-95) for a stage, or overall. `peak` = the index with every overdue revision done. */
export function preparation(nodes: SyllabusNode[], states: TopicState[], today: string, stage?: Stage): Readiness {
  const key = stage ? `${stage}_readiness` : 'overall_preparation'
  const byId = new Map(states.map((s) => [s.nodeId, s]))
  const shares = studyShares(nodes, byId)
  const topics = topicsFor(nodes, stage)
  const total = topics.reduce((sum, n) => sum + n.weight, 0)
  let current = 0, peak = 0, touched = 0, overdue = 0
  for (const n of topics) {
    const s = byId.get(n.id)
    const share = shares.get(n.id) ?? 0
    if (share === 0 && !(s && hasPracticeEvidence(s))) continue
    touched++
    const t = topicScore(s, share, today)
    current += n.weight * t.current
    peak += n.weight * t.peak
    if (t.strength < 1) overdue++
  }
  const base = { key, unit: 'index' as const, algorithmVersion: SCORING_VERSION, overdueTopics: overdue, touchedTopics: touched, totalTopics: topics.length }
  if (total === 0) return { ...base, value: null, band: null, peak: null, reasons: [`Not enough evidence: no ${stage ?? 'syllabus'} topics are mapped.`] }
  if (touched < V2.minTopicsForReadiness) return { ...base, value: null, band: null, peak: null, reasons: [`Not enough evidence: ${touched} of ${V2.minTopicsForReadiness}${stage ? ` ${stage}` : ''} topics needed have been started.`] }
  const cap = (x: number) => Math.min(V2.readinessCap, Math.round((100 * x) / total))
  const value = cap(current), best = cap(peak)
  const reasons = [`${touched} of ${topics.length} topics started. Each topic counts for subtopics studied (40%), practice with PYQs or answers (30%) and revision (30%).`]
  if (best > value) reasons.push(`${overdue} topic${overdue === 1 ? ' is' : 's are'} overdue for revision, which costs ${best - value} point${best - value === 1 ? '' : 's'}. Revising ${overdue === 1 ? 'it' : 'them'} brings you back to ${best}.`)
  else reasons.push('All your revisions are on schedule.')
  if (Math.round((100 * peak) / total) > V2.readinessCap) reasons.push(`Capped at ${V2.readinessCap}: no one is described as 100% ready.`)
  return { ...base, value, band: band(value), peak: best, reasons }
}

/** Coverage measures (whole-number %, by syllabus weight). Coverage never fades. */
export function coverage(nodes: SyllabusNode[], states: TopicState[], today: string): Indicator[] {
  const byId = new Map(states.map((s) => [s.nodeId, s]))
  const shares = studyShares(nodes, byId)
  const topics = topicsFor(nodes)
  const total = topics.reduce((sum, n) => sum + n.weight, 0)
  let studied = 0, complete = 0, evidence = 0, revision = 0, any = false
  for (const n of topics) {
    const s = byId.get(n.id), share = shares.get(n.id) ?? 0
    if (share > 0) any = true
    studied += n.weight * share
    if (share === 1) complete += n.weight
    if (s && hasPracticeEvidence(s)) { evidence += n.weight; any = true }
    const r = s ? retention(s, today).status : 'not_scheduled'
    if (s && s.revisionCount >= 1 && (r === 'current' || r === 'due_today')) revision += n.weight
  }
  const pct = (x: number) => Math.round((100 * x) / total)
  const defs: [string, number, string][] = [
    ['syllabus_touched', studied, 'of all official subtopics are ticked as studied'],
    ['foundation_completed', complete, 'of topics have every subtopic ticked'],
    ['evidence_backed', evidence, 'of topics have PYQs or written answers logged'],
    ['revision_current', revision, 'of topics are revised at least once and not overdue'],
  ]
  return defs.map(([key, value, meaning]) => !any || total === 0
    ? { key, value: null, unit: 'percent' as const, band: null, reasons: ['Not enough evidence: tick the subtopics you have studied to start.'], algorithmVersion: SCORING_VERSION }
    : { key, value: pct(value), unit: 'percent' as const, band: null, reasons: [`${pct(value)}% ${meaning} (weighted by syllabus weight).`], algorithmVersion: SCORING_VERSION })
}
