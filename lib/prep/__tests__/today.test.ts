import { describe, expect, it } from 'vitest'
import { todayTasks, type PlanInput } from '../today'
import type { SyllabusNode, TopicState } from '../types'

const n = (id: string, parentId: string | null, kind: SyllabusNode['kind'], code = id): SyllabusNode => ({ id, parentId, kind, code, title: id, stages: ['prelims'], papers: [], weight: 1, pyqFrequency: null, sort: 0 })
const tree = (prefix: string, shared: string): SyllabusNode[] => [
  n(`${prefix}PRE`, null, 'stage', 'PRE'), n(`${prefix}P`, `${prefix}PRE`, 'paper', 'PRE.GS'), n(`${prefix}J`, `${prefix}P`, 'subject', 'PRE.GS.POL'),
  n(`${prefix}T`, `${prefix}J`, 'topic', 'PRE.GS.POL.CON'), n(`${prefix}S1`, `${prefix}T`, 'subtopic', shared), n(`${prefix}S2`, `${prefix}T`, 'subtopic', `${prefix}-own`),
]
const settings = { examDate: '2026-11-05', planStartOn: '2026-11-04', targetStage: 'prelims' as const, revisionBufferPct: 0 }

describe('today slides', () => {
  it('combines exams, counts a shared subtopic once and labels exams', () => {
    const plans: PlanInput[] = [{ templateId: 'a', short: 'UPSC CSE', nodes: tree('a', 'PRE.GS.POL.CON.01'), settings }, { templateId: 'b', short: 'UPPCS', nodes: tree('b', 'PRE.GS.POL.CON.01'), settings }]
    const t = todayTasks({ plans, states: new Map(), today: '2026-11-04' })
    expect(t.map((x) => x.nodeId)).toEqual(['aS1', 'aS2', 'bS2'])
    expect(t[0].exam).toBe('UPSC CSE')
  })
  it('orders mentor task, overdue revision, study, goals; finished ones last', () => {
    const states = new Map<string, TopicState>([['aT', { nodeId: 'aT', touchedOn: '2026-10-01', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: 3, nextRevisionOn: '2026-10-04', pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0 }], ['aS1', { nodeId: 'aS1', touchedOn: '2026-11-04', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: null, nextRevisionOn: null, pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0 }]])
    const t = todayTasks({ plans: [{ templateId: 'a', short: 'UPSC CSE', nodes: tree('a', 'x'), settings }], states, today: '2026-11-04', goals: [{ id: 'g', title: 'Run', done: false, detail: 'Every day' }], mentor: [{ circleId: 'c', name: 'Batch', task: 'Read Laxmikanth ch. 5', done: false }] })
    expect(t.map((x) => x.kind)).toEqual(['mentor', 'revise', 'study', 'goal', 'study'])
    expect(t[1].subtitle).toBe('Revision 31 days overdue')
    expect([t[4].nodeId, t[4].done]).toEqual(['aS1', true])
    expect(t[0].exam).toBeNull()
  })
})
