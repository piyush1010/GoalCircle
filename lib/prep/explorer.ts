// Syllabus explorer helpers: tree building, progress roll-ups and plain-language stage labels. Pure functions.
import type { SyllabusNode, TopicStageName, TopicState } from './types'
import { retention } from './revision'
import { foundationComplete, hasPracticeEvidence, topicStage, V1 } from './scoring/v1'

export const STAGE_LABEL: Record<TopicStageName, string> = {
  not_started: 'Not started',
  touched: 'Touched',
  foundation_complete: 'Foundation complete',
  practised: 'Practised',
  revision_current: 'Revision current',
  exam_ready: 'Exam-ready',
  revision_due: 'Revision due',
}

/** Children of each node, in syllabus order. Root nodes are under the key ''. */
export function childrenMap(nodes: SyllabusNode[]): Map<string, SyllabusNode[]> {
  const map = new Map<string, SyllabusNode[]>()
  for (const n of nodes) {
    const key = n.parentId ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(n)
  }
  for (const list of map.values()) list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.title.localeCompare(b.title))
  return map
}

export interface Rollup { topics: number; touched: number; foundation: number; due: number }

/**
 * Progress under every node, counting official topics only (custom subtopics are notes under a topic,
 * not extra syllabus). Counts never go down with time except "due".
 */
export function rollups(nodes: SyllabusNode[], states: TopicState[], today: string): Map<string, Rollup> {
  const byId = new Map(states.map((s) => [s.nodeId, s]))
  const kids = childrenMap(nodes)
  const out = new Map<string, Rollup>()
  const visit = (n: SyllabusNode): Rollup => {
    const r: Rollup = { topics: 0, touched: 0, foundation: 0, due: 0 }
    if (n.kind === 'topic') {
      const s = byId.get(n.id)
      r.topics = 1
      if (s?.touchedOn) r.touched = 1
      if (s && foundationComplete(s)) r.foundation = 1
      if (topicStage(s, today) === 'revision_due') r.due = 1
    } else {
      for (const c of kids.get(n.id) ?? []) {
        const cr = visit(c)
        r.topics += cr.topics; r.touched += cr.touched; r.foundation += cr.foundation; r.due += cr.due
      }
    }
    out.set(n.id, r)
    return r
  }
  for (const root of kids.get('') ?? []) visit(root)
  return out
}

/** Why a topic is at its stage, and what moves it forward. Shown under "Why?" on the topic sheet. */
export function stageExplanation(s: TopicState | undefined, today: string): { stage: TopicStageName; reasons: string[]; next: string | null } {
  const stage = topicStage(s, today)
  const reasons: string[] = []
  if (!s || !s.touchedOn) return { stage, reasons: ['Nothing logged for this topic yet.'], next: 'Log "Studied" when you first read it.' }
  reasons.push(`First studied on ${s.touchedOn}.`)
  const f = s.foundation
  reasons.push(foundationComplete(s) ? 'Foundation: core source read and notes made.' : `Foundation: ${[f.read ? null : 'core source not marked read', f.notes ? null : 'notes not marked done'].filter(Boolean).join(', ')}.`)
  reasons.push(hasPracticeEvidence(s) ? `Practice: ${s.pyqAttempted} PYQs (${s.pyqCorrect} correct), ${s.answersWritten} answers written.` : 'Practice: no PYQs or answers logged yet.')
  reasons.push(retention(s, today).reason)
  const next: Record<TopicStageName, string | null> = {
    not_started: null,
    touched: 'Mark the core source read and your notes done.',
    foundation_complete: 'Log PYQs or an answer on this topic.',
    practised: 'Revise it once.',
    revision_current: `Keep revising on schedule; ${V1.examReadyRevisions} revisions and ${Math.round(V1.examReadyPyqAccuracy * 100)}% PYQ accuracy (${V1.examReadyMinPyq}+ PYQs) make it exam-ready.`,
    exam_ready: 'Keep revising on schedule to stay exam-ready.',
    revision_due: 'Revise it to bring it back on schedule. Your coverage is kept.',
  }
  return { stage, reasons, next: next[stage] }
}
