'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

interface Row { message: string; page: string | null; created_at: string; name: string }

/** Admin: what people wrote in "Send feedback", newest first. */
export default function AdminFeedback() {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    let alive = true
    void supabase.rpc('admin_feedback', { max_rows: 30 }).then(({ data, error }) => { if (alive) setRows(error ? [] : (data ?? []) as Row[]) })
    return () => { alive = false }
  }, [])
  if (!rows) return null
  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base">Feedback</h2>
    {rows.length === 0 ? <p className="mt-1 text-sm text-slate-500">No feedback yet.</p>
      : <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r, i) => <li key={`${r.created_at}-${i}`} className="py-2.5">
          <p className="whitespace-pre-line text-sm">{r.message}</p>
          <p className="mt-1 text-xs text-slate-500">{r.name} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{r.page ? ` · ${r.page}` : ''}</p>
        </li>)}</ul>}
  </section>
}
