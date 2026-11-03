import { describe, expect, it } from 'vitest'
import { childrenMap, rollups, stageExplanation, STAGE_LABEL } from '../explorer'
import type { SyllabusNode, TopicState } from '../types'

const TODAY = '2026-11-01'
const n = (id: string, parentId: string | null, kind: SyllabusNode['kind'], sort = 0): SyllabusNode => ({ id, parentId, kind, code: id, title: id, stages: ['prelims'], papers: [], weight: 1, pyqFrequency: null, sort })
const NODES = [n('S', null, 'stage'), n('P', 'S', 'paper'), n('J1', 'P', 'subject', 1), n('J0', 'P', 'subject', 0), n('A', 'J0', 'topic'), n('B', 'J0', 'topic'), n('C', 'J1', 'topic'), n('A.x', 'A', 'subtopic')]
const st = (nodeId: string, over: Partial<TopicState> = {}): TopicState => ({ nodeId, touchedOn: '2026-10-01', foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: 3, nextRevisionOn: '2026-11-20', pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0, ...over })

describe('explorer', () => {
  it('orders children by syllabus order', () => {
    expect(childrenMap(NODES).get('P')!.map((x) => x.id)).toEqual(['J0', 'J1'])
  })
  it('rolls progress up to subject, paper and stage, counting official topics only', () => {
    const r = rollups(NODES, [st('A', { foundation: { read: true, notes: true } }), st('C', { nextRevisionOn: '2026-10-25' }), st('A.x')], TODAY)
    expect(r.get('J0')).toEqual({ topics: 2, touched: 1, foundation: 1, due: 0 })
    expect(r.get('J1')).toEqual({ topics: 1, touched: 1, foundation: 0, due: 1 })
    expect(r.get('S')).toEqual({ topics: 3, touched: 2, foundation: 1, due: 1 })
  })
  it('explains a topic and says what moves it forward', () => {
    const none = stageExplanation(undefined, TODAY)
    expect(none.stage).toBe('not_started')
    expect(none.next).toBe('Log "Studied" when you first read it.')
    const due = stageExplanation(st('A', { lastRevisedOn: '2026-10-16', intervalDays: 14, revisionCount: 1, nextRevisionOn: '2026-10-30' }), TODAY)
    expect(STAGE_LABEL[due.stage]).toBe('Revision due')
    expect(due.reasons).toContain('Last revised 16 days ago; current revision interval is 14 days. Revision is 2 days overdue.')
    expect(due.next).toBe('Revise it to bring it back on schedule. Your coverage is kept.')
  })
})
