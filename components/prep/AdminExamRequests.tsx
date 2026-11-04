'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

interface Row { exam_name: string; requests: number; latest: string; details: string[] | null }

/** Admin: which exams students are asking for, most requested first. */
export default function AdminExamRequests() {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    let alive = true
    void supabase.rpc('admin_exam_requests').then(({ data, error }) => { if (alive) setRows(error ? [] : (data ?? []) as Row[]) })
    return () => { alive = false }
  }, [])
  if (!rows) return null
  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base">Exam requests</h2>
    {rows.length === 0 ? <p className="mt-1 text-sm text-slate-500">No requests yet.</p>
      : <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r) => <li key={r.exam_name} className="py-2">
          <div className="flex items-baseline justify-between gap-3"><span className="font-semibold">{r.exam_name}</span><span className="text-sm tabular-nums text-slate-500">{r.requests} request{Number(r.requests) === 1 ? '' : 's'}</span></div>
          {r.details && r.details.length > 0 && <p className="mt-0.5 text-xs text-slate-500">{r.details.join(' · ')}</p>}
        </li>)}</ul>}
  </section>
}
