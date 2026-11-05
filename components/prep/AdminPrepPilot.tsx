'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

interface Row {
  user_id: string; name: string; exams: string[]; setup_done: boolean; joined: string; last_active: string | null
  days_active: number; ticks: number; revisions: number; minutes: number; overdue: number; daily: number[]
}

const ago = (iso: string | null) => {
  if (!iso) return 'Never logged'
  const h = (Date.parse(new Date().toISOString()) - Date.parse(iso)) / 3_600_000
  return h < 1 ? 'Within the hour' : h < 24 ? `${Math.floor(h)} h ago` : `${Math.floor(h / 24)} day${Math.floor(h / 24) === 1 ? '' : 's'} ago`
}
const short = (exam: string) => exam.replace(/ Civil Services.*$/, ' CSE').replace(/\s*\(.*\)$/, '')

/**
 * Admin: how each person preparing is using the tracker. Counts only — no notes, mistakes or posts.
 * Each square is one of the last 14 days; darker means more subtopics ticked and revisions done.
 */
export default function AdminPrepPilot() {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    let alive = true
    void supabase.rpc('admin_prep_pilot').then(({ data, error }) => { if (alive) setRows(error ? [] : (data ?? []) as Row[]) })
    return () => { alive = false }
  }, [])
  if (!rows) return null
  const active = rows.filter((r) => r.days_active >= 4).length
  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base">Exam preparation pilot{rows.length > 0 && <span className="ml-2 text-sm font-normal text-slate-500">{active} of {rows.length} studied on 4+ days</span>}</h2>
    <p className="mt-0.5 text-xs text-slate-500">Each square is a day (last 14); darker means more done. Counts only; nobody&apos;s notes or posts are shown.</p>
    {rows.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nobody has set up a plan yet.</p>
      : <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r) => <li key={r.user_id} className="py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">{r.name}</span>
            <span className={`shrink-0 text-xs ${r.last_active && Date.parse(new Date().toISOString()) - Date.parse(r.last_active) < 2 * 86_400_000 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{ago(r.last_active)}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{r.exams.map(short).join(' + ')}{r.setup_done ? '' : ' · setup not finished'} · joined {new Date(`${r.joined}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
          <div className="mt-2 flex gap-[3px]" aria-label={`Activity over 14 days: ${r.daily.join(', ')}`}>{r.daily.map((n, i) => <span key={i} title={`${n}`} className={`h-4 flex-1 rounded-[3px] ${n === 0 ? 'bg-slate-100 dark:bg-slate-800' : n < 3 ? 'bg-amber-200 dark:bg-amber-900' : n < 6 ? 'bg-amber-400 dark:bg-amber-700' : 'bg-amber-600 dark:bg-amber-500'}`} />)}</div>
          <p className="mt-1.5 text-xs tabular-nums text-slate-600 dark:text-slate-300">{r.days_active} of 14 days active · this week {r.ticks} subtopics · {r.revisions} revisions · {r.minutes >= 60 ? `${(r.minutes / 60).toFixed(1)} h` : `${r.minutes} min`} focused{r.overdue ? ` · ${r.overdue} overdue` : ''}</p>
        </li>)}</ul>}
  </section>
}
