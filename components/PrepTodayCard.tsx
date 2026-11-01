'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, GraduationCap } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { usePrepFeature } from '@/lib/prep/feature'
import { localDateString } from '@/lib/exams'

/**
 * Preparation tracker entry point inside Today, shown only to beta users (public.prep_beta).
 * One line of facts and a way in; the plan, revision list and quick log join it in Milestone 3.
 */
export default function PrepTodayCard() {
  const enabled = usePrepFeature()
  const [counts, setCounts] = useState<{ topics: number; touched: number; due: number } | null>(null)

  useEffect(() => {
    if (!enabled) return
    let active = true
    const today = localDateString()
    void Promise.all([
      supabase.from('prep_syllabus_nodes').select('id', { count: 'exact', head: true }).eq('kind', 'topic').is('owner_id', null),
      supabase.from('prep_topic_state').select('node_id', { count: 'exact', head: true }).not('touched_on', 'is', null),
      supabase.from('prep_topic_state').select('node_id', { count: 'exact', head: true }).lt('next_revision_on', today),
    ]).then(([topics, touched, due]) => { if (active) setCounts({ topics: topics.count ?? 0, touched: touched.count ?? 0, due: due.count ?? 0 }) }, () => undefined)
    return () => { active = false }
  }, [enabled])

  if (!enabled) return null
  const line = !counts ? 'Loading your syllabus…'
    : counts.touched === 0 ? `UPSC syllabus ready: ${counts.topics} topics. Tap to log your first one.`
    : `${counts.touched} of ${counts.topics} topics touched${counts.due ? ` · ${counts.due} revision due` : ''}`
  return (
    <Link href="/prep" aria-label="Open your syllabus" className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-500 dark:border-slate-800 dark:bg-slate-900">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><GraduationCap className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-base font-bold">Preparation <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800">Beta</span></span>
        <span className={`block text-sm ${counts?.due ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{line}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </Link>
  )
}
