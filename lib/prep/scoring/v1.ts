// Deterministic preparation scoring, version 1. Pure functions: same input, same output.
// A new formula is a new file (v2.ts); stored snapshots keep the version they were computed with.
import type { Band, Indicator, MockResult, Stage, SyllabusNode, TopicStageName, TopicState } from '../types'
import { daysBetween, retention } from '../revision'

export const SCORING_VERSION = 'v1'

/** Thresholds are explicit so they can be shown in "Why?" and tested. */
export const V1 = {
  minTopicsForReadiness: 5,          // fewer touched topics in a stage -> "Not enough evidence"
  readinessCap: 95,                   // never display 100
  examReadyRevisions: 3,
  examReadyPyqAccuracy: 0.6,
  examReadyMinPyq: 5,
  csatQualifying: 66.67,              // 33% of 200
  csatMinTests: 3,
  csatRecentDays: 60,
  csatMargin: 10,
  weights: { touched: 0.2, foundation: 0.25, evidence: 0.3, revision: 0.25 },
  bands: [[15, 'Getting started'], [35, 'Building foundations'], [55, 'Developing'], [70, 'Exam-capable'], [85, 'Strong'], [Infinity, 'Highly prepared']] as [number, Band][],
} as const

export const foundationComplete = (s: TopicState) => Boolean(s.foundation.read && s.foundation.notes)
export const hasPracticeEvidence = (s: TopicState) => s.pyqAttempted > 0 || s.answersWritten > 0

/** The seven topic stages. Coverage never goes backwards; only retention can make a topic "Revision due". */
export function topicStage(s: TopicState | undefined, today: string): TopicStageName {
  if (!s || !s.touchedOn) return 'not_started'
  if (retention(s, today).status === 'overdue') return 'revision_due'
  if (!foundationComplete(s)) return 'touched'
  if (!hasPracticeEvidence(s)) return 'foundation_complete'
  if (s.revisionCount < 1) return 'practised'
  const accuracyOk = s.pyqAttempted >= V1.examReadyMinPyq && s.pyqCorrect / s.pyqAttempted >= V1.examReadyPyqAccuracy
  if (s.revisionCount >= V1.examReadyRevisions && accuracyOk) return 'exam_ready'
  return 'revision_current'
}

export function band(index: number): Band {
  return V1.bands.find(([upper]) => index < upper)![1]
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 1000) / 10
const leafTopics = (nodes: SyllabusNode[], stage?: Stage) => nodes.filter((n) => n.kind === 'topic' && (!stage || n.stages.includes(stage)))

interface Coverage { touched: number; foundation: number; evidence: number; revisionCurrent: number; touchedCount: number; total: number }

/** Weighted share of mapped topics at each level. */
function coverage(nodes: SyllabusNode[], states: Map<string, TopicState>, today: string, stage?: Stage): Coverage {
  const topics = leafTopics(nodes, stage)
  const total = topics.reduce((sum, n) => sum + n.weight, 0)
  let touched = 0, foundation = 0, evidence = 0, revisionCurrent = 0, touchedCount = 0
  for (const n of topics) {
    const s = states.get(n.id)
    if (!s?.touchedOn) continue
    touchedCount++
    touched += n.weight
    if (foundationComplete(s)) foundation += n.weight
    if (hasPracticeEvidence(s)) evidence += n.weight
    const r = retention(s, today).status
    if (s.revisionCount >= 1 && (r === 'current' || r === 'due_today')) revisionCurrent += n.weight
  }
  return { touched, foundation, evidence, revisionCurrent, touchedCount, total }
}

const notEnough = (key: string, unit: Indicator['unit'], reason: string): Indicator => ({ key, value: null, unit, band: null, reasons: [`Not enough evidence: ${reason}`], algorithmVersion: SCORING_VERSION })

