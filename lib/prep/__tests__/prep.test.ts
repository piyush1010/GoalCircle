import { describe, expect, it } from 'vitest'
import { addDays, nextIntervalDays, retention, REVISION_VERSION } from '../revision'
import { band, coverageIndicators, csatSafety, readiness, SCORING_VERSION, topicStage, V1 } from '../scoring/v1'
import { draftPlan, PLAN_VERSION, priority, type Candidate } from '../plan/v1'
import type { SyllabusNode, TopicState } from '../types'

const TODAY = '2026-11-01'
const node = (id: string, stages: ('prelims' | 'mains')[] = ['prelims'], weight = 1): SyllabusNode => ({ id, parentId: 'S', kind: 'topic', code: id, title: `Topic ${id}`, stages, papers: [], weight, pyqFrequency: null })
const state = (nodeId: string, over: Partial<TopicState> = {}): TopicState => ({ nodeId, touchedOn: '2026-10-01', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: 3, nextRevisionOn: '2026-11-20', pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0, ...over })
const NODES = Array.from({ length: 10 }, (_, i) => node(`T${i}`))

describe('revision intervals', () => {
  it('follows 3, 7, 15, 30 then x1.5 capped at 90', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(nextIntervalDays)).toEqual([3, 7, 15, 30, 45, 68, 90, 90])
  })
  it('explains overdue revisions in plain words', () => {
    const r = retention({ touchedOn: '2026-10-01', lastRevisedOn: '2026-10-16', intervalDays: 14, nextRevisionOn: '2026-10-30' }, TODAY)
    expect(r.status).toBe('overdue')
    expect(r.daysOverdue).toBe(2)
    expect(r.reason).toBe('Last revised 16 days ago; current revision interval is 14 days. Revision is 2 days overdue.')
  })
  it('marks due today and current correctly', () => {
    expect(retention({ touchedOn: '2026-10-29', lastRevisedOn: null, intervalDays: 3, nextRevisionOn: TODAY }, TODAY).status).toBe('due_today')
    expect(retention({ touchedOn: '2026-10-31', lastRevisedOn: null, intervalDays: 3, nextRevisionOn: '2026-11-03' }, TODAY).status).toBe('current')
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
  })
})

describe('topic stages and readiness decline', () => {
  it('walks through the stages as evidence is added', () => {
    expect(topicStage(undefined, TODAY)).toBe('not_started')
    expect(topicStage(state('a'), TODAY)).toBe('touched')
    expect(topicStage(state('a', { foundation: { read: true, notes: true } }), TODAY)).toBe('foundation_complete')
    expect(topicStage(state('a', { foundation: { read: true, notes: true }, answersWritten: 2 }), TODAY)).toBe('practised')
    expect(topicStage(state('a', { foundation: { read: true, notes: true }, answersWritten: 2, revisionCount: 1 }), TODAY)).toBe('revision_current')
    expect(topicStage(state('a', { foundation: { read: true, notes: true }, pyqAttempted: 10, pyqCorrect: 7, revisionCount: 3 }), TODAY)).toBe('exam_ready')
  })
  it('an exam-ready topic becomes "revision due" when overdue, without losing coverage', () => {
    const ready = state('T0', { foundation: { read: true, notes: true }, pyqAttempted: 10, pyqCorrect: 8, revisionCount: 3, lastRevisedOn: '2026-10-01', intervalDays: 30, nextRevisionOn: '2026-10-31' })
    expect(topicStage(ready, '2026-10-31')).toBe('exam_ready')
    expect(topicStage(ready, TODAY)).toBe('revision_due')
    const touchedBefore = coverageIndicators(NODES, [ready], '2026-10-31')[0].value
    const touchedAfter = coverageIndicators(NODES, [ready], TODAY)[0].value
    expect(touchedAfter).toBe(touchedBefore)
  })
  it('readiness declines when revisions go overdue', () => {
    const fresh = NODES.slice(0, 6).map((n) => state(n.id, { foundation: { read: true, notes: true }, answersWritten: 1, revisionCount: 2, lastRevisedOn: '2026-10-25', intervalDays: 15, nextRevisionOn: '2026-11-09' }))
    const before = readiness(NODES, fresh, 'prelims', TODAY).value!
    const later = readiness(NODES, fresh, 'prelims', '2026-11-20').value!
    expect(later).toBeLessThan(before)
  })
})

describe('missing evidence', () => {
  it('shows "Not enough evidence" instead of zero', () => {
    for (const ind of coverageIndicators(NODES, [], TODAY)) {
      expect(ind.value).toBeNull()
      expect(ind.reasons[0]).toMatch(/^Not enough evidence/)
    }
    const few = readiness(NODES, [state('T0'), state('T1')], 'prelims', TODAY)
    expect(few.value).toBeNull()
    expect(few.band).toBeNull()
    expect(few.reasons[0]).toBe('Not enough evidence: 2 of 5 prelims topics needed have been logged.')
    expect(readiness(NODES, [], 'mains', TODAY).reasons[0]).toBe('Not enough evidence: no mains topics are mapped.')
  })
  it('never calls CSAT safe on fewer than three recent tests', () => {
    const one = csatSafety([{ stage: 'csat', takenOn: '2026-10-20', score: 150, maxScore: 200 }], TODAY)
    expect(one.value).toBeNull()
    expect(one.status).toBeNull()
  })
})

