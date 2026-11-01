'use client'

import Link from 'next/link'
import { BookOpen, Droplets, Dumbbell, Footprints, Moon, NotebookPen, PenLine, Smartphone, UsersRound } from 'lucide-react'

// Small, specific daily habits that work for anyone, not only exam aspirants.
const STARTERS = [
  { icon: Footprints, label: 'Move', title: 'Walk or move for 30 minutes', category: 'fitness' },
  { icon: BookOpen, label: 'Read', title: 'Read 20 pages', category: 'learning' },
  { icon: Droplets, label: 'Water', title: 'Drink 8 glasses of water', category: 'habits' },
  { icon: Moon, label: 'Sleep', title: 'Sleep by 11 PM', category: 'habits' },
  { icon: NotebookPen, label: 'Journal', title: 'Write 3 lines in my journal', category: 'habits' },
  { icon: Smartphone, label: 'Less phone', title: 'No phone for the first hour after waking', category: 'habits' },
  { icon: Dumbbell, label: 'Workout', title: 'Work out for 45 minutes', category: 'fitness' },
  { icon: PenLine, label: 'Study', title: 'Study for 2 focused hours', category: 'learning' },
] as const

const goalLink = (title: string, category: string) => `/create-goal?title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}`

/** First-day screen on Today: pick one small habit in one tap, or take the student / coach path. */
export default function StarterGoals() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold">Start with one small habit</h3>
      <p className="mt-0.5 text-sm text-slate-500">Pick one you can do every day. You can change it later.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {STARTERS.map(({ icon: Icon, label, title, category }) => (
          <Link key={label} href={goalLink(title, category)} className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-amber-500 active:scale-[.98] dark:border-slate-700">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-sm font-bold">{label}</span><span className="block truncate text-xs text-slate-500">{title}</span></span>
          </Link>
        ))}
      </div>
      <Link href="/create-goal" className="mt-3 block rounded-xl bg-amber-500 py-3 text-center text-sm font-bold text-slate-950 shadow-sm">Write my own goal</Link>
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
        <p className="text-slate-600 dark:text-slate-300"><b>Joining your mentor&apos;s batch?</b> Open the invite link they shared and tap Join.</p>
        <Link href="/circles?create=1" className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400"><UsersRound className="h-4 w-4" />Coach or mentor? Create a batch for your students</Link>
      </div>
    </div>
  )
}
