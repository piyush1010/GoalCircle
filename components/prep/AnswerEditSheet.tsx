'use client'

import { useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import type { AnswerRow } from '@/lib/prep/usePrepData'

/** Change how many answers a log entry counts, or whether they were timed. */
export default function AnswerEditSheet({ row, title, onSave, onClose }: {
  row: AnswerRow; title: string
  onSave: (next: { count: number; timed: boolean }) => Promise<boolean>
  onClose: () => void
}) {
  const [count, setCount] = useState(row.count)
  const [timed, setTimed] = useState(row.timed)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => { setBusy(true); setError(null); const ok = await onSave({ count, timed }); setBusy(false); if (ok) onClose(); else setError('Could not save. Please try again.') }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Edit answers" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg">Edit answers</h2><p className="truncate text-sm text-slate-500">{title} · {row.writtenOn}</p></div><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button></div>
      <div className="mt-5 flex items-center justify-center gap-6">
        <button type="button" onClick={() => setCount(Math.max(1, count - 1))} aria-label="One fewer" className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Minus className="h-4 w-4" /></button>
        <span className="w-16 text-center text-4xl font-semibold tabular-nums" aria-live="polite">{count}</span>
        <button type="button" onClick={() => setCount(Math.min(50, count + 1))} aria-label="One more" className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Plus className="h-4 w-4" /></button>
      </div>
      <label className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700">Written against the clock<input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-5 w-5 accent-amber-500" /></label>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void save()} className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
    </div>
  </div>
}
