/**
 * The answers from first-time setup, kept on this device until the account exists.
 * Nothing is saved to the server before sign-up; /start/finish turns this into a plan and goals.
 */

export type HabitId = 'fitness' | 'health' | 'reading' | 'skill' | 'cooking' | 'travel' | 'own'
export type Level = 'beginner' | 'intermediate' | 'advanced'
// perWeek 7 means every day; finishBy is YYYY-MM-DD; unit is what each check-in counts (km, pages), if anything.
export interface HabitDraft { id: HabitId; title: string; perWeek: number; finishBy?: string; unit?: string | null }
export interface StartDraft {
  goals: ('exam' | HabitId)[]
  exam: { code: string; date: string; stage: 'prelims' | 'mains'; hours: number; level: Level } | null
  habits: HabitDraft[]
  /** Post the new goals on the feed, where followers can cheer them on. */
  share?: boolean
  savedAt: number
}

const KEY = 'goalyaar-start-draft'
const WEEK = 7 * 86400000

export function readDraft(): StartDraft | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? 'null') as StartDraft | null
    return value && Array.isArray(value.goals) && Date.now() - value.savedAt < WEEK ? value : null
  } catch { return null }
}
export function writeDraft(draft: Omit<StartDraft, 'savedAt'>) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() })) } catch { /* setup still works in this session */ }
}
export function clearDraft() { try { window.localStorage.removeItem(KEY) } catch { /* nothing to clear */ } }

/** The personal goals offered at setup, with a small, specific default for each. */
export const HABITS: { id: HabitId; name: string; line: string; title: string; category: string; perWeek: number }[] = [
  { id: 'fitness', name: 'Fitness', line: 'Gym, yoga, running', title: 'Work out for 30 minutes', category: 'fitness', perWeek: 5 },
  { id: 'health', name: 'Health and mind', line: 'Sleep, meditation, mental health', title: 'Meditate for 10 minutes', category: 'health', perWeek: 7 },
  { id: 'reading', name: 'Reading', line: 'A few pages a day', title: 'Read 20 pages', category: 'reading', perWeek: 7 },
  { id: 'skill', name: 'Learn a skill', line: 'Coding, a language, music', title: 'Practise for 30 minutes', category: 'learning', perWeek: 5 },
  { id: 'cooking', name: 'Cooking', line: 'New dishes, eating well', title: 'Cook a new dish', category: 'cooking', perWeek: 1 },
  { id: 'travel', name: 'Travel', line: 'Plan and take trips', title: 'Plan the next trip', category: 'travel', perWeek: 1 },
  { id: 'own', name: 'Something else', line: 'Name your own goal', title: '', category: 'personal', perWeek: 7 },
]

/** "every day", "five days a week", "once a week". */
export function howOften(perWeek: number) {
  if (perWeek >= 7) return 'every day'
  if (perWeek === 1) return 'once a week'
  return `${['', 'one', 'two', 'three', 'four', 'five', 'six'][perWeek]} days a week`
}
