import { describe, expect, it } from 'vitest'
import { mistakeSummary, weakTopics, weekReview, type Mistake, type PrepEvent } from '../insights'
import type { SyllabusNode, TopicState } from '../types'

const ev = (occurredOn: string, kind: string, nodeId: string | null = null, extra: Partial<PrepEvent> = {}): PrepEvent => ({ occurredOn, kind, nodeId, quantity: 1, undo: false, habit: null, ...extra })
const node = (id: string, kind: SyllabusNode['kind'], parentId: string | null = null): SyllabusNode => ({ id, parentId, kind, code: id, title: id, stages: ['prelims'], papers: [], weight: 1, pyqFrequency: null })
const state = (nodeId: string, pyqAttempted: number, pyqCorrect: number): TopicState => ({ nodeId, touchedOn: '2026-10-01', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: null, nextRevisionOn: null, pyqAttempted, pyqCorrect, answersWritten: 0 })
const mistake = (id: string, nodeId: string | null, category: string, resolvedOn: string | null = null, createdOn = '2026-11-01'): Mistake => ({ id, nodeId, category, note: null, createdOn, resolvedOn })

describe('weekly review', () => {
  it('compares this week with last week', () => {
    const events = [
      ev('2026-11-04', 'studied', 's1'), ev('2026-11-04', 'studied', 's1'), ev('2026-11-03', 'studied', 's2'), ev('2026-11-03', 'studied', 's3', { undo: true }),
      ev('2026-11-02', 'revised', 't1'), ev('2026-11-02', 'pyq', 't1', { quantity: 25 }), ev('2026-11-01', 'answers', null, { quantity: 2 }),
      ev('2026-11-01', 'current_affairs', null, { habit: 'newspaper' }), ev('2026-11-02', 'current_affairs', null, { habit: 'newspaper' }),
      ev('2026-10-25', 'studied', 's4'), ev('2026-10-25', 'mock'),
      ev('2026-10-20', 'studied', 's5'), // older than two weeks
    ]
    const { thisWeek, lastWeek } = weekReview(events, new Set(['s1', 's2', 's3', 's4', 's5']), '2026-11-04')
    expect(thisWeek).toEqual({ minutes: 0, studyDays: 4, ticks: 2, revisions: 1, pyqs: 25, answers: 2, mocks: 0, newspaperDays: 2 })
    expect(lastWeek).toEqual({ minutes: 0, studyDays: 1, ticks: 1, revisions: 0, pyqs: 0, answers: 0, mocks: 1, newspaperDays: 0 })
  })
})

describe('weak topics', () => {
  it('flags low PYQ accuracy and repeated open mistakes, worst first', () => {
    const nodes = [node('A', 'topic'), node('B', 'topic'), node('B1', 'subtopic', 'B'), node('C', 'topic')]
    const states = new Map([['A', state('A', 20, 6)], ['C', state('C', 8, 1)]])
    const mistakes = [mistake('1', 'B1', 'careless'), mistake('2', 'B', 'fact_forgotten'), mistake('3', 'B', 'careless', '2026-11-03'), mistake('4', 'C', 'careless')]
    const w = weakTopics(nodes, states, mistakes)
    expect(w.map((x) => x.nodeId)).toEqual(['A', 'B'])
    expect(w[0].reasons).toEqual(['PYQ accuracy 30% (6 of 20).'])
    expect(w[1].reasons).toEqual(['2 open mistakes in your notebook.'])
  })
})

describe('mistake notebook', () => {
  it('lists open mistakes oldest first and the commonest types', () => {
    const s = mistakeSummary([mistake('1', null, 'careless', null, '2026-11-03'), mistake('2', null, 'careless', '2026-11-04'), mistake('3', null, 'extreme_word', null, '2026-11-01')])
    expect(s.open.map((m) => m.id)).toEqual(['3', '1'])
    expect(s.topTypes[0]).toEqual({ category: 'careless', label: 'Careless slip', count: 2 })
  })
})

describe('quick wins', () => {
  it('lists overdue topics by points recovered and ignores ones on schedule', async () => {
    const { quickWins } = await import('../insights')
    const nodes = [node('A', 'topic'), node('B', 'topic'), node('C', 'topic')]
    const overdue = (id: string, nextRevisionOn: string): TopicState => ({ ...state(id, 0, 0), touchedOn: '2026-09-01', revisionCount: 1, lastRevisedOn: '2026-09-10', intervalDays: 7, nextRevisionOn })
    const states = new Map([['A', overdue('A', '2026-10-01')], ['B', overdue('B', '2026-10-25')], ['C', overdue('C', '2026-12-01')]])
    const w = quickWins(nodes, states, '2026-11-04')
    expect(w.map((x) => x.nodeId)).toEqual(['A', 'B'])
    expect(w[0].points).toBeGreaterThan(w[1].points)
  })
})
