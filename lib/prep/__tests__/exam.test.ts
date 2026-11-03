import { describe, expect, it } from 'vitest'
import { EXAMS, examInfo, mockTrend, netMarks } from '../exam'

describe('exam info', () => {
  it('falls back to UPSC and knows CAT has one stage', () => {
    expect(examInfo(null).short).toBe('UPSC CSE')
    expect(examInfo('cat_v1').targetStages).toEqual(['prelims'])
    expect(examInfo('cat_v1').tabs.map((t) => t.root)).toEqual(['PRE', 'INT'])
  })
})

describe('PYQ net marks', () => {
  it('applies negative marking', () => {
    expect(netMarks(EXAMS.upsc_cse_v1.pyqPapers[0], 80, 55)).toEqual({ marks: 93.5, max: 200, accuracy: 69 })
    expect(netMarks(EXAMS.cat_v1.pyqPapers[0], 40, 30)).toEqual({ marks: 80, max: 204, accuracy: 75 })
    expect(netMarks(EXAMS.cat_v1.pyqPapers[0], 0, 0).accuracy).toBeNull()
  })
})

describe('mock trend', () => {
  it('orders by date, averages sections over the last five, weakest first, and measures change', () => {
    const m = (takenOn: string, score: number, sections: [string, number, number][] = []) => ({ takenOn, score, maxScore: 200, sections: sections.map(([name, s, max]) => ({ name, score: s, max })) })
    const t = mockTrend([m('2026-10-04', 100), m('2026-10-01', 80, [['QA', 20, 66]]), m('2026-10-08', 120, [['VARC', 36, 72], ['QA', 33, 66]]), m('2026-10-12', 130), { takenOn: '2026-10-13', score: null, maxScore: 200, sections: [] }])
    expect(t.points.map((p) => p.pct)).toEqual([40, 50, 60, 65])
    expect(t.sections).toEqual([{ name: 'QA', avgPct: 40, mocks: 2 }, { name: 'VARC', avgPct: 50, mocks: 1 }])
    expect(t.change).toBe(18) // avg(50,60,65)=58.3 vs avg(40)=40
  })
})
