'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Plus } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { usePrepData } from '@/lib/prep/usePrepData'

interface Note { id: string; title: string; kind: string; occurred_on: string | null; note: string | null; created_at: string }
const KIND: Record<string, string> = { scheme: 'Scheme', judgment: 'Judgment', report: 'Report', committee: 'Committee', budget: 'Budget data', economic_survey: 'Economic Survey', state_example: 'State example', other: 'Other' }

/** Current-affairs notes, linked to the syllabus and compiled month by month. */
export default function NotesPage() {
  const data = usePrepData(true)
  const [notes, setNotes] = useState<Note[] | null>(null)
  const [links, setLinks] = useState<Map<string, string>>(new Map())
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState('scheme')
  const [topicQuery, setTopicQuery] = useState('')
  const [topicId, setTopicId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: n }, { data: l }] = await Promise.all([
      supabase.from('prep_current_affairs').select('id,title,kind,occurred_on,note,created_at').order('created_at', { ascending: false }).limit(1000),
      supabase.from('prep_current_affairs_links').select('item_id,node_id'),
    ])
    setNotes((n ?? []) as Note[])
    setLinks(new Map(((l ?? []) as { item_id: string; node_id: string }[]).map((x) => [x.item_id, x.node_id])))
  }, [])
  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2500); return () => window.clearTimeout(t) }, [toast])

  const titles = useMemo(() => new Map(data.nodes.map((n) => [n.id, n.title])), [data.nodes])
  const topics = useMemo(() => data.nodes.filter((n) => n.kind === 'topic' && !n.ownerId), [data.nodes])
  const months = useMemo(() => {
    const m = new Map<string, Map<string, Note[]>>()
    for (const n of notes ?? []) {
      const month = (n.occurred_on ?? n.created_at).slice(0, 7)
      const topic = links.get(n.id) ? titles.get(links.get(n.id)!) ?? 'Other topics' : 'Not linked to a topic'
      if (!m.has(month)) m.set(month, new Map())
      const g = m.get(month)!
      g.set(topic, [...(g.get(topic) ?? []), n])
    }
    return [...m].sort((a, b) => b[0].localeCompare(a[0]))
  }, [notes, links, titles])
  const hits = topicQuery.trim().length >= 2 ? topics.filter((t) => t.title.toLowerCase().includes(topicQuery.trim().toLowerCase())).slice(0, 5) : []
  const monthName = (ym: string) => new Date(`${ym}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const add = async () => {
    if (title.trim().length < 3) return
    setBusy(true)
    const { data: row, error } = await supabase.from('prep_current_affairs').insert({ title: title.trim(), kind, occurred_on: localDateString() }).select('id').single()
    if (!error && row && topicId) await supabase.from('prep_current_affairs_links').insert({ item_id: row.id, node_id: topicId })
    if (!error) await data.logEvent(null, 'current_affairs', { details: { note: true } })
    setBusy(false)
    if (error) { setToast('Could not save.'); return }
    setTitle(''); setTopicId(null); setTopicQuery(''); setToast('Saved.'); void load()
  }
  const copyMonth = async (ym: string, groups: Map<string, Note[]>) => {
    const text = [`Current affairs: ${monthName(ym)}`, ...[...groups].flatMap(([topic, list]) => ['', topic, ...list.map((n) => `- ${n.title} (${KIND[n.kind] ?? n.kind})${n.note ? `: ${n.note}` : ''}`)])].join('\n')
    try { await navigator.clipboard.writeText(text); setToast('Copied. Paste it into your notes.') } catch { setToast('Could not copy on this device.') }
  }

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href="/prep/progress" aria-label="Back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Current affairs</h1><p className="text-sm text-slate-500">Linked to your syllabus, compiled by month</p></div>
    </header>

    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. SC ruling on Governor's assent timelines" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
      <div className="mt-2 flex flex-wrap gap-1.5">{Object.entries(KIND).map(([k, l]) => <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${kind === k ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>{l}</button>)}</div>
      {topicId ? <button type="button" onClick={() => setTopicId(null)} className="mt-2 w-full rounded-xl border border-amber-500 bg-amber-500/10 px-3 py-2 text-left text-sm font-semibold">{titles.get(topicId)} ×</button>
        : <><input value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} placeholder="Link to a topic (optional)" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          {hits.length > 0 && <ul className="mt-1 rounded-xl border border-slate-200 dark:border-slate-700">{hits.map((t) => <li key={t.id}><button type="button" onClick={() => setTopicId(t.id)} className="w-full px-3 py-2 text-left text-sm">{t.title}</button></li>)}</ul>}</>}
      <button type="button" disabled={busy || title.trim().length < 3} onClick={() => void add()} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"><Plus className="h-4 w-4" />Add note</button>
    </section>

    {notes && notes.length === 0 && <p className="mt-3 rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">One line a day from the newspaper adds up to a full revision file by exam time.</p>}
    {months.map(([ym, groups]) => <section key={ym} className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between"><h2 className="text-base">{monthName(ym)}</h2><button type="button" onClick={() => void copyMonth(ym, groups)} className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"><Copy className="h-3.5 w-3.5" />Copy month</button></div>
      {[...groups].map(([topic, list]) => <div key={topic} className="mt-2"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{topic}</p><ul className="mt-1 space-y-1 text-sm">{list.map((n) => <li key={n.id}>· {n.title} <span className="text-xs text-slate-500">({KIND[n.kind] ?? n.kind})</span></li>)}</ul></div>)}
    </section>)}
    {toast && <div role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toast}</div>}
  </main>
}
