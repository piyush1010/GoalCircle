'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { confirmAction } from '@/lib/confirm'

interface Row { exam_name: string; requests: number; latest: string; details: string[] | null }

/** Admin: which exams students are asking for, most requested first. */
export default function AdminExamRequests() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  // A planner has been built: notify everyone who asked, and take the exam off this list.
  const markAdded = async (r: Row) => {
    const people = Number(r.requests)
    if (!(await confirmAction(`Mark ${r.exam_name} as added? ${people === 1 ? 'The person' : `The ${people} people`} who asked will get a notification that its planner is ready.`, { confirmLabel: 'Mark as added', danger: false }))) return
    setBusy(r.exam_name); setNote(null)
    const { data, error } = await supabase.rpc('admin_mark_exam_added', { request_name: r.exam_name })
    setBusy(null)
    if (error) { setNote('That didn’t save. Please try again.'); return }
    setRows((cur) => (cur ?? []).filter((x) => x.exam_name !== r.exam_name))
    setNote(`${r.exam_name}: ${Number(data) || 0} ${Number(data) === 1 ? 'person' : 'people'} told.`)
  }
  useEffect(() => {
    let alive = true
    void supabase.rpc('admin_exam_requests').then(({ data, error }) => { if (alive) setRows(error ? [] : (data ?? []) as Row[]) })
    return () => { alive = false }
  }, [])
  if (!rows) return null
  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base">Exam requests</h2>
    <p className="mt-0.5 text-xs text-slate-500">When you add a planner, press Planner added to tell everyone who asked.</p>
    {note && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-300">{note}</p>}
    {rows.length === 0 ? <p className="mt-1 text-sm text-slate-500">No requests yet.</p>
      : <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r) => <li key={r.exam_name} className="py-2">
          <div className="flex items-center justify-between gap-3"><span className="min-w-0 flex-1 font-semibold">{r.exam_name}</span><span className="text-sm tabular-nums text-slate-500">{r.requests} request{Number(r.requests) === 1 ? '' : 's'}</span><button type="button" disabled={busy !== null} onClick={() => void markAdded(r)} className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium dark:border-slate-700">{busy === r.exam_name ? '…' : 'Planner added'}</button></div>
          {r.details && r.details.length > 0 && <p className="mt-0.5 text-xs text-slate-500">{r.details.join(' · ')}</p>}
        </li>)}</ul>}
  </section>
}
