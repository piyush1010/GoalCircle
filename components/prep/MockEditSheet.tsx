'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { MockRow } from '@/lib/prep/usePrepData'

/** Change a mock test that was logged with a typo: name, date and score. */
export default function MockEditSheet({ mock, onSave, onClose }: {
  mock: MockRow
  onSave: (changes: { name: string; takenOn: string; score: number | null; maxScore: number | null }) => Promise<boolean>
  onClose: () => void
}) {
  const [name, setName] = useState(mock.name)
  const [takenOn, setTakenOn] = useState(mock.takenOn)
  const [score, setScore] = useState(mock.score === null ? '' : String(mock.score))
  const [max, setMax] = useState(mock.maxScore === null ? '' : String(mock.maxScore))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  const save = async () => {
    const s = num(score), m = num(max)
    if (!name.trim()) { setError('Give the mock a name.'); return }
    if ((s !== null && Number.isNaN(s)) || (m !== null && Number.isNaN(m))) { setError('Scores must be numbers.'); return }
    if (s !== null && m !== null && s > m) { setError('Score cannot be more than the maximum.'); return }
    setBusy(true); setError(null)
    const ok = await onSave({ name: name.trim().slice(0, 120), takenOn, score: s, maxScore: m })
    setBusy(false)
    if (ok) onClose(); else setError('Could not save. Please try again.')
  }
  const field = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900'
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Edit mock test" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-center justify-between"><h2 className="text-lg">Edit mock test</h2><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button></div>
      <label className="mt-4 block text-sm font-semibold">Name<input value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
      <label className="mt-3 block text-sm font-semibold">Date<input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} className={field} /></label>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">Score<input inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} className={field} /></label>
        <label className="block text-sm font-semibold">Out of<input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} className={field} /></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void save()} className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60">{busy ? 'Saving…' : 'Save changes'}</button>
    </div>
  </div>
}
