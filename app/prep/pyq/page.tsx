'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { examInfo, netMarks, type PyqPaper } from '@/lib/prep/exam'
import { confirmAction } from '@/lib/confirm'
import { usePrepData } from '@/lib/prep/usePrepData'
import HelpButton from '@/components/HelpButton'

interface Attempt { id: string; paper: string | null; year: number | null; attempted: number; correct: number; attempted_on: string }

/** Past papers, year by year: attempt a full paper, log attempted and correct, see accuracy and marks over the years. */
export default function PyqPage() {
  const data = usePrepData(true)
  const [rows, setRows] = useState<Attempt[] | null>(null)
  const [open, setOpen] = useState<{ paper: PyqPaper; year: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const exam = examInfo(data.template?.code)
  const code = data.template?.code ?? null

  const load = useCallback(async () => {
    if (!code) return
    const { data: r } = await supabase.from('prep_pyq_attempts').select('id,paper,year,attempted,correct,attempted_on').eq('exam', code).not('year', 'is', null).order('attempted_on', { ascending: false }).limit(500)
    setRows((r ?? []) as Attempt[])
  }, [code])
  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3000); return () => window.clearTimeout(t) }, [toast])

  // Latest attempt per paper and year.
  const latest = useMemo(() => { const m = new Map<string, Attempt>(); for (const r of rows ?? []) { const k = `${r.paper}:${r.year}`; if (!m.has(k)) m.set(k, r) } return m }, [rows])
  const years = useMemo(() => { const out: number[] = []; for (let y = exam.pyqYears[1]; y >= exam.pyqYears[0]; y--) out.push(y); return out }, [exam.pyqYears])

  if (data.status === 'loading' || (data.status === 'ready' && !rows)) return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2].map((k) => <div key={k} className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (data.status !== 'ready') return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">{data.status === 'denied' ? 'Not available yet' : "Couldn't load past papers"}</h1><Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Back to Today</Link></div></main>

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href="/prep/progress" aria-label="Back to progress" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Past papers</h1><p className="text-sm text-slate-500">{exam.short} · solve a full year&apos;s paper in exam time, then log it</p></div>
      <HelpButton />
    </header>

    {exam.pyqPapers.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">Year-by-year scoring isn&apos;t set up for {exam.short} yet. Log past-paper practice with Log on Today.</p>}
    {exam.pyqPapers.map((p) => {
      const done = years.map((y) => latest.get(`${p.code}:${y}`)).filter(Boolean) as Attempt[]
      const marks = done.map((a) => netMarks(p, a.attempted, a.correct).marks)
      const avg = marks.length ? Math.round((marks.reduce((x, y) => x + y, 0) / marks.length) * 10) / 10 : null
      return <section key={p.code} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-baseline justify-between gap-3"><h2 className="text-base">{p.label}</h2><p className="text-xs text-slate-500">{done.length} of {years.length} years{avg !== null ? ` · avg ${avg}/${Math.round(p.questions * p.plus)}` : ''}</p></div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{years.map((y) => {
          const a = latest.get(`${p.code}:${y}`)
          const n = a ? netMarks(p, a.attempted, a.correct) : null
          return <button key={y} type="button" onClick={() => setOpen({ paper: p, year: y })} className={`rounded-xl border px-2 py-2.5 text-left ${a ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-slate-200 dark:border-slate-700'}`}>
            <span className="block text-sm font-bold tabular-nums">{y}</span>
            <span className="block text-[11px] text-slate-500">{n ? `${n.marks} marks · ${n.accuracy ?? 0}%` : 'Not done'}</span>
          </button>
        })}</div>
        <p className="mt-2 text-[11px] text-slate-500">Marks use the paper&apos;s scheme (+{+p.plus.toFixed(2)}, −{+p.minus.toFixed(2)}) and are approximate; questions without negative marking are not separated.</p>
      </section>
    })}

    {open && <PyqSheet paper={open.paper} year={open.year} previous={latest.get(`${open.paper.code}:${open.year}`) ?? null} onClose={() => setOpen(null)} onRemove={async (id) => {
      const { error } = await supabase.from('prep_pyq_attempts').delete().eq('id', id)
      if (error) return false
      await load(); setToast(`Removed that attempt at ${open.paper.label} ${open.year}.`)
      return true
    }} onSave={async (attempted, correct) => {
      const { error } = await supabase.from('prep_pyq_attempts').insert({ exam: code, paper: open.paper.code, year: open.year, attempted, correct, attempted_on: localDateString() })
      if (error) return false
      await data.logEvent(null, 'pyq', { quantity: attempted, details: { correct, year: open.year, paper: open.paper.code } })
      await load()
      setToast(`${open.paper.label} ${open.year} saved.`)
      return true
    }} />}
    {toast && <div role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toast}</div>}
  </main>
}

function PyqSheet({ paper, year, previous, onClose, onSave, onRemove }: { paper: PyqPaper; year: number; previous: Attempt | null; onClose: () => void; onSave: (attempted: number, correct: number) => Promise<boolean>; onRemove: (id: string) => Promise<boolean> }) {
  const [attempted, setAttempted] = useState(previous ? String(previous.attempted) : '')
  const [correct, setCorrect] = useState(previous ? String(previous.correct) : '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const a = Number(attempted), c = Number(correct)
  const valid = attempted !== '' && correct !== '' && a >= 0 && c >= 0 && c <= a && a <= paper.questions
  const preview = valid ? netMarks(paper, a, c) : null
  const input = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900'
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`${paper.label} ${year}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><h2 className="text-lg">{paper.label} {year}</h2><p className="text-sm text-slate-500">{paper.questions} questions{previous ? ` · last done ${previous.attempted_on}` : ''}</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button></div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Attempted<input inputMode="numeric" value={attempted} onChange={(e) => setAttempted(e.target.value.replace(/\D/g, ''))} className={input} /></label>
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Correct<input inputMode="numeric" value={correct} onChange={(e) => setCorrect(e.target.value.replace(/\D/g, ''))} className={input} /></label>
      </div>
      {preview && <p className="mt-3 text-sm">About <b>{preview.marks}</b> of {preview.max} marks · {preview.accuracy}% accuracy</p>}
      {!valid && attempted !== '' && correct !== '' && <p className="mt-3 text-sm text-rose-600">Correct cannot exceed attempted, and attempted cannot exceed {paper.questions}.</p>}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
      <button type="button" disabled={!valid || busy} onClick={async () => { setBusy(true); const ok = await onSave(a, c); setBusy(false); if (ok) onClose(); else setError('Could not save. Please try again.') }} className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-50">{previous ? 'Save new attempt' : 'Save'}</button>
      {previous && <button type="button" disabled={busy} onClick={async () => { if (!(await confirmAction(`Remove your ${previous.attempted_on} attempt at ${paper.label} ${year}?`, { confirmLabel: 'Remove', danger: true }))) return; setBusy(true); const ok = await onRemove(previous.id); setBusy(false); if (ok) onClose(); else setError('Could not remove. Please try again.') }} className="mt-2 w-full py-2 text-center text-sm font-medium text-rose-600 dark:text-rose-400">Remove the last attempt</button>}
    </div>
  </div>
}
