'use client'

import Link from 'next/link'
import { Plus } from 'lucide-react'
import { examInfo } from '@/lib/prep/exam'
import type { PrepPlan } from '@/lib/prep/usePrepData'

/** Which exam the Plan, Syllabus and Progress screens show. Hidden for one exam except for "Add exam". */
export default function ExamSwitcher({ plans, current, onPick }: { plans: PrepPlan[]; current: string | null; onPick: (templateId: string) => void }) {
  return <div data-guide="exam-switcher" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
    {plans.length > 1 && plans.map((p) => <button key={p.templateId} type="button" onClick={() => onPick(p.templateId)} aria-pressed={current === p.templateId} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${current === p.templateId ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{examInfo(p.code).short}</button>)}
    <Link href="/prep/start?add=1" className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-500 dark:border-slate-600"><Plus className="h-3.5 w-3.5" />{plans.length > 1 ? 'Add' : 'Add another exam'}</Link>
  </div>
}