/** Syllabus-level percentages. No logged topics at all -> "Not enough evidence", never 0%. */
export function coverageIndicators(nodes: SyllabusNode[], states: TopicState[], today: string): Indicator[] {
  const map = new Map(states.map((s) => [s.nodeId, s]))
  const c = coverage(nodes, map, today)
  const defs: [string, number, string][] = [
    ['syllabus_touched', c.touched, 'topics you have studied at least once'],
    ['foundation_completed', c.foundation, 'topics with the core source read and notes made'],
    ['evidence_backed', c.evidence, 'topics with PYQs or written answers logged'],
    ['revision_current', c.revisionCurrent, 'topics revised at least once and not overdue'],
  ]
  return defs.map(([key, value, meaning]) => c.touchedCount === 0 || c.total === 0
    ? notEnough(key, 'percent', 'no topics logged yet.')
    : { key, value: pct(value, c.total), unit: 'percent' as const, band: null, reasons: [`${pct(value, c.total)}% of mapped syllabus weight: ${meaning}.`], algorithmVersion: SCORING_VERSION })
}

/** Stage readiness index (0-95) and band, from coverage, foundation, practice evidence and revision. */
export function readiness(nodes: SyllabusNode[], states: TopicState[], stage: Stage, today: string): Indicator {
  const key = `${stage}_readiness`
  const c = coverage(nodes, new Map(states.map((s) => [s.nodeId, s])), today, stage)
  if (c.total === 0) return notEnough(key, 'index', `no ${stage} topics are mapped.`)
  if (c.touchedCount < V1.minTopicsForReadiness) return notEnough(key, 'index', `${c.touchedCount} of ${V1.minTopicsForReadiness} ${stage} topics needed have been logged.`)
  const w = V1.weights
  const parts = { touched: c.touched / c.total, foundation: c.foundation / c.total, evidence: c.evidence / c.total, revision: c.revisionCurrent / c.total }
  const raw = 100 * (w.touched * parts.touched + w.foundation * parts.foundation + w.evidence * parts.evidence + w.revision * parts.revision)
  const value = Math.min(V1.readinessCap, Math.round(raw))
  const reasons = [
    `Coverage ${Math.round(parts.touched * 100)}% (weight ${w.touched}), foundation ${Math.round(parts.foundation * 100)}% (weight ${w.foundation}), practice evidence ${Math.round(parts.evidence * 100)}% (weight ${w.evidence}), revision-current ${Math.round(parts.revision * 100)}% (weight ${w.revision}).`,
  ]
  if (raw > V1.readinessCap) reasons.push(`Capped at ${V1.readinessCap}: no one is described as 100% ready.`)
  return { key, value, unit: 'index', band: band(value), reasons, algorithmVersion: SCORING_VERSION }
}

/** CSAT safety from recent tests. One passing test is never called safe. */
export function csatSafety(mocks: MockResult[], today: string): Indicator & { status: 'safe' | 'borderline' | 'at_risk' | null } {
  const recent = mocks
    .filter((m) => m.stage === 'csat' && m.score !== null && m.maxScore && daysBetween(m.takenOn, today) <= V1.csatRecentDays && daysBetween(m.takenOn, today) >= 0)
    .map((m) => (m.score! / m.maxScore!) * 200)
  if (recent.length < V1.csatMinTests) return { ...notEnough('csat_safety', 'index', `${recent.length} of ${V1.csatMinTests} CSAT tests in the last ${V1.csatRecentDays} days.`), status: null }
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length
  const low = Math.min(...recent)
  const q = V1.csatQualifying
  const status = low >= q + V1.csatMargin ? 'safe' : low >= q ? 'borderline' : 'at_risk'
  return {
    key: 'csat_safety', value: Math.round(low - q), unit: 'index', band: null, status, algorithmVersion: SCORING_VERSION,
    reasons: [`Lowest of your last ${recent.length} CSAT tests: ${low.toFixed(1)}/200; average ${avg.toFixed(1)}. Qualifying mark ${q}. ${status === 'safe' ? `Lowest score is at least ${V1.csatMargin} marks above it.` : status === 'borderline' ? 'Lowest score clears it, but by less than the safety margin.' : 'At least one recent test fell below it.'}`],
  }
}
