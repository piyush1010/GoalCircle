import { describe, expect, it } from 'vitest'
import { childrenMap, rollups, stageExplanation, STAGE_LABEL } from '../explorer'
import type { SyllabusNode, TopicState } from '../types'

const TODAY = '2026-11-01'
const n = (id: string, parentId: string | null, kind: SyllabusNode['kind'], sort = 0): SyllabusNode => ({ id, parentId, kind, code: id, title: id, stages: ['prelims'], papers: [], weight: 1, pyqFrequency: null, sort })
const NODES = [n('S', null, 'stage'), n('P', 'S', 'paper'), n('J1', 'P', 'subject', 1), n('J0', 'P', 'subject', 0), n('A', 'J0', 'topic'), n('A1', 'A', 'subtopic'), n('A2', 'A', 'subtopic'), n('B', 'J0', 'topic'), n('C', 'J1', 'topic')]
const st = (nodeId: string, over: Partial<TopicState> = {}): TopicState => ({ nodeId, touchedOn: '2026-10-01', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: 3, nextRevisionOn: '2026-11-20', pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0, ...over })

describe('explorer', () => {
  it('orders children by syllabus order', () => {
    expect(childrenMap(NODES).get('P')!.map((x) => x.id)).toEqual(['J0', 'J1'])
  })
  it('rolls ticked subtopics up to subject, paper and stage', () => {
    const r = rollups(NODES, [st('A1'), st('A'), st('C', { nextRevisionOn: '2026-10-25' })], TODAY)
    expect(r.get('A')).toEqual({ topics: 1, subtopics: 2, ticked: 1, complete: 0, due: 0 })
    expect(r.get('J0')).toEqual({ topics: 2, subtopics: 3, ticked: 1, complete: 0, due: 0 })
    expect(r.get('S')).toEqual({ topics: 3, subtopics: 4, ticked: 2, complete: 1, due: 1 })
  })
  it('explains a topic and says what moves it forward', () => {
    const none = stageExplanation(undefined, 0, { ticked: 0, total: 2 }, TODAY)
    expect(none.stage).toBe('not_started')
    expect(none.next).toBe('Tick a subtopic when you study it.')
    const due = stageExplanation(st('A', { lastRevisedOn: '2026-10-16', intervalDays: 14, revisionCount: 1, nextRevisionOn: '2026-10-30' }), 0.5, { ticked: 1, total: 2 }, TODAY)
    expect(STAGE_LABEL[due.stage]).toBe('Revision due')
    expect(due.reasons).toEqual(['Subtopics studied: 1 of 2.', 'Practice: no PYQs or answers logged yet.', 'Last revised 16 days ago; current revision interval is 14 days. Revision is 2 days overdue.'])
    expect(due.next).toBe('Revise it to bring it back on schedule. Your ticks are kept.')
  })
})
