// Weekly review, weak areas and the mistake notebook. Pure functions over the student's own logs.
import type { SyllabusNode, TopicState } from './types'
import { studyShares, topicScore } from './scoring/v2'
import { addDays } from './revision'

export interface PrepEvent { occurredOn: string; kind: string; nodeId: string | null; quantity: number; undo: boolean; habit: string | null; minutes?: number | null }
export interface Mistake { id: string; nodeId: string | null; category: string; note: string | null; createdOn: string; resolvedOn: string | null }

export const MISTAKE_LABEL: Record<string, string> = {
  concept_not_studied: 'Concept not studied', fact_forgotten: 'Fact forgotten', misread_statement: 'Misread the statement',
  extreme_word: 'Missed an extreme word', similar_options: 'Confused similar options', overthinking: 'Overthinking',
  incorrect_elimination: 'Wrong elimination', current_affairs_gap: 'Current affairs gap', careless: 'Careless slip', blind_guess: 'Blind guess', other: 'Other',
}

export interface WeekStats { minutes: number; studyDays: number; ticks: number; revisions: number; pyqs: number; answers: number; mocks: number; newspaperDays: number }

/** This week (last 7 days, today included) against the 7 days before it. `units` = ids that count as one tick. */
export function weekReview(events: PrepEvent[], units: Set<string>, today: string): { thisWeek: WeekStats; lastWeek: WeekStats } {
  const stats = (from: string, to: string): WeekStats => {
    const inRange = events.filter((e) => e.occurredOn >= from && e.occurredOn <= to)
    const ticked = new Set<string>()
    for (const e of inRange) if (e.kind === 'studied' && !e.undo && e.nodeId && units.has(e.nodeId)) ticked.add(e.nodeId)
    const sum = (kind: string) => inRange.filter((e) => e.kind === kind).reduce((s, e) => s + e.quantity, 0)
    return {
      minutes: inRange.reduce((t, e) => t + (e.minutes ?? 0), 0),
      studyDays: new Set(inRange.map((e) => e.occurredOn)).size,
      ticks: ticked.size,
      revisions: inRange.filter((e) => e.kind === 'revised').length,
      pyqs: sum('pyq'), answers: sum('answers'), mocks: inRange.filter((e) => e.kind === 'mock').length,
      newspaperDays: new Set(inRange.filter((e) => e.kind === 'current_affairs' && e.habit === 'newspaper').map((e) => e.occurredOn)).size,
    }
  }
  return { thisWeek: stats(addDays(today, -6), today), lastWeek: stats(addDays(today, -13), addDays(today, -7)) }
}

export interface WeakTopic { nodeId: string; title: string; reasons: string[] }

/** Topics that need attention: low PYQ accuracy (10+ attempted, under 50%) or 2+ open mistakes. */
export function weakTopics(nodes: SyllabusNode[], states: Map<string, TopicState>, mistakes: Mistake[], limit = 5): WeakTopic[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const topicOf = (id: string | null) => { let n = id ? byId.get(id) : undefined; while (n && n.kind === 'subtopic' && n.parentId) n = byId.get(n.parentId); return n?.kind === 'topic' ? n : undefined }
  const open = new Map<string, number>()
  for (const m of mistakes) { if (m.resolvedOn) continue; const t = topicOf(m.nodeId); if (t) open.set(t.id, (open.get(t.id) ?? 0) + 1) }
  const out: (WeakTopic & { score: number })[] = []
  for (const n of nodes) {
    if (n.kind !== 'topic' || n.ownerId) continue
    const s = states.get(n.id), reasons: string[] = []
    let score = 0
    if (s && s.pyqAttempted >= 10 && s.pyqCorrect / s.pyqAttempted < 0.5) { const pct = Math.round((100 * s.pyqCorrect) / s.pyqAttempted); reasons.push(`PYQ accuracy ${pct}% (${s.pyqCorrect} of ${s.pyqAttempted}).`); score += 50 - pct }
    const m = open.get(n.id) ?? 0
    if (m >= 2) { reasons.push(`${m} open mistakes in your notebook.`); score += m * 10 }
    if (reasons.length) out.push({ nodeId: n.id, title: n.title, reasons, score })
  }
  return out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit).map(({ score: _score, ...w }) => w)
}

/** Open mistakes, oldest first, and the most common mistake types (all time). */
export function mistakeSummary(mistakes: Mistake[]): { open: Mistake[]; topTypes: { category: string; label: string; count: number }[] } {
  const counts = new Map<string, number>()
  for (const m of mistakes) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  return {
    open: mistakes.filter((m) => !m.resolvedOn).sort((a, b) => a.createdOn.localeCompare(b.createdOn)),
    topTypes: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([category, count]) => ({ category, label: MISTAKE_LABEL[category] ?? category, count })),
  }
}

/**
 * The overdue topics whose revision recovers the most preparation points, biggest first.
 * Points use the same formula as the preparation index, so "revise these 3 for +4" is exact.
 */
export function quickWins(nodes: SyllabusNode[], states: Map<string, TopicState>, today: string, limit = 3): { nodeId: string; title: string; points: number }[] {
  const shares = studyShares(nodes, states)
  const topics = nodes.filter((n) => n.kind === 'topic' && !n.ownerId)
  const total = topics.reduce((t, n) => t + n.weight, 0)
  if (!total) return []
  return topics.map((n) => {
    const s = states.get(n.id)
    const sc = topicScore(s, shares.get(n.id) ?? 0, today)
    return { nodeId: n.id, title: n.title, raw: (100 * n.weight * (sc.peak - sc.current)) / total }
  }).filter((x) => x.raw > 0.05).sort((a, b) => b.raw - a.raw || a.title.localeCompare(b.title)).slice(0, limit)
    .map(({ raw, ...x }) => ({ ...x, points: Math.max(1, Math.round(raw)) }))
}
