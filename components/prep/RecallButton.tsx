'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

export type Recall = 'all' | 'some' | 'little'
const OPTIONS: [Recall, string][] = [['all', 'Remembered'], ['some', 'Partly'], ['little', 'Forgot']]

/** "Revised" asks one honest question, which sets the next gap: remembered → longer, partly → same, forgot → 3 days. */
export default function RecallButton({ disabled, label = 'Revised', block = false, onPick }: { disabled?: boolean; label?: string; block?: boolean; onPick: (recall: Recall) => void | Promise<void> }) {
  const [open, setOpen] = useState(false)
  if (!open) return <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={`flex items-center justify-center gap-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40 dark:border-slate-600 ${block ? 'w-full py-3 text-sm' : 'shrink-0 px-2.5 py-1.5 text-xs'}`}><RotateCcw className={block ? 'h-4 w-4' : 'h-3.5 w-3.5'} />{label}</button>
  return <div role="group" aria-label="How much did you remember?" className={`flex gap-1 ${block ? 'w-full' : 'shrink-0'}`}>
    {OPTIONS.map(([id, text]) => <button key={id} type="button" disabled={disabled} onClick={async () => { await onPick(id); setOpen(false) }} className={`rounded-lg font-bold disabled:opacity-40 ${block ? 'flex-1 py-3 text-sm' : 'px-2 py-1.5 text-[11px]'} ${id === 'all' ? 'bg-emerald-600 text-white' : id === 'some' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'}`}>{text}</button>)}
  </div>
}
