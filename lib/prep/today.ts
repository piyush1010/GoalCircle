// Today's slides: everything due today in one ordered list, across every exam the student prepares for.
// Order: the mentor's task, revisions (oldest first), new study, then personal goals.
import type { SyllabusNode, TopicState } from './types'
import { planFor } from './pace'
import { retention } from './revision'

export type TaskKind = 'mentor' | 'revise' | 'study' | 'goal'
export interface Task { key: string; kind: TaskKind; title: string; subtitle: string; exam: string | null; nodeId?: string; goalId?: string; circleId?: string; done: boolean }
export interface PlanInput { templateId: string; short: string; nodes: SyllabusNode[]; settings: { examDate: string | null; planStartOn: string | null; targetStage: 'prelims' | 'mains'; revisionBufferPct: number; optionalSubjectId?: string | null } }

export function todayTasks(input: {
  plans: PlanInput[]
  states: Map<string, TopicState>
  today: string
  goals?: { id: string; title: string; done: boolean; detail: string }[]
  mentor?: { circleId: string; name: string; task: string; done: boolean }[]
  maxRevisions?: number
}): Task[] {
  const { plans, states, today } = input
  const multi = plans.length > 1
  const seen = new Set<string>() // official codes already on the list (shared subtopics count once)
  const once = (code: string | null, id: string) => { const k = code ?? id; if (seen.has(k)) return false; seen.add(k); return true }

  const revise: (Task & { overdue: number })[] = []
  const study: Task[] = []
  for (const p of plans) {
    const byId = new Map(p.nodes.map((n) => [n.id, n]))
    for (const n of p.nodes) {
      if (n.kind !== 'topic' || n.ownerId) continue
      const s = states.get(n.id)
      if (!s?.touchedOn) continue
      const revisedToday = s.lastRevisedOn === today
      const r = retention(s, today)
      if (!revisedToday && r.status !== 'overdue' && r.status !== 'due_today') continue
      if (!once(n.code, n.id)) continue
      revise.push({ key: `r:${n.id}`, kind: 'revise', title: n.title, subtitle: revisedToday ? 'Revised today' : r.status === 'due_today' ? 'Revision due today' : `Revision ${r.daysOverdue} day${r.daysOverdue === 1 ? '' : 's'} overdue`, exam: multi ? p.short : null, nodeId: n.id, done: revisedToday, overdue: revisedToday ? -1 : r.daysOverdue })
    }
    const plan = planFor(p.nodes, states, p.settings, today)
    if (!plan) continue
    const doneToday = plan.units.filter((u) => states.get(u.id)?.touchedOn === today)
    const todo = plan.days[0]?.date === today ? plan.days[0].units : []
    for (const [u, done] of [...doneToday.map((u) => [u, true] as const), ...todo.map((u) => [u, false] as const)]) {
      if (!once(byId.get(u.id)?.code ?? null, u.id)) continue
      study.push({ key: `s:${u.id}`, kind: 'study', title: u.title, subtitle: u.topicTitle === u.title ? u.paperTitle : u.topicTitle, exam: multi ? p.short : null, nodeId: u.id, done })
    }
  }
  const max = input.maxRevisions ?? 5
  const openRevise = revise.filter((t) => !t.done).sort((a, b) => b.overdue - a.overdue).slice(0, max)
  const doneRevise = revise.filter((t) => t.done)

  const mentor: Task[] = (input.mentor ?? []).map((m) => ({ key: `m:${m.circleId}`, kind: 'mentor', title: m.task, subtitle: `From your mentor · ${m.name}`, exam: null, circleId: m.circleId, done: m.done }))
  const goals: Task[] = (input.goals ?? []).map((g) => ({ key: `g:${g.id}`, kind: 'goal', title: g.title, subtitle: g.detail, exam: null, goalId: g.id, done: g.done }))
  const strip = (t: Task & { overdue: number }): Task => ({ key: t.key, kind: t.kind, title: t.title, subtitle: t.subtitle, exam: t.exam, nodeId: t.nodeId, done: t.done })
  const all = [...mentor, ...openRevise.map(strip), ...doneRevise.map(strip), ...study, ...goals]
  // Open tasks first, finished ones after, keeping the order within each group.
  return [...all.filter((t) => !t.done), ...all.filter((t) => t.done)]
}
