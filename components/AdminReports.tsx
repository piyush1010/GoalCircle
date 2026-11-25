'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'

interface Row {
  kind: 'person' | 'post' | 'answer'; id: string; reason: string; created_at: string; reporters: number
  about_name: string | null; about_username: string | null; post_id: string | null; excerpt: string | null; hidden: boolean
}

const REASON: Record<string, string> = { spam: 'Spam or an advert', rude: 'Rude or hurtful', wrong_place: 'Not about this community', other: 'Something else' }
const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

/** Admin: open reports about people, posts and answers. Hidden until its migration has run. */
export default function AdminReports() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void supabase.rpc('admin_reports').then(({ data, error }) => { if (alive) setRows(error ? null : (data ?? []) as Row[]) })
    return () => { alive = false }
  }, [])

  const close = async (r: Row) => {
    setBusy(r.id)
    const { error } = await supabase.rpc('admin_close_report', { report_kind: r.kind, target: r.id })
    setBusy(null)
    if (!error) setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id))
  }

  if (!rows) return null
  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base">Reports to look at</h2>
    <p className="mt-0.5 text-xs text-slate-500">Open each one, remove or hide anything that breaks the rules, then press Done. Try to clear this within a day.</p>
    {rows.length === 0 ? <p className="mt-1 text-sm text-slate-500">Nothing reported.</p>
      : <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{rows.map((r) => {
          const who = r.about_name || (r.about_username ? `@${r.about_username}` : 'A member')
          const href = r.kind === 'person' ? (r.about_username ? `/u/${r.about_username}` : null) : r.post_id ? `/discuss/${r.post_id}` : null
          return <li key={`${r.kind}-${r.id}`} className="py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.kind === 'person' ? who : `${r.kind === 'post' ? 'Post' : 'Answer'} by ${who}`}{r.hidden && <span className="font-normal text-slate-500"> (hidden)</span>}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{r.reason.split(' / ').map((x) => REASON[x] ?? x).join('; ')}</p>
                {r.excerpt && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{r.excerpt}</p>}
                <p className="mt-0.5 text-xs text-slate-500">{Number(r.reporters) === 1 ? '1 person' : `${r.reporters} people`}, last on {day(r.created_at)}{href && <> <Link href={href} className="font-semibold text-slate-900 underline underline-offset-2 dark:text-white">Open</Link></>}</p>
              </div>
              <button type="button" disabled={busy === r.id} onClick={() => void close(r)} className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-50 dark:border-slate-700">Done</button>
            </div>
          </li>
        })}</ul>}
  </section>
}
