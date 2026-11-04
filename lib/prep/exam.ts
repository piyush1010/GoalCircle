// What differs between exams in the UI: tabs, stages, mock sections, PYQ papers and habits.
import type { MockResult } from './types'

export interface PyqPaper { code: string; label: string; questions: number; plus: number; minus: number }
export interface DatePreset { label: string; date: string; stage: 'prelims' | 'mains'; source: string }
export interface ExamInfo {
  short: string
  /** Official dates where announced (checked 4 Nov 2026). Empty when not yet announced. */
  presets: DatePreset[]
  tabs: { root: string; label: string }[]
  targetStages: ('prelims' | 'mains')[]
  stageName: { prelims: string; mains: string }
  mockStages: [MockResult['stage'], string, number][]
  mockSections: { name: string; max: number }[]
  pyqPapers: PyqPaper[]
  pyqYears: [number, number]
  answerWriting: boolean
  readingHabit: string
}

const CIVIL: Omit<ExamInfo, 'short' | 'pyqPapers' | 'presets'> = {
  tabs: [{ root: 'PRE', label: 'Prelims' }, { root: 'MAI', label: 'Mains' }, { root: 'NCERT', label: 'NCERT' }],
  targetStages: ['prelims', 'mains'],
  stageName: { prelims: 'Prelims', mains: 'Mains' },
  mockStages: [['prelims_gs', 'Prelims GS', 200], ['csat', 'CSAT', 200], ['mains', 'Mains', 250], ['optional', 'Optional', 250]],
  mockSections: [],
  pyqYears: [2011, 2025],
  answerWriting: true,
  readingHabit: 'Newspaper',
}

export const EXAMS: Record<string, ExamInfo> = {
  upsc_cse_v1: { ...CIVIL, short: 'UPSC CSE', presets: [{ label: 'Prelims 2027 · 23 May', date: '2027-05-23', stage: 'prelims', source: 'UPSC calendar 2027' }, { label: 'Mains 2027 · from 20 Aug', date: '2027-08-20', stage: 'mains', source: 'UPSC calendar 2027' }], pyqPapers: [{ code: 'PRE_GS', label: 'Prelims GS I', questions: 100, plus: 2, minus: 0.66 }, { code: 'CSAT', label: 'CSAT', questions: 80, plus: 2.5, minus: 0.83 }] },
  uppcs_v1: { ...CIVIL, short: 'UPPCS', presets: [{ label: 'Prelims 2026 · 6 Dec', date: '2026-12-06', stage: 'prelims', source: 'UPPSC schedule as reported; confirm on uppsc.up.nic.in' }], pyqYears: [2013, 2025], pyqPapers: [{ code: 'PRE_GS', label: 'Prelims GS I', questions: 150, plus: 1.33, minus: 0.44 }, { code: 'CSAT', label: 'CSAT', questions: 100, plus: 2, minus: 0.66 }] },
  bpsc_v1: { ...CIVIL, short: 'BPSC', presets: [], pyqYears: [2013, 2025], mockStages: [['prelims_gs', 'Prelims GS', 150], ['mains', 'Mains', 300], ['other', 'Other', 100]], pyqPapers: [{ code: 'PRE_GS', label: 'Prelims GS', questions: 150, plus: 1, minus: 0.33 }] },
  jkpsc_cce_v1: { ...CIVIL, short: 'JKPSC CCE', presets: [], pyqYears: [2018, 2025], pyqPapers: [{ code: 'PRE_GS', label: 'Prelims GS I', questions: 100, plus: 2, minus: 0.66 }, { code: 'CSAT', label: 'CSAT', questions: 80, plus: 2.5, minus: 0.83 }] },
  hpsc_hcs_v1: { ...CIVIL, short: 'HCS (Haryana)', presets: [], pyqYears: [2014, 2025], mockStages: [['prelims_gs', 'Prelims GS', 200], ['csat', 'CSAT', 200], ['mains', 'Mains', 100]], pyqPapers: [{ code: 'PRE_GS', label: 'Prelims GS', questions: 100, plus: 2, minus: 0.25 }, { code: 'CSAT', label: 'CSAT', questions: 100, plus: 2, minus: 0.25 }] },
  cat_v1: {
    short: 'CAT',
    presets: [{ label: 'CAT 2026 · 29 Nov', date: '2026-11-29', stage: 'prelims', source: 'IIM CAT 2026 notice' }],
    tabs: [{ root: 'PRE', label: 'CAT' }, { root: 'INT', label: 'WAT · GD · PI' }],
    targetStages: ['prelims'],
    stageName: { prelims: 'CAT', mains: 'CAT' },
    mockStages: [['other', 'Full mock', 204], ['prelims_gs', 'Sectional', 72]],
    mockSections: [{ name: 'VARC', max: 72 }, { name: 'DILR', max: 66 }, { name: 'QA', max: 66 }],
    pyqPapers: [{ code: 'CAT', label: 'CAT paper (one slot)', questions: 68, plus: 3, minus: 1 }],
    pyqYears: [2017, 2025],
    answerWriting: false,
    readingHabit: 'Daily reading',
  },
}

/** Most common exam first: used wherever exams are listed. */
export const EXAM_ORDER = ['upsc_cse_v1', 'uppcs_v1', 'bpsc_v1', 'hpsc_hcs_v1', 'jkpsc_cce_v1', 'cat_v1']
export const byExamOrder = <T extends { code: string }>(a: T, b: T) => (EXAM_ORDER.indexOf(a.code) + 1 || 99) - (EXAM_ORDER.indexOf(b.code) + 1 || 99)

export const examInfo = (code: string | null | undefined): ExamInfo => EXAMS[code ?? ''] ?? EXAMS.upsc_cse_v1

/** Net marks for a past paper under the paper's marking scheme (approximate: ignores questions without negative marking). */
export function netMarks(p: PyqPaper, attempted: number, correct: number): { marks: number; max: number; accuracy: number | null } {
  const wrong = Math.max(0, attempted - correct)
  return { marks: Math.round((correct * p.plus - wrong * p.minus) * 10) / 10, max: Math.round(p.questions * p.plus), accuracy: attempted ? Math.round((100 * correct) / attempted) : null }
}

export interface MockSection { name: string; score: number | null; max: number | null }
export interface MockWithSections { takenOn: string; score: number | null; maxScore: number | null; sections: MockSection[] }

/** Score % per mock over time (oldest first) and each section's average % across the last five mocks. */
export function mockTrend(mocks: MockWithSections[]): { points: { takenOn: string; pct: number }[]; sections: { name: string; avgPct: number; mocks: number }[]; change: number | null } {
  const scored = mocks.filter((m) => m.score !== null && m.maxScore).sort((a, b) => a.takenOn.localeCompare(b.takenOn))
  const points = scored.map((m) => ({ takenOn: m.takenOn, pct: Math.round((100 * (m.score as number)) / (m.maxScore as number)) }))
  const recent = scored.slice(-5)
  const bySection = new Map<string, number[]>()
  for (const m of recent) for (const s of m.sections) if (s.score !== null && s.max) bySection.set(s.name, [...(bySection.get(s.name) ?? []), (100 * s.score) / s.max])
  const sections = [...bySection].map(([name, xs]) => ({ name, avgPct: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), mocks: xs.length })).sort((a, b) => a.avgPct - b.avgPct)
  const change = points.length >= 4 ? Math.round(avg(points.slice(-3).map((p) => p.pct)) - avg(points.slice(0, Math.min(3, points.length - 3)).map((p) => p.pct))) : null
  return { points, sections, change }
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
