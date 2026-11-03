import { describe, expect, it } from 'vitest'
import { studyStreak } from '../streak'

describe('study streak', () => {
  it('counts back from today', () => {
    expect(studyStreak(['2026-11-04', '2026-11-03', '2026-11-02'], '2026-11-04').current).toBe(3)
  })
  it('keeps yesterday\'s streak alive until today ends', () => {
    const s = studyStreak(['2026-11-03', '2026-11-02'], '2026-11-04')
    expect(s.current).toBe(2)
    expect(s.studiedToday).toBe(false)
  })
  it('allows one rest day a week', () => {
    // studied 4th, 3rd, rest 2nd, studied 1st, 31st
    const s = studyStreak(['2026-11-04', '2026-11-03', '2026-11-01', '2026-10-31'], '2026-11-04')
    expect(s.current).toBe(4)
    expect(s.restDays).toBe(1)
  })
  it('a second rest day within a week breaks it, and two missed days in a row always do', () => {
    expect(studyStreak(['2026-11-04', '2026-11-02', '2026-10-31'], '2026-11-04').current).toBe(2)
    expect(studyStreak(['2026-11-04', '2026-11-01', '2026-10-31'], '2026-11-04').current).toBe(1)
  })
  it('lays out the last 7 days', () => {
    const s = studyStreak(['2026-11-01'], '2026-11-04')
    expect(s.current).toBe(0)
    expect(s.week.map((d) => d.studied)).toEqual([false, false, false, true, false, false, false])
  })
})
