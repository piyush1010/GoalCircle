export const EXAMS = [
  { id: 'upsc', label: 'UPSC' },
  { id: 'ssc', label: 'SSC' },
  { id: 'state_psc', label: 'State PSC' },
  { id: 'banking', label: 'Banking' },
  { id: 'cat', label: 'CAT' },
  { id: 'jee', label: 'JEE' },
  { id: 'neet', label: 'NEET' },
  { id: 'clat', label: 'CLAT' },
  { id: 'gate', label: 'GATE' },
  { id: 'sat', label: 'SAT' },
  { id: 'other', label: 'Other' },
] as const

export type ExamId = (typeof EXAMS)[number]['id']

export function examLabel(id: string | null | undefined) {
  return EXAMS.find((exam) => exam.id === id)?.label ?? null
}

/** Today's date in the user's own time zone, as YYYY-MM-DD. */
export function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}
