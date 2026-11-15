'use client'

import Link from 'next/link'
import { BookOpen, Briefcase, ChefHat, Dumbbell, HeartPulse, Plane, Plus, Target, UsersRound, type LucideIcon } from 'lucide-react'

export interface GoalCircle {
  key: string
  label: string
  /** Short text shown inside the circle, such as an exam name. Personal goals show an icon instead. */
  short?: string
  category?: string | null
  href: string
  onOpen?: () => void
  /** Today's progress, 0 to 1. */
  progress: number
  /** A batch this person runs: marked with an outline. */
  runs?: boolean
}

const ICONS: Record<string, LucideIcon> = { fitness: Dumbbell, learning: BookOpen, reading: BookOpen, habits: HeartPulse, health: HeartPulse, work: Briefcase, community: UsersRound, cooking: ChefHat, travel: Plane }

const R = 29
const C = 2 * Math.PI * R

/** Your goals as circles: exams, personal goals and the batches you run, each with today's progress around it. */
export default function GoalCircles({ items }: { items: GoalCircle[] }) {
  return <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map((g) => {
      const Icon = g.runs ? UsersRound : ICONS[g.category ?? ''] ?? Target
      const full = g.progress >= 1
      return <Link key={g.key} href={g.href} onClick={g.onOpen} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
        <span className="relative grid h-16 w-16 place-items-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-16 w-16 -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r={R} fill="none" strokeWidth="3" className="stroke-slate-200 dark:stroke-slate-700" />
            {g.progress > 0 && <circle cx="32" cy="32" r={R} fill="none" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${Math.min(1, g.progress) * C} ${C}`} className={full ? 'stroke-emerald-600' : 'stroke-amber-500'} style={{ transition: 'stroke-dasharray 0.5s' }} />}
          </svg>
          <span className={`grid h-[52px] w-[52px] place-items-center rounded-full bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 ${g.runs ? 'outline outline-2 outline-offset-2 outline-amber-500' : ''}`}>
            {g.short ? <span className="px-1 text-center text-[11px] font-bold leading-tight">{g.short}</span> : <Icon className="h-5 w-5" aria-hidden="true" />}
          </span>
        </span>
        <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight text-slate-600 dark:text-slate-300">{g.label}</span>
      </Link>
    })}
    <Link href="/start" className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
      <span className="grid h-16 w-16 place-items-center"><span className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-dashed border-slate-300 text-slate-500 dark:border-slate-600"><Plus className="h-5 w-5" aria-hidden="true" /></span></span>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Add</span>
    </Link>
  </div>
}
