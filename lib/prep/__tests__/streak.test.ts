import { describe, expect, it } from 'vitest'
import { studyStreak } from '../streak'

describe('study streak', () => {
  it('counts back from today', () => {
    expect(studyStreak(['2026-11-04', '2026-11-03', '2026-11-02', '2026-10-30'], '2026-11-04').current).toBe(3)
  })
  it('keeps yesterday\'s streak alive until today ends', () => {
    const s = studyStreak(['2026-11-03', '2026-11-02'], '2026-11-04')
    expect(s.current).toBe(2)
    expect(s.studiedToday).toBe(false)
  })
  it('breaks after a missed day and lays out the last 7 days', () => {
    const s = studyStreak(['2026-11-01'], '2026-11-04')
    expect(s.current).toBe(0)
    expect(s.week.map((d) => d.studied)).toEqual([false, false, false, true, false, false, false])
    expect(s.week[6].date).toBe('2026-11-04')
  })
})
