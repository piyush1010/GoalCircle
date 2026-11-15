import { BookOpen, Briefcase, ChefHat, Dumbbell, GraduationCap, HeartPulse, Plane, Repeat2, type LucideIcon } from 'lucide-react'
import { examInfo } from '@/lib/prep/exam'

/** One row of community_overview(): a community, your place in it, and this week's challenge. */
export interface CommunityRow {
  key: string; member: boolean; joined: boolean; members: number; active_today: number
  target: number; my_progress: number; in_challenge: boolean; challenge_joined: number; challenge_finished: number; topic: string | null
}

interface Kind { name: string; line: string; icon: LucideIcon; today: string; challenge: (n: number) => string; unit: (n: number) => string }

/** The goal communities. Keys match goals.category. */
export const CATEGORY_COMMUNITIES: Record<string, Kind> = {
  fitness: { name: 'Fitness', line: 'Gym, yoga, running, sport', icon: Dumbbell, today: 'worked out today', challenge: (n) => `Work out on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  reading: { name: 'Reading', line: 'A few pages a day', icon: BookOpen, today: 'read today', challenge: (n) => `Read on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  health: { name: 'Health and mind', line: 'Sleep, meditation, mental health', icon: HeartPulse, today: 'took time for themselves today', challenge: (n) => `Take time for your mind on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  learning: { name: 'Skills', line: 'Coding, music, languages', icon: GraduationCap, today: 'practised today', challenge: (n) => `Practise on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  habits: { name: 'Daily habits', line: 'Small things, every day', icon: Repeat2, today: 'kept a habit today', challenge: (n) => `Keep your habit on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  work: { name: 'Deep work', line: 'Focused hours on what matters', icon: Briefcase, today: 'did focused work today', challenge: (n) => `Do focused work on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  cooking: { name: 'Cooking', line: 'New dishes, eating well', icon: ChefHat, today: 'cooked today', challenge: (n) => `Cook something new on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
  travel: { name: 'Travel', line: 'Plan and take trips', icon: Plane, today: 'worked on a trip today', challenge: (n) => `Work on your next trip on ${n} days this week`, unit: (n) => (n === 1 ? 'day' : 'days') },
}

export const isExamCommunity = (key: string) => key.startsWith('exam:')
export const examCode = (key: string) => key.slice(5)

/** Names, lines and challenge wording for any community key. */
export function describe(key: string): Kind & { short: string } {
  if (isExamCommunity(key)) {
    const info = examInfo(examCode(key))
    return {
      name: info.short, short: info.short, line: 'Students preparing for the same exam', icon: GraduationCap, today: 'studied today',
      challenge: (n) => `Study or revise ${n} topics this week`, unit: (n) => (n === 1 ? 'topic' : 'topics'),
    }
  }
  const kind = CATEGORY_COMMUNITIES[key] ?? CATEGORY_COMMUNITIES.habits
  return { ...kind, short: '' }
}

/** "1,240 studied today. Topic of the day: Federalism" */
export function todayLine(row: CommunityRow) {
  const d = describe(row.key)
  const count = row.active_today > 0 ? `${row.active_today.toLocaleString('en-IN')} ${d.today}` : `Be the first ${isExamCommunity(row.key) ? 'to study' : 'to check in'} today`
  return row.topic ? `${count}. Topic of the day: ${row.topic}` : count
}

/** "312 joined so far, and 58 have finished" */
export function challengeLine(row: CommunityRow) {
  if (row.challenge_joined === 0) return 'Be the first to join'
  const joined = `${row.challenge_joined.toLocaleString('en-IN')} joined so far`
  return row.challenge_finished > 0 ? `${joined}, and ${row.challenge_finished.toLocaleString('en-IN')} ${row.challenge_finished === 1 ? 'has' : 'have'} finished` : joined
}

/** Weeks end on Sunday. */
export function endsLine(today = new Date()) {
  const left = (7 - today.getDay()) % 7
  return left === 0 ? 'ends today' : left === 1 ? 'ends tomorrow' : 'ends Sunday'
}

