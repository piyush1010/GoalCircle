'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { askFor, formatAmount } from '@/lib/goalReport'

/**
 * After logging a goal that counts something, one quick question: "How many km?"
 * Skipping is fine: the day still counts. Also used to change the number later.
 */
export default function AmountSheet({ unit, goalTitle, initial, editing = false, onSave, onClose }: {
  unit: string; goalTitle: string; initial?: number | null; editing?: boolean
  onSave: (amount: number | null) => Promise<boolean>; onClose: () => void
}) {
  const [value, setValue] = useState(initial === null || initial === undefined ? '' : String(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const box = useRef<HTMLInputElement>(null)

  useEffect(() => {
    box.current?.focus()
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const clean = value.trim().replace(',', '.')
  const n = clean === '' ? null : Number(clean)
  const valid = n === null || (Number.isFinite(n) && n >= 0 && n <= 1_000_000)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    if (n === null && !editing) { onClose(); return }
    setBusy(true); setError(null)
    const ok = await onSave(n === null ? null : Math.round(n * 100) / 100)
    setBusy(false)
    if (!ok) { setError('That didn’t save. Please try again.'); return }
    onClose()
  }

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 sm:items-center" onClick={onClose}>
    <form role="dialog" aria-modal="true" aria-label={askFor(unit)} onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-slate-500">{editing ? goalTitle : `${goalTitle}: logged`}</p>
          <h2 className="mt-0.5 text-lg font-semibold">{askFor(unit)}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-300 px-4 focus-within:border-slate-900 dark:border-slate-600 dark:focus-within:border-white">
        <input ref={box} value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" type="text" pattern="[0-9]*[.,]?[0-9]*" placeholder={initial ? formatAmount(initial) : '0'} aria-label={askFor(unit)}
          className="h-14 min-w-0 flex-1 bg-transparent text-2xl font-semibold tabular-nums outline-none focus-visible:outline-none" />
        <span className="shrink-0 text-base text-slate-500">{unit}</span>
      </div>
      {!valid && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">Please enter a number, like 5 or 2.5.</p>}
      {!editing && <p className="mt-2 text-sm text-slate-500">Optional. Today counts either way.</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={editing ? () => void onSave(null).then((ok) => { if (ok) onClose() }) : onClose} className="h-12 rounded-2xl border border-slate-300 text-[15px] font-semibold dark:border-slate-600">{editing ? 'Clear the number' : 'Skip'}</button>
        <button type="submit" disabled={!valid || busy || (editing ? false : n === null)} className="h-12 rounded-2xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Saving…' : 'Save'}</button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
    </form>
  </div>
}
