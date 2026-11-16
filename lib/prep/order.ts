// The student's own study order for one exam. Saved on the plan; null means the syllabus order.
// Only the order changes: how many subtopics a day, and the dates, are worked out exactly as before.
import type { Unit } from './pace'

export interface StudyOrder {
  mix: boolean // a little of several subjects each day, instead of one subject at a time
  subjects: string[] // subject ids, in the order the student chose; subjects not listed follow in syllabus order
  next: string[] // subtopics to do before anything else, in this order
  later: string[] // subtopics moved to the end of the plan, in this order
}

export const SYLLABUS_ORDER: StudyOrder = { mix: false, subjects: [], next: [], later: [] }

const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 2000) : [])

/** Read the saved value; anything unexpected counts as the syllabus order. */
export function readOrder(raw: unknown): StudyOrder | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const r = raw as Record<string, unknown>
  const order = { mix: r.mix === true, subjects: ids(r.subjects), next: ids(r.next), later: ids(r.later) }
  return isCustom(order) ? order : null
}

export const isCustom = (o: StudyOrder | null | undefined) => Boolean(o && (o.mix || o.subjects.length || o.next.length || o.later.length))

const subjectKey = (u: Unit) => u.subjectId ?? u.paperTitle

/** Subjects in the plan, in syllabus order, with how many subtopics each has. */
export function planSubjects(units: Unit[]): { id: string; title: string; count: number }[] {
  const out = new Map<string, { id: string; title: string; count: number }>()
  for (const u of units) {
    const k = subjectKey(u)
    const cur = out.get(k)
    if (cur) cur.count++
    else out.set(k, { id: k, title: u.subjectTitle ?? u.paperTitle, count: 1 })
  }
  return [...out.values()]
}

/** Subjects in the student's chosen order (the ones they never moved stay in syllabus order after). */
export function orderedSubjects<T extends { id: string }>(subjects: T[], order: StudyOrder | null): T[] {
  const pos = new Map((order?.subjects ?? []).map((id, i) => [id, i]))
  return subjects.map((s, i) => ({ s, i })).sort((a, b) => (pos.get(a.s.id) ?? 1e6 + a.i) - (pos.get(b.s.id) ?? 1e6 + b.i)).map((x) => x.s)
}

/**
 * Put the units in the student's order. Within a subject the syllabus order is kept, so topics still
 * build on each other. Mixed: one subtopic from each subject in turn. Then "do next" ones go first and
 * "move to the end" ones go last.
 */
export function arrangeUnits(units: Unit[], order: StudyOrder | null): Unit[] {
  if (!isCustom(order) || !order) return units
  const groups = new Map<string, Unit[]>()
  for (const u of units) { const k = subjectKey(u); const g = groups.get(k); if (g) g.push(u); else groups.set(k, [u]) }
  const lists = orderedSubjects([...groups.entries()].map(([id, list]) => ({ id, list })), order).map((g) => g.list)
  let out: Unit[]
  if (order.mix) {
    out = []
    for (let i = 0; out.length < units.length; i++) for (const l of lists) if (l[i]) out.push(l[i])
  } else out = lists.flat()
  const byId = new Map(out.map((u) => [u.id, u]))
  const next = order.next.filter((id) => byId.has(id))
  const later = order.later.filter((id) => byId.has(id) && !next.includes(id))
  const moved = new Set([...next, ...later])
  return [...next.map((id) => byId.get(id)!), ...out.filter((u) => !moved.has(u.id)), ...later.map((id) => byId.get(id)!)]
}

/** Move one subtopic to the front, or to the end. Doing one undoes the other. */
export function moveUnit(order: StudyOrder | null, id: string, where: 'next' | 'later'): StudyOrder {
  const o = order ?? SYLLABUS_ORDER
  const next = o.next.filter((x) => x !== id)
  const later = o.later.filter((x) => x !== id)
  return where === 'next' ? { ...o, next: [...next, id], later } : { ...o, next, later: [...later, id] }
}

/** Put a subtopic back where the order would place it anyway. */
export function unmoveUnit(order: StudyOrder | null, id: string): StudyOrder {
  const o = order ?? SYLLABUS_ORDER
  return { ...o, next: o.next.filter((x) => x !== id), later: o.later.filter((x) => x !== id) }
}

/** One sentence for the plan screen. */
export function orderLine(order: StudyOrder | null) {
  if (!isCustom(order) || !order) return 'Following the syllabus order, one subject at a time.'
  const parts = [order.mix ? 'A few subjects each day' : 'One subject at a time']
  if (order.subjects.length) parts.push('in your order of subjects')
  const moved = order.next.length + order.later.length
  return `${parts.join(', ')}.${moved ? ` ${moved} ${moved === 1 ? 'subtopic' : 'subtopics'} moved by you.` : ''}`
}
