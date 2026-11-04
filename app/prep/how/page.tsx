import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'How your preparation is measured · GoalYaar' }

const ITEMS: [string, string][] = [
  ['Subtopics ticked', 'A plain count. You tick a subtopic when you have studied it. Nothing is estimated.'],
  ['Coverage', 'Ticked official subtopics ÷ all official subtopics, weighted by how big each topic is. Coverage never goes down.'],
  ['Preparation level', 'For each topic you have started: 40% for subtopics ticked, 30% for practice (PYQs or answers logged), 30% for revising it on time. Averaged over the whole syllabus, shown as a band (Getting started → Highly prepared) and an index out of 95. It never says 100%: nobody is fully ready.'],
  ['Why it can drop', 'When a topic’s revision date passes, that topic slowly counts for less, down to a quarter of its value over about two weeks. Revise it and it is restored at once. Your ticks are never removed.'],
  ['Points to win back', 'Exactly how much the index rises if you revise those overdue topics today. It is the same formula, not a guess.'],
  ['Revision dates', 'After you first study a topic: revise in 3 days, then 7, 15, 30, and longer each time. If you say you remembered only some of it, the gap stays the same; if little, it goes back to 3 days.'],
  ['Daily target', 'Subtopics left ÷ study days left before your exam, rounded up. The last 15% of your days are kept free for revision. It is worked out again every morning.'],
  ['Streak', 'Days in a row with anything logged. One rest day a week does not break it.'],
  ['Past paper marks', 'Correct × marks per question − wrong × negative marks, using that paper’s scheme. Approximate, because a few questions may have no negative marking.'],
  ['Not enough evidence', 'Shown instead of a number until you have started at least 5 topics. A score from two topics would mislead you.'],
]

/** Every number in the tracker, in plain words. Linked from each "How is this calculated?". */
export default function HowPage() {
  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href="/prep/progress" aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">How it is measured</h1><p className="text-sm text-slate-500">Every number comes only from what you log, using fixed rules.</p></div>
    </header>
    <dl className="space-y-3">{ITEMS.map(([term, text]) => <div key={term} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-sm font-bold">{term}</dt><dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">{text}</dd>
    </div>)}</dl>
    <p className="mt-4 px-1 text-xs text-slate-500">These are study measures, not predictions of marks, rank or selection.</p>
  </main>
}
