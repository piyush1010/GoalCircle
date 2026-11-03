// Builds today's draft-plan candidates from the syllabus and topic states (rule-based, deterministic).
import type { SyllabusNode, TopicState } from './types'
import type { Candidate } from './plan/v1'
import { retention } from './revision'
import { studyShares } from './scoring/v2'

export const MINUTES = { revision: 30, foundation: 45, newTopic: 60 } as const

export function planCandidates(nodes: SyllabusNode[], states: TopicState[], today: string, maxNew = 4): Candidate[] {
  const byId = new Map(states.map((s) => [s.nodeId, s]))
  const shares = studyShares(nodes, byId)
  const out: Candidate[] = []
  const fresh: SyllabusNode[] = []
  for (const n of nodes) {
    if (n.kind !== 'topic' || n.ownerId) continue
    const s = byId.get(n.id)
    const share = shares.get(n.id) ?? 0
    if (share === 0 && !s?.touchedOn) { fresh.push(n); continue }
    const r = s ? retention(s, today) : { status: 'not_scheduled' as const, daysOverdue: 0 }
    if (r.status === 'overdue') out.push({ nodeId: n.id, title: n.title, type: 'revision_overdue', minutes: MINUTES.revision, daysOverdue: r.daysOverdue, pyqFrequency: n.pyqFrequency, weight: n.weight })
    else if (r.status === 'due_today') out.push({ nodeId: n.id, title: n.title, type: 'revision_due', minutes: MINUTES.revision, pyqFrequency: n.pyqFrequency, weight: n.weight })
    else if (share < 1) out.push({ nodeId: n.id, title: n.title, type: 'carried_forward', minutes: MINUTES.foundation, pyqFrequency: n.pyqFrequency, weight: n.weight })
  }
  // A few new topics, most frequent in PYQs first, then syllabus order (stable by id).
  fresh.sort((a, b) => (b.pyqFrequency ?? 0) - (a.pyqFrequency ?? 0) || (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id))
  for (const n of fresh.slice(0, maxNew)) out.push({ nodeId: n.id, title: n.title, type: 'uncovered', minutes: MINUTES.newTopic, pyqFrequency: n.pyqFrequency, weight: n.weight })
  return out
}
