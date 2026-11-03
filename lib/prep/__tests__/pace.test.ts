import { describe, expect, it } from 'vitest'
import { pacePlan, studyUnits, type Unit } from '../pace'
import type { SyllabusNode, TopicState } from '../types'

const n = (id: string, parentId: string | null, kind: SyllabusNode['kind'], stages: ('prelims' | 'mains')[] = ['prelims'], sort = 0): SyllabusNode => ({ id, parentId, kind, code: id, title: id, stages, papers: [], weight: 1, pyqFrequency: null, sort })
const st = (nodeId: string, touchedOn = '2026-10-01'): TopicState => ({ nodeId, touchedOn, foundation: {}, revisionCount: 0, lastRevisedOn: null, intervalDays: null, nextRevisionOn: null, pyqAttempted: 0, pyqCorrect: 0, answersWritten: 0 })
const units = (k: number): Unit[] => Array.from({ length: k }, (_, i) => ({ id: `u${i}`, title: `u${i}`, topicId: `t${Math.floor(i / 3)}`, topicTitle: '', paperTitle: '' }))

describe('study units', () => {
  it('lists subtopics in syllabus order, falling back to the topic, for one stage only', () => {
    const nodes = [n('PRE', null, 'stage'), n('MAI', null, 'stage', ['mains']), n('P', 'PRE', 'paper'), n('J', 'P', 'subject'), n('A', 'J', 'topic', ['prelims'], 0), n('A2', 'A', 'subtopic', ['prelims'], 2), n('A1', 'A', 'subtopic', ['prelims'], 1), n('B', 'J', 'topic', ['prelims'], 1), { ...n('Ax', 'A', 'subtopic'), ownerId: 'me' }, n('MP', 'MAI', 'paper', ['mains']), n('MJ', 'MP', 'subject', ['mains']), n('M', 'MJ', 'topic', ['mains'])]
    expect(studyUnits(nodes, 'prelims').map((u) => u.id)).toEqual(['A1', 'A2', 'B'])
    expect(studyUnits(nodes, 'mains').map((u) => u.id)).toEqual(['M'])
  })
})

describe('pace plan: "finish in 5 months"', () => {
  it('works out a daily target and keeps a revision window', () => {
    // 150 days, 15% revision = 22.5 -> 23 days; 127 study days for 470 subtopics -> 3.7, so 4 a day
    const p = pacePlan(units(470), new Map(), '2026-11-04', '2026-11-04', '2027-04-03')
    expect(p.revisionDays).toBe(23)
    expect(p.studyDaysLeft).toBe(127)
    expect(p.perDay).toBe(4)
    expect(p.status).toBe('on_track')
    expect(p.days[0].units.map((u) => u.id)).toEqual(['u0', 'u1', 'u2', 'u3'])
    expect(p.days[1].units.map((u) => u.id)).toEqual(['u4', 'u5', 'u6', 'u7'])
    expect(p.reasons[1]).toBe('470 ÷ 127 days = 4 a day, rounded up.')
  })
  it('raises the target when you fall behind and says why', () => {
    // 30 days in, nothing done
    const p = pacePlan(units(100), new Map(), '2026-12-04', '2026-11-04', '2027-01-03', 0)
    expect(p.daysLeft).toBe(30)
    expect(p.perDay).toBe(4) // 100 / 30
    expect(p.behindBy).toBe(50)
    expect(p.status).toBe('behind')
    expect(p.reasons[2]).toBe('To be on schedule you would have 50 done by today; you are 50 behind, so the daily target has gone up.')
  })
  it('counts what you ticked today towards today', () => {
    const states = new Map([['u0', st('u0', '2026-11-04')], ['u1', st('u1', '2026-11-04')]])
    const p = pacePlan(units(30), states, '2026-11-04', '2026-11-04', '2026-11-14', 0)
    expect(p.perDay).toBe(3) // 30 left at the start of today / 10 days
    expect(p.doneToday).toBe(2)
    expect(p.days[0].units.map((u) => u.id)).toEqual(['u2'])
    expect(p.days[1].units.map((u) => u.id)).toEqual(['u3', 'u4', 'u5'])
  })
  it('switches to the revision window and to complete', () => {
    expect(pacePlan(units(10), new Map(), '2027-03-30', '2026-11-04', '2027-04-03').status).toBe('revision_window')
    const all = new Map(units(3).map((u) => [u.id, st(u.id)]))
    expect(pacePlan(units(3), all, '2026-11-10', '2026-11-04', '2027-04-03').status).toBe('complete')
  })
})

describe('plan from settings', () => {
  it('needs an exam date and leaves optional papers out', async () => {
    const { planFor } = await import('../pace')
    const nodes = [n('PRE', null, 'stage', ['mains']), { ...n('MAI.OPT', 'PRE', 'paper', ['mains']), code: 'MAI.OPT' }, n('MJ', 'MAI.OPT', 'subject', ['mains']), n('OP1', 'MJ', 'topic', ['mains']), { ...n('MAI.GS1', 'PRE', 'paper', ['mains']), code: 'MAI.GS1' }, n('GJ', 'MAI.GS1', 'subject', ['mains']), n('G1', 'GJ', 'topic', ['mains'])]
    const settings = { examDate: null, planStartOn: null, targetStage: 'mains' as const, revisionBufferPct: 0 }
    expect(planFor(nodes, new Map(), settings, '2026-11-04')).toBeNull()
    const p = planFor(nodes, new Map(), { ...settings, examDate: '2026-11-14' }, '2026-11-04')!
    expect(p.units.map((u) => u.id)).toEqual(['G1'])
    const withOpt = planFor(nodes, new Map(), { ...settings, examDate: '2026-11-14', optionalSubjectId: 'MJ' }, '2026-11-04')!
    expect(withOpt.units.map((u) => u.id)).toEqual(['G1', 'OP1'])
  })
})
