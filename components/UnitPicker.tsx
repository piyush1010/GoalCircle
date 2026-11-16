'use client'

import { useState } from 'react'
import { UNITS, suggestedUnits } from '@/lib/goalReport'

/**
 * "What will you count?" Just days, a common unit, or the person's own word ("glasses", "push-ups").
 * value null = just days.
 */
export default function UnitPicker({ value, onChange, category }: { value: string | null; onChange: (unit: string | null) => void; category?: string | null }) {
  const suggested = suggestedUnits(category)
  const known = UNITS.map((u) => u.id)
  const custom = value !== null && !known.includes(value)
  const [typing, setTyping] = useState(custom)
  const [text, setText] = useState(custom ? value ?? '' : '')
  const order = [...suggested, ...known.filter((id) => !suggested.includes(id))]
  const chip = (on: boolean) => `rounded-full border px-3.5 py-2 text-sm font-medium transition ${on ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200'}`

  return <div>
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="What to count">
      <button type="button" role="radio" aria-checked={value === null && !typing} onClick={() => { setTyping(false); onChange(null) }} className={chip(value === null && !typing)}>Just the days</button>
      {order.map((id) => { const u = UNITS.find((x) => x.id === id)!; return <button key={id} type="button" role="radio" aria-checked={value === id && !typing} onClick={() => { setTyping(false); onChange(id) }} className={chip(value === id && !typing)}>{u.label}</button> })}
      <button type="button" role="radio" aria-checked={typing} onClick={() => { setTyping(true); onChange(text.trim() || null) }} className={chip(typing)}>Something else</button>
    </div>
    {typing && <label className="mt-3 block text-sm font-medium text-slate-600 dark:text-slate-300">What do you count?
      <input autoFocus value={text} maxLength={16} placeholder="glasses of water, push-ups" onChange={(e) => { setText(e.target.value); onChange(e.target.value.trim().toLowerCase() || null) }}
        className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-transparent px-3.5 py-3 text-[15px] dark:border-slate-600" />
    </label>}
  </div>
}
