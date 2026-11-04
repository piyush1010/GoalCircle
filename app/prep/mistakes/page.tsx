'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check, Plus, RotateCcw } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { MISTAKE_LABEL, mistakeSummary } from '@/lib/prep/insights'
import { daysBetween } from '@/lib/prep/revision'
import { usePrepData } from '@/lib/prep/usePrepData'
import HelpButton from '@/components/HelpButton'
import MistakeSheet from '@/components/prep/MistakeSheet'

/** Mistake notebook: every wrong answer worth remembering, revisited until it sticks. */
export default function MistakesPage() {
  const data = usePrepData(true)
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const today = localDateString()
  const summary = useMemo(() => mistakeSummary(data.mistakes), [data.mistakes])
  const titles = useMemo(() => new Map(data.nodes.map((n) => [n.id, n.title])), [data.nodes])
  useEffect(() => { if (new URLSearchParams(window.location.search).get('add') !== '1') return; const t = window.setTimeout(() => setAdding(true), 0); return () => window.clearTimeout(t) }, [])

  if (data.status === 'loading') return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3].map((k) => <div key={k} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (data.status !== 'ready') return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">{data.status === 'denied' ? 'Not available yet' : "Couldn't load your notebook"}</h1><Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Back to Today</Link></div></main>

  const done = data.mistakes.filter((m) => m.resolvedOn)
  const toggle = async (id: string, resolved: boolean) => { setBusy(id); await data.resolveMistake(id, resolved); setBusy(null) }

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Mistake notebook</h1><p className="text-sm text-slate-500">{summary.open.length} to revisit · {done.length} fixed</p></div>
      <button type="button" onClick={() => setAdding(true)} className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950"><Plus className="h-4 w-4" />Add</button>
      <HelpButton />
    </header>

    {summary.topTypes.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Your commonest mistakes</p>
      <ul className="mt-2 space-y-1.5">{summary.topTypes.map((t) => <li key={t.category} className="flex items-center gap-3 text-sm"><span className="min-w-0 flex-1 font-semibold">{t.label}</span><span className="tabular-nums text-slate-500">{t.count}</span></li>)}</ul>
      {summary.topTypes[0] && ['misread_statement', 'extreme_word', 'careless', 'overthinking', 'similar_options', 'incorrect_elimination', 'blind_guess'].includes(summary.topTypes[0].category) && <p className="mt-2 text-xs text-slate-500">This is an exam-technique mistake, not a knowledge gap. Read every statement twice in your next mock.</p>}
    </section>}

    {data.mistakes.length === 0
      ? <section className="mt-3 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700"><p className="font-bold">No mistakes logged yet</p><p className="mt-1 text-sm text-slate-500">After a mock or a PYQ set, add the questions you got wrong. Reviewing your own mistakes is one of the highest-return habits in preparation.</p></section>
      : <section className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="px-4 pt-3 text-xs font-bold uppercase tracking-wide text-slate-500">To revisit</p>
          {summary.open.length === 0 && <p className="px-4 py-3 text-sm text-slate-500">All caught up.</p>}
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{summary.open.map((m) => <li key={m.id} className="flex items-start gap-3 px-4 py-3">
            <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-snug">{m.note ?? MISTAKE_LABEL[m.category]}</span><span className="block text-xs text-slate-500">{[m.note ? MISTAKE_LABEL[m.category] : null, m.nodeId ? titles.get(m.nodeId) : null, `${daysBetween(m.createdOn, today)}d ago`].filter(Boolean).join(' · ')}</span></span>
            <button type="button" disabled={busy !== null} onClick={() => void toggle(m.id, true)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 dark:border-slate-600"><Check className="h-3.5 w-3.5" />Got it</button>
          </li>)}</ul>
          {done.length > 0 && <button type="button" onClick={() => setShowDone(!showDone)} className="w-full border-t border-slate-100 px-4 py-2.5 text-left text-xs font-bold text-slate-600 dark:border-slate-800 dark:text-slate-300">{showDone ? 'Hide' : 'Show'} {done.length} fixed</button>}
          {showDone && <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">{done.map((m) => <li key={m.id} className="flex items-start gap-3 px-4 py-2.5 text-slate-500">
            <span className="min-w-0 flex-1 text-sm line-through decoration-slate-300">{m.note ?? MISTAKE_LABEL[m.category]}</span>
            <button type="button" disabled={busy !== null} onClick={() => void toggle(m.id, false)} aria-label="Revisit again" className="shrink-0 text-slate-400"><RotateCcw className="h-4 w-4" /></button>
          </li>)}</ul>}
        </section>}

    {adding && <MistakeSheet nodes={data.nodes} onSave={data.addMistake} onClose={() => setAdding(false)} />}
  </main>
}
