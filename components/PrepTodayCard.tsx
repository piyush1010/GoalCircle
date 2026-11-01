'use client'

import { useEffect, useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { usePrepFeature } from '@/lib/prep/feature'

/**
 * Preparation tracker entry point inside Today, shown only to beta users (public.prep_beta).
 * Milestone 1: confirms the syllabus template is available. Later milestones fill in the plan,
 * revision-due list, snapshot and quick log here.
 */
export default function PrepTodayCard() {
  const enabled = usePrepFeature()
  const [topics, setTopics] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true
    void supabase.from('prep_syllabus_nodes').select('id', { count: 'exact', head: true }).eq('kind', 'topic').is('owner_id', null)
      .then(({ count }) => { if (active) setTopics(count ?? 0) }, () => undefined)
    return () => { active = false }
  }, [enabled])

  if (!enabled) return null
  return (
    <section aria-label="Preparation tracker" className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><GraduationCap className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-base font-bold">Preparation <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800">Beta</span></p>
          <p className="text-sm text-slate-500">{topics === null ? 'Loading your syllabus…' : `UPSC Civil Services syllabus ready: ${topics} official topics.`}</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">Next: the syllabus explorer, then your daily plan, revision-due list and quick log will appear here.</p>
    </section>
  )
}
