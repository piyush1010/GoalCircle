import { describe, expect, it } from 'vitest'
import { arrangeUnits, isCustom, moveUnit, orderedSubjects, orderLine, planSubjects, readOrder, unmoveUnit, SYLLABUS_ORDER } from '../order'
import { pacePlan, type Unit } from '../pace'

// Three subjects: History h1-h3, Polity p1-p2, Economy e1-e3.
const u = (id: string, subjectId: string): Unit => ({ id, title: id, topicId: id, topicTitle: id, paperTitle: 'GS', subjectId, subjectTitle: subjectId })
const units = [u('h1', 'H'), u('h2', 'H'), u('h3', 'H'), u('p1', 'P'), u('p2', 'P'), u('e1', 'E'), u('e2', 'E'), u('e3', 'E')]
const ids = (list: Unit[]) => list.map((x) => x.id)

describe('study order', () => {
  it('keeps the syllabus order when nothing is chosen', () => {
    expect(ids(arrangeUnits(units, null))).toEqual(['h1', 'h2', 'h3', 'p1', 'p2', 'e1', 'e2', 'e3'])
    expect(readOrder(null)).toBeNull()
    expect(readOrder({ mix: false, subjects: [], next: [], later: [] })).toBeNull()
    expect(readOrder('nonsense')).toBeNull()
  })

  it('puts subjects in the chosen order, keeping each subject in syllabus order', () => {
    expect(ids(arrangeUnits(units, { ...SYLLABUS_ORDER, subjects: ['E', 'P'] }))).toEqual(['e1', 'e2', 'e3', 'p1', 'p2', 'h1', 'h2', 'h3'])
  })

  it('mixes subjects: one from each in turn', () => {
    expect(ids(arrangeUnits(units, { ...SYLLABUS_ORDER, mix: true }))).toEqual(['h1', 'p1', 'e1', 'h2', 'p2', 'e2', 'h3', 'e3'])
    expect(ids(arrangeUnits(units, { ...SYLLABUS_ORDER, mix: true, subjects: ['P'] }))).toEqual(['p1', 'h1', 'e1', 'p2', 'h2', 'e2', 'h3', 'e3'])
  })

  it('moves single subtopics first or last, and back again', () => {
    let o = moveUnit(null, 'e3', 'next')
    o = moveUnit(o, 'h1', 'later')
    expect(ids(arrangeUnits(units, o))).toEqual(['e3', 'h2', 'h3', 'p1', 'p2', 'e1', 'e2', 'h1'])
    o = moveUnit(o, 'h1', 'next') // doing one undoes the other
    expect(o.later).toEqual([])
    expect(ids(arrangeUnits(units, o)).slice(0, 2)).toEqual(['e3', 'h1'])
    expect(isCustom(unmoveUnit(unmoveUnit(o, 'h1'), 'e3'))).toBe(false)
  })

  it('ignores subtopics and subjects that are no longer in the syllabus', () => {
    const o = readOrder({ mix: false, subjects: ['gone', 'P'], next: ['gone'], later: [1, 'p1'] })!
    expect(o.later).toEqual(['p1'])
    expect(ids(arrangeUnits(units, o))).toEqual(['p2', 'h1', 'h2', 'h3', 'e1', 'e2', 'e3', 'p1'])
    expect(arrangeUnits(units, o)).toHaveLength(units.length)
  })

  it('lists subjects for the order screen', () => {
    expect(planSubjects(units)).toEqual([{ id: 'H', title: 'H', count: 3 }, { id: 'P', title: 'P', count: 2 }, { id: 'E', title: 'E', count: 3 }])
    expect(orderedSubjects(planSubjects(units), { ...SYLLABUS_ORDER, subjects: ['E'] }).map((s) => s.id)).toEqual(['E', 'H', 'P'])
  })

  it('changes which subtopics come each day, not how many', () => {
    const plain = pacePlan(units, new Map(), '2026-11-16', '2026-11-16', '2026-11-20', 0)
    const mixed = pacePlan(arrangeUnits(units, { ...SYLLABUS_ORDER, mix: true }), new Map(), '2026-11-16', '2026-11-16', '2026-11-20', 0)
    expect(mixed.perDay).toBe(plain.perDay)
    expect(ids(plain.days[0].units)).toEqual(['h1', 'h2'])
    expect(ids(mixed.days[0].units)).toEqual(['h1', 'p1'])
  })

  it('says in one line what the order is', () => {
    expect(orderLine(null)).toBe('Following the syllabus order, one subject at a time.')
    expect(orderLine({ mix: true, subjects: ['E'], next: ['h1'], later: [] })).toBe('A few subjects each day, in your order of subjects. 1 subtopic moved by you.')
  })
})
