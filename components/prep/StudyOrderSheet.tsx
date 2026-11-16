'use client'

import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { isCustom, orderedSubjects, type StudyOrder } from '@/lib/prep/order'

export interface OrderSubject { id: string; title: string; left: number }

/**
 * "Your study order": a few subjects each day or one at a time, and which subject comes first.
 * Nothing is saved until Save. The daily number of subtopics doesn't change, only which ones.
 */
export default function StudyOrderSheet({ subjects, order, onSave, onClose }: {
  subjects: OrderSubject[] // in syllabus order
  order: StudyOrder | null
  onSave: (order: StudyOrder | null) => Promise<boolean>
  onClose: () => void
}) {
  const [mix, setMix] = useState(order?.mix ?? false)
  const [list, setList] = useState(() => orderedSubjects(subjects, order))
  const [moved, setMoved] = useState({ next: order?.next ?? [], later: order?.later ?? [] })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const syllabusIds = subjects.map((s) => s.id)
  const inSyllabusOrder = list.every((s, i) => s.id === syllabusIds[i])
  const draft: StudyOrder = { mix, subjects: inSyllabusOrder ? [] : list.map((s) => s.id), next: moved.next, later: moved.later }
  const movedCount = moved.next.length + moved.later.length

  const shift = (i: number, by: -1 | 1) => setList((cur) => {
    const j = i + by
    if (j < 0 || j >= cur.length) return cur
    const next = [...cur];[next[i], next[j]] = [next[j], next[i]]
    return next
  })
  const reset = () => { setMix(false); setList(subjects); setMoved({ next: [], later: [] }) }
  const save = async () => {
    setBusy(true); setError(null)
    const ok = await onSave(isCustom(draft) ? draft : null)
    setBusy(false)
    if (!ok) { setError('That didn’t save. Please try again.'); return }
    onClose()
  }
  const choice = (on: boolean) => `flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left ${on ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-700'}`
  const dot = (on: boolean) => `mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'}`

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby="order-h" onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-3xl bg-white dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div><h2 id="order-h" className="text-lg font-semibold">Your study order</h2><p className="mt-0.5 text-sm text-slate-500">You still do the same number of subtopics a day. This only changes which ones.</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
        <h3 className="mt-5 text-sm font-semibold">Each day</h3>
        <div role="radiogroup" aria-label="Each day" className="mt-2 space-y-2">
          <button type="button" role="radio" aria-checked={!mix} onClick={() => setMix(false)} className={choice(!mix)}>
            <span className={dot(!mix)}>{!mix && <span className="h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-white" />}</span>
            <span><span className="block text-[15px] font-semibold">One subject at a time</span><span className="block text-sm text-slate-500">Finish a subject before you start the next.</span></span>
          </button>
          <button type="button" role="radio" aria-checked={mix} onClick={() => setMix(true)} className={choice(mix)}>
            <span className={dot(mix)}>{mix && <span className="h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-white" />}</span>
            <span><span className="block text-[15px] font-semibold">A few subjects each day</span><span className="block text-sm text-slate-500">A little of several subjects, so no day is all one subject.</span></span>
          </button>
        </div>

        <h3 className="mt-6 text-sm font-semibold">Order of subjects</h3>
        <p className="mt-0.5 text-sm text-slate-500">{mix ? 'The first subject comes first each day.' : 'Move a subject up to study it sooner.'}</p>
        <ol className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {list.map((s, i) => <li key={s.id} className="flex items-center gap-2 py-1.5 pl-4 pr-1.5">
            <span className="w-5 shrink-0 text-sm tabular-nums text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{s.title}</span><span className="block text-xs text-slate-500">{s.left === 0 ? 'All ticked' : `${s.left} ${s.left === 1 ? 'subtopic' : 'subtopics'} left`}</span></span>
            <button type="button" onClick={() => shift(i, -1)} disabled={i === 0} aria-label={`Move ${s.title} up`} className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-25 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" onClick={() => shift(i, 1)} disabled={i === list.length - 1} aria-label={`Move ${s.title} down`} className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 disabled:opacity-25 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowDown className="h-4 w-4" /></button>
          </li>)}
        </ol>

        {movedCount > 0 && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
          <p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">You moved {movedCount} {movedCount === 1 ? 'subtopic' : 'subtopics'} yourself.</p>
          <button type="button" onClick={() => setMoved({ next: [], later: [] })} className="shrink-0 text-sm font-semibold text-slate-900 underline dark:text-white">Put {movedCount === 1 ? 'it' : 'them'} back</button>
        </div>}

        {isCustom(draft) && <button type="button" onClick={reset} className="mt-4 text-sm font-medium text-slate-500 underline">Go back to the syllabus order</button>}
      </div>

      <div className="border-t border-slate-100 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 dark:border-slate-800">
        {error && <p role="alert" className="mb-2 text-sm font-medium text-rose-600">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-12 rounded-2xl border border-slate-300 text-[15px] font-semibold dark:border-slate-600">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={busy} className="h-12 rounded-2xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  </div>
}

