'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, SlidersHorizontal, X } from 'lucide-react'
import { examInfo } from '@/lib/prep/exam'
import type { PrepPlan } from '@/lib/prep/usePrepData'

interface Manage { removed: PrepPlan[]; onRemove: (templateId: string) => Promise<boolean>; onRestore: (templateId: string) => Promise<boolean> }

/** Which exam the Plan, Syllabus and Progress screens show, plus adding, removing and bringing back exams. */
export default function ExamSwitcher({ plans, current, onPick, manage }: { plans: PrepPlan[]; current: string | null; onPick: (templateId: string) => void; manage?: Manage }) {
  const [open, setOpen] = useState(false)
  // Settings links here with ?exams=1 to open the list straight away.
  useEffect(() => { const t = window.setTimeout(() => { if (manage && new URLSearchParams(window.location.search).get('exams') === '1') setOpen(true) }, 0); return () => window.clearTimeout(t) }, [manage])
  const chip = 'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition'
  return <>
    <div data-guide="exam-switcher" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {plans.length > 1 && plans.map((p) => <button key={p.templateId} type="button" onClick={() => onPick(p.templateId)} aria-pressed={current === p.templateId} className={`${chip} ${current === p.templateId ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{examInfo(p.code).short}</button>)}
      {manage
        ? <button type="button" onClick={() => setOpen(true)} className={`${chip} flex items-center gap-1.5 border border-dashed border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300`}><SlidersHorizontal className="h-3.5 w-3.5" />{plans.length > 1 ? 'Exams' : 'Add or change exam'}</button>
        : <Link href="/prep/start?add=1" className={`${chip} flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 dark:border-slate-600`}><Plus className="h-3.5 w-3.5" />Add exam</Link>}
    </div>
    {open && manage && <ManageExams plans={plans} manage={manage} onClose={() => setOpen(false)} />}
  </>
}

/** Every exam in one place: remove one you were only exploring, bring one back, or add another. Ticks are never lost. */
export function ManageExams({ plans, manage, onClose }: { plans: PrepPlan[]; manage: Manage; onClose: () => void }) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (id: string, fn: () => Promise<boolean>) => { setBusy(id); setError(null); const ok = await fn(); setBusy(null); if (!ok) setError('Could not save. Please try again.'); else setConfirm(null) }
  const when = (p: PrepPlan) => (p.examDate ? new Date(`${p.examDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set')

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Your exams" onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your exams</h2><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-slate-500"><X className="h-5 w-5" /></button></div>
      <p className="mt-1 text-sm text-slate-500">Today shows all of them. Removing an exam keeps its ticks, so adding it back loses nothing.</p>

      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {plans.map((p) => <li key={p.templateId} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="font-semibold">{examInfo(p.code).short}</p><p className="text-xs text-slate-500">{examInfo(p.code).stageName[p.targetStage]} · {when(p)}</p></div>
            {plans.length > 1 && confirm !== p.templateId && <button type="button" disabled={busy !== null} onClick={() => setConfirm(p.templateId)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">Remove</button>}
          </div>
          {confirm === p.templateId && <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-slate-800/60">
            <span className="min-w-0 flex-1">Remove {examInfo(p.code).short}? Its ticks stay saved.</span>
            <button type="button" onClick={() => setConfirm(null)} className="px-2 py-1 text-slate-500">Cancel</button>
            <button type="button" disabled={busy !== null} onClick={() => void run(p.templateId, () => manage.onRemove(p.templateId))} className="rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white dark:bg-white dark:text-slate-900">{busy === p.templateId ? '…' : 'Remove'}</button>
          </div>}
        </li>)}
      </ul>
      {plans.length === 1 && <p className="mt-2 text-xs text-slate-500">This is your only exam. To pause preparation altogether, use Settings.</p>}

      {manage.removed.length > 0 && <>
        <p className="mt-5 text-sm font-semibold">Removed</p>
        <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {manage.removed.map((p) => <li key={p.templateId} className="flex items-center gap-3 px-4 py-3">
            <p className="min-w-0 flex-1 font-semibold text-slate-500">{examInfo(p.code).short}</p>
            <button type="button" disabled={busy !== null} onClick={() => void run(p.templateId, () => manage.onRestore(p.templateId))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium dark:border-slate-700">{busy === p.templateId ? '…' : 'Add back'}</button>
          </li>)}
        </ul>
      </>}

      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      <Link href="/prep/start?add=1" className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"><Plus className="h-4 w-4" />Add an exam</Link>
      <p className="mt-2 text-center text-xs text-slate-500">Just exploring another syllabus? Add it, look around, then remove it here.</p>
    </div>
  </div>
}
