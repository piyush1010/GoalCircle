'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { daysBetween } from '@/lib/prep/revision'

interface Row {
  name: string; shared: boolean; scope: 'nothing' | 'summary' | 'full'
  exam?: string | null; exam_date?: string | null; target_stage?: string | null
  ticked?: number; subtopics?: number; overdue?: number; last_active?: string | null
  week?: { days: number; ticks: number; revisions: number; answers: number; pyqs: number }
  mocks?: { name: string; taken_on: string; score: number | null; max: number | null }[]
  open_mistakes?: number
}

/** Mentor view of a batch: only what each student has chosen to share. */
export default function BatchPrepPage() {
  const [circleId, setCircleId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const today = localDateString()

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('circle')
    if (!id) { const t = window.setTimeout(() => setError('No batch selected.'), 0); return () => window.clearTimeout(t) }
    let alive = true
    void supabase.rpc('prep_mentor_view', { target_circle: id }).then(({ data, error: e }) => {
      if (!alive) return
      setCircleId(id)
      if (e) setError(e.code === '42501' ? 'Only the batch mentor can see this page.' : 'Could not load. Please try again.')
      else setRows((data ?? []) as Row[])
    })
    return () => { alive = false }
  }, [])

  const shared = rows?.filter((r) => r.shared) ?? []
  const notShared = rows?.filter((r) => !r.shared) ?? []

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href={circleId ? `/circles/${circleId}` : '/circles'} aria-label="Back to batch" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Students&apos; preparation</h1><p className="text-sm text-slate-500">{rows ? `${shared.length} of ${rows.length} students share with you` : 'Loading…'}</p></div>
    </header>

    {error && <p className="rounded-2xl border border-rose-300 bg-white p-4 text-sm dark:border-rose-900 dark:bg-slate-900">{error}</p>}
    {!rows && !error && <div className="space-y-3" aria-busy="true">{[1, 2, 3].map((k) => <div key={k} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>}

    {rows && <p className="mb-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-900 dark:text-emerald-200"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Students choose what to share from their Progress screen. Numbers come only from what they log; they are not marks or predictions.</p>}

    <div className="space-y-3">{shared.map((r, i) => {
      const inactive = r.last_active ? daysBetween(r.last_active, today) : null
      const pct = r.subtopics ? Math.round((100 * (r.ticked ?? 0)) / r.subtopics) : 0
      return <section key={`${r.name}-${i}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1"><p className="font-bold">{r.name}</p><p className="text-xs text-slate-500">{r.exam ?? 'No exam set'}{r.target_stage ? ` · ${r.target_stage === 'mains' ? 'Mains' : 'Prelims'}` : ''}{r.exam_date ? ` · ${Math.max(0, daysBetween(today, r.exam_date))} days left` : ''}</p></div>
          {inactive !== null && inactive >= 3 && <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-400">Inactive {inactive}d</span>}
          {inactive === null && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800">Not started</span>}
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} /></div>
        <p className="mt-1 text-xs text-slate-500">{r.ticked ?? 0} of {r.subtopics ?? 0} subtopics ticked · {r.overdue ?? 0} revision{r.overdue === 1 ? '' : 's'} overdue</p>
        {r.week && <p className="mt-1 text-xs text-slate-500">This week: {r.week.days} study day{r.week.days === 1 ? '' : 's'}, {r.week.ticks} subtopics, {r.week.revisions} revisions{r.week.answers ? `, ${r.week.answers} answers` : ''}{r.week.pyqs ? `, ${r.week.pyqs} PYQs` : ''}</p>}
        {r.scope === 'full' && <div className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          {r.mocks && r.mocks.length > 0 ? <p>Mocks: {r.mocks.map((m) => `${m.name} ${m.score ?? '–'}${m.max ? `/${m.max}` : ''}`).join(' · ')}</p> : <p>No mocks logged.</p>}
          <p>{r.open_mistakes ?? 0} mistakes to revisit</p>
        </div>}
      </section>
    })}</div>

    {notShared.length > 0 && <section className="mt-3 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
      <p className="flex items-center gap-2 text-sm font-bold"><Lock className="h-4 w-4 text-slate-400" />Not shared ({notShared.length})</p>
      <p className="mt-1 text-xs text-slate-500">{notShared.map((r) => r.name).join(', ')}</p>
      <p className="mt-2 text-xs text-slate-500">They can turn on sharing from Preparation → Progress → Share with your mentor.</p>
    </section>}
  </main>
}