describe('deterministic scoring and bands', () => {
  const states = NODES.map((n, i) => state(n.id, { foundation: { read: true, notes: i < 8 }, answersWritten: i < 5 ? 2 : 0, revisionCount: i < 4 ? 1 : 0, lastRevisedOn: i < 4 ? '2026-10-28' : null, nextRevisionOn: '2026-11-04' }))
  it('gives the same result for the same input, in any order', () => {
    const a = readiness(NODES, states, 'prelims', TODAY)
    const b = readiness([...NODES].reverse(), [...states].reverse(), 'prelims', TODAY)
    expect(b).toEqual(a)
    // 100 * (0.2*1 + 0.25*0.8 + 0.3*0.5 + 0.25*0.4) = 65
    expect(a.value).toBe(65)
    expect(a.band).toBe('Exam-capable')
  })
  it('maps index edges to the six bands', () => {
    expect([0, 14, 15, 34, 35, 54, 55, 69, 70, 84, 85, 95].map(band)).toEqual(['Getting started', 'Getting started', 'Building foundations', 'Building foundations', 'Developing', 'Developing', 'Exam-capable', 'Exam-capable', 'Strong', 'Strong', 'Highly prepared', 'Highly prepared'])
  })
  it('never shows 100', () => {
    const perfect = NODES.map((n) => state(n.id, { foundation: { read: true, notes: true }, pyqAttempted: 10, pyqCorrect: 10, revisionCount: 4, lastRevisedOn: '2026-10-30', nextRevisionOn: '2026-12-14' }))
    const r = readiness(NODES, perfect, 'prelims', TODAY)
    expect(r.value).toBe(V1.readinessCap)
    expect(r.reasons).toContain(`Capped at ${V1.readinessCap}: no one is described as 100% ready.`)
  })
  it('shows whole numbers only (no false precision)', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const [touched] = coverageIndicators(nodes, [state('a')], TODAY)
    expect(touched.value).toBe(33)
  })
  it('weights topics by syllabus weight', () => {
    const nodes = [node('H', ['prelims'], 3), node('L', ['prelims'], 1)]
    const [touched] = coverageIndicators(nodes, [state('H')], TODAY)
    expect(touched.value).toBe(75)
  })
})

describe('explanations', () => {
  it('every indicator says why', () => {
    const states = NODES.map((n) => state(n.id, { foundation: { read: true, notes: true } }))
    for (const ind of [...coverageIndicators(NODES, states, TODAY), readiness(NODES, states, 'prelims', TODAY)]) {
      expect(ind.reasons.length).toBeGreaterThan(0)
      expect(ind.reasons.join(' ')).not.toMatch(/undefined|NaN/)
    }
    expect(readiness(NODES, states, 'prelims', TODAY).reasons[0]).toMatch(/^Coverage 100% \(weight 0.2\), foundation 100% \(weight 0.25\)/)
  })
  it('CSAT explains the lowest score against the qualifying mark', () => {
    const tests = [150, 140, 72].map((s, i) => ({ stage: 'csat' as const, takenOn: `2026-10-2${i}`, score: s, maxScore: 200 }))
    const r = csatSafety(tests, TODAY)
    expect(r.status).toBe('borderline')
    expect(r.reasons[0]).toBe('Lowest of your last 3 CSAT tests: 72.0/200; average 120.7. Qualifying mark 66.67. Lowest score clears it, but by less than the safety margin.')
  })
})

describe('draft plan prioritisation', () => {
  const c = (nodeId: string, type: Candidate['type'], minutes = 30, extra: Partial<Candidate> = {}): Candidate => ({ nodeId, title: nodeId, type, minutes, ...extra })
  const candidates = [c('U1', 'uncovered', 60, { pyqFrequency: 5 }), c('R1', 'revision_due'), c('O1', 'revision_overdue', 30, { daysOverdue: 4 }), c('M1', 'mentor_task', 45), c('O2', 'revision_overdue', 30, { daysOverdue: 12 })]
  it('puts mentor tasks, then most-overdue revision first, and fits the budget', () => {
    const plan = draftPlan(candidates, 150)
    expect(plan.map((p) => p.nodeId)).toEqual(['M1', 'O2', 'O1', 'R1', 'U1'])
    expect(plan.map((p) => p.bucket)).toEqual(['must', 'must', 'must', 'should', 'can_defer'])
    expect(plan[1].reason).toBe('Revision is 12 days overdue.')
  })
  it('lighter plan halves the budget and defers the rest', () => {
    const plan = draftPlan(candidates, 150, { lighter: true })
    expect(plan.filter((p) => p.bucket !== 'can_defer').map((p) => p.nodeId)).toEqual(['M1', 'O2'])
  })
  it('is stable for ties and independent of input order', () => {
    const ties = [c('B', 'uncovered'), c('A', 'uncovered')]
    expect(draftPlan(ties, 60).map((p) => p.nodeId)).toEqual(['A', 'B'])
    expect(draftPlan([...candidates].reverse(), 150)).toEqual(draftPlan(candidates, 150))
    expect(priority(c('X', 'uncovered', 30, { pyqFrequency: 5 }))).toBe(41)
  })
})

describe('algorithm versioning', () => {
  it('stamps every output with its version', () => {
    expect([SCORING_VERSION, REVISION_VERSION, PLAN_VERSION]).toEqual(['v1', 'v1', 'v1'])
    for (const ind of coverageIndicators(NODES, [state('T0')], TODAY)) expect(ind.algorithmVersion).toBe('v1')
    expect(readiness(NODES, [], 'prelims', TODAY).algorithmVersion).toBe('v1')
  })
})
