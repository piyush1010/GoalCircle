import { describe, expect, it } from 'vitest'
import { coverage, preparation, retentionStrength, SCORING_VERSION, studyShares, topicScore, topicStage, V2 } from '../scoring/v2'
import { planCandidates } from '../candidates'
import { draftPlan } from '../plan/v1'
import type { SyllabusNode, TopicState } from '../types'

const TODAY = '2026-11-01'
const node = (id: string, kind: SyllabusNode['kind'] = 'topic', parentId = 'S', pyq: number | null = null): SyllabusNode => ({ id, parentId, kind, code: id, title: id, stages: ['prelims'], papers: [], weight: 1, pyqFrequency: pyq })
const state = (nodeId: string, over: Partial<TopicState> = {}): TopicState => ({ nodeId, touchedOn: '2026-10-01', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: 3, nextRevisionOn: '2026-11-20', pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0, ...over })
const full = (nodeId: string, nextRevisionOn = '2026-11-10', intervalDays = 7) => state(nodeId, { revisionCount: 1, lastRevisedOn: '2026-10-25', intervalDays, nextRevisionOn, pyqAttempted: 5, pyqCorrect: 4 })
const NODES = Array.from({ length: 10 }, (_, i) => node(`T${i}`))

describe('subtopic ticks drive study progress', () => {
  const nodes = [node('A'), node('A1', 'subtopic', 'A'), node('A2', 'subtopic', 'A'), node('A3', 'subtopic', 'A'), node('A4', 'subtopic', 'A'), node('B'), { ...node('Ax', 'subtopic', 'A'), ownerId: 'me' }]
  it('share = ticked official subtopics / total; custom ones do not count; topics without subtopics are all-or-nothing', () => {
    const states = new Map([['A1', state('A1')], ['A2', state('A2')], ['Ax', state('Ax')], ['B', state('B')]])
    const s = studyShares(nodes, states)
    expect(s.get('A')).toBe(0.5)
    expect(s.get('B')).toBe(1)
  })
  it('topic stage follows ticks', () => {
    expect(topicStage(undefined, 0, TODAY)).toBe('not_started')
    expect(topicStage(state('A'), 0.5, TODAY)).toBe('touched')
    expect(topicStage(state('A'), 1, TODAY)).toBe('foundation_complete')
    expect(topicStage(state('A', { pyqAttempted: 2 }), 1, TODAY)).toBe('practised')
    expect(topicStage(state('A', { pyqAttempted: 2, revisionCount: 1 }), 1, TODAY)).toBe('revision_current')
    expect(topicStage(state('A', { nextRevisionOn: '2026-10-25' }), 0.5, TODAY)).toBe('revision_due')
  })
  it('coverage counts ticked subtopics and never fades', () => {
    const states = [state('A1'), state('A2'), state('B', { nextRevisionOn: '2026-08-01' })]
    const [touched, complete] = coverage(nodes, states, TODAY)
    expect(touched.value).toBe(75) // (0.5 + 1) / 2
    expect(complete.value).toBe(50)
    expect(coverage(nodes, states, '2027-06-01')[0].value).toBe(75)
    expect(coverage(nodes, [], TODAY)[0].reasons[0]).toBe('Not enough evidence: tick the subtopics you have studied to start.')
  })
})

describe('retention decay (dynamic progress)', () => {
  it('is full strength until the revision date, then fades to the floor', () => {
    expect(retentionStrength(full('a', '2026-11-01'), TODAY)).toBe(1)
    expect(retentionStrength(full('a', '2026-10-31', 7), TODAY)).toBeCloseTo(1 - (1 / 14) * 0.75, 5)
    expect(retentionStrength(full('a', '2026-09-01'), TODAY)).toBe(V2.decayFloor)
  })
  it('an overdue topic keeps a floor of what it earned', () => {
    const t = topicScore(full('a', '2026-08-01'), 1, TODAY)
    expect(t.peak).toBe(1)
    expect(t.current).toBe(V2.decayFloor)
  })
  it('overall preparation drops as revisions go overdue, and says why', () => {
    const states = NODES.map((n) => full(n.id))
    const onTime = preparation(NODES, states, TODAY)
    expect(onTime.value).toBe(95)
    const lapsed = preparation(NODES, states, '2026-11-24') // 14 days overdue at interval 7 -> floor
    expect(lapsed.value).toBe(25)
    expect(lapsed.peak).toBe(95)
    expect(lapsed.reasons[1]).toBe('10 topics are overdue for revision, which costs 70 points. Revising them brings you back to 95.')
  })
  it('recovers immediately after revising', () => {
    const states = NODES.map((n) => full(n.id, '2026-10-20'))
    const before = preparation(NODES, states, TODAY).value!
    const after = preparation(NODES, states.map((s) => ({ ...s, revisionCount: 2, lastRevisedOn: TODAY, nextRevisionOn: '2026-11-16', intervalDays: 15 })), TODAY).value!
    expect(after).toBeGreaterThan(before)
  })
  it('needs five started topics before showing a number', () => {
    const r = preparation(NODES, [full('T0')], TODAY, 'prelims')
    expect(r.value).toBeNull()
    expect(r.reasons[0]).toBe('Not enough evidence: 1 of 5 prelims topics needed have been started.')
  })
  it('is versioned and deterministic', () => {
    const states = NODES.slice(0, 6).map((n, i) => full(n.id, i % 2 ? '2026-10-25' : '2026-11-05'))
    expect(preparation(NODES, states, TODAY)).toEqual(preparation([...NODES].reverse(), [...states].reverse(), TODAY))
    expect(SCORING_VERSION).toBe('v2')
  })
})

describe('plan candidates', () => {
  it('turns overdue, due, unfinished and new topics into a prioritised plan', () => {
    const nodes = [node('A', 'topic', 'S', 2), node('B', 'topic', 'S', 5), node('C', 'topic', 'S', 1), node('C1', 'subtopic', 'C'), node('C2', 'subtopic', 'C'), node('D', 'topic', 'S', 4), node('E', 'topic', 'S', 3)]
    const states: TopicState[] = [full('A', '2026-10-28'), full('B', TODAY), full('C'), state('C1')]
    const c = planCandidates(nodes, states, TODAY, 2)
    expect(c.map((x) => `${x.nodeId}:${x.type}`)).toEqual(['A:revision_overdue', 'B:revision_due', 'C:carried_forward', 'D:uncovered', 'E:uncovered'])
    expect(draftPlan(c, 120).map((p) => p.bucket)).toEqual(['must', 'should', 'should', 'can_defer', 'can_defer'])
  })
})
