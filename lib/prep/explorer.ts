// Syllabus explorer helpers: tree building, progress roll-ups and plain-language stage labels. Pure functions.
import type { SyllabusNode, TopicStageName, TopicState } from './types'
import { retention } from './revision'
import { hasPracticeEvidence, V1 } from './scoring/v1'
import { studyShares, topicStage } from './scoring/v2'

export const STAGE_LABEL: Record<TopicStageName, string> = {
  not_started: 'Not started',
  touched: 'In progress',
  foundation_complete: 'Studied',
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

export interface Rollup { topics: number; subtopics: number; ticked: number; complete: number; due: number }

/** Progress under every node: official subtopics ticked, topics fully studied, revisions due. */
export function rollups(nodes: SyllabusNode[], states: TopicState[], today: string): Map<string, Rollup> {
  const byId = new Map(states.map((s) => [s.nodeId, s]))
  const shares = studyShares(nodes, byId)
  const kids = childrenMap(nodes)
  const out = new Map<string, Rollup>()
  const visit = (n: SyllabusNode): Rollup => {
    const r: Rollup = { topics: 0, subtopics: 0, ticked: 0, complete: 0, due: 0 }
    if (n.kind === 'topic') {
      const official = (kids.get(n.id) ?? []).filter((c) => c.kind === 'subtopic' && !c.ownerId)
      const share = shares.get(n.id) ?? 0
      r.topics = 1
      r.subtopics = official.length || 1
      r.ticked = official.length ? official.filter((c) => byId.get(c.id)?.touchedOn).length : share
      if (share === 1) r.complete = 1
      if (topicStage(byId.get(n.id), share, today) === 'revision_due') r.due = 1
    } else {
      for (const c of kids.get(n.id) ?? []) {
        if (c.kind === 'subtopic') continue
        const cr = visit(c)
        r.topics += cr.topics; r.subtopics += cr.subtopics; r.ticked += cr.ticked; r.complete += cr.complete; r.due += cr.due
      }
    }
    out.set(n.id, r)
    return r
  }
  for (const root of kids.get('') ?? []) visit(root)
  return out
}

/** Why a topic is at its stage, and what moves it forward. Shown under "Why?" on the topic sheet. */
export function stageExplanation(s: TopicState | undefined, share: number, subtopics: { ticked: number; total: number }, today: string): { stage: TopicStageName; reasons: string[]; next: string | null } {
  const stage = topicStage(s, share, today)
  const reasons: string[] = []
  reasons.push(subtopics.total > 1 || subtopics.ticked > 1 ? `Subtopics studied: ${subtopics.ticked} of ${subtopics.total}.` : share === 1 ? 'Studied.' : 'Not studied yet.')
  if (s && hasPracticeEvidence(s)) reasons.push(`Practice: ${s.pyqAttempted} PYQs (${s.pyqCorrect} correct), ${s.answersWritten} answers written.`)
  else if (share > 0) reasons.push('Practice: no PYQs or answers logged yet.')
  if (s?.touchedOn) reasons.push(retention(s, today).reason)
  const next: Record<TopicStageName, string | null> = {
    not_started: 'Tick a subtopic when you study it.',
    touched: 'Tick the remaining subtopics as you study them.',
    foundation_complete: 'Log PYQs or an answer on this topic.',
    practised: 'Revise it once.',
    revision_current: `Keep revising on schedule; ${V1.examReadyRevisions} revisions and ${Math.round(V1.examReadyPyqAccuracy * 100)}% PYQ accuracy (${V1.examReadyMinPyq}+ PYQs) make it exam-ready.`,
    exam_ready: 'Keep revising on schedule to stay exam-ready.',
    revision_due: 'Revise it to bring it back on schedule. Your ticks are kept.',
  }
  return { stage, reasons, next: next[stage] }
}
