'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

type Recall = 'got' | 'partly' | 'forgot'
const RECALL: [Recall, string, string][] = [
  // The gaps the app uses for a topic's second revision (prep_next_interval).
  ['got', 'Got it', 'It comes back in 15 days.'],
  ['partly', 'Partly', 'It comes back in a week.'],
  ['forgot', 'Forgot', 'It comes back in 3 days.'],
]

interface Item { id: string; title: string; goal: string; start: boolean }
const ITEMS: Item[] = [
  { id: 'study', title: 'Fundamental Rights: Articles 12 to 18', goal: 'UPSC CSE', start: false },
  { id: 'walk', title: 'Walk 5,000 steps', goal: 'Fitness', start: false },
  { id: 'read', title: 'Read 10 pages', goal: 'Reading', start: true },
  { id: 'mind', title: 'Meditate for 10 minutes', goal: 'Health and mind', start: true },
]

/** The welcome page's sample day: an exam, fitness, reading and the mind on one list. Every button works. */
export default function TodayDemo() {
  const [done, setDone] = useState<Set<string>>(() => new Set(ITEMS.filter((i) => i.start).map((i) => i.id)))
  const [recall, setRecall] = useState<Recall | null>(null)
  const count = done.size + (recall ? 1 : 0)
  const finished = count === 5
  const toggle = (id: string) => setDone((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next })

  const tick = (on: boolean) => `grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'}`

  return <div>
    <p className="mb-3 text-center text-sm font-medium text-slate-500">Try it: a sample day</p>
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#0E1A2C]">
      <p className="text-lg font-semibold">Riya&apos;s day</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold tabular-nums" aria-live="polite">{count} of 5 done</p>
        <p className="text-right text-xs text-slate-500">{finished ? 'All done for today' : `${5 - count} left`}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${count * 20}%` }} /></div>

      <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        {ITEMS.slice(0, 1).map((item) => <Row key={item.id} item={item} on={done.has(item.id)} onTick={() => toggle(item.id)} tick={tick} />)}
        <li className="py-3">
          <div className="flex items-center gap-3">
            <span className={tick(Boolean(recall))}>{recall && <Check className="h-4 w-4" strokeWidth={3} />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold leading-snug">Revise: Monsoon and its mechanism</span><span className="block text-xs text-slate-500">How much did you remember?</span></span>
          </div>
          <div className="mt-2.5 grid grid-cols-3 gap-2 pl-10 text-center text-xs font-semibold">
            {RECALL.map(([key, label]) => <button key={key} type="button" onClick={() => setRecall(recall === key ? null : key)} aria-pressed={recall === key}
              className={`rounded-lg py-2 transition-colors ${recall === key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700'}`}>{label}</button>)}
          </div>
          {recall && <p className="mt-2 pl-10 text-sm text-slate-600 dark:text-slate-300">{RECALL.find(([k]) => k === recall)?.[2]} The better you remember, the longer the gap.</p>}
        </li>
        {ITEMS.slice(1).map((item) => <Row key={item.id} item={item} on={done.has(item.id)} onTick={() => toggle(item.id)} tick={tick} />)}
      </ul>

      {finished
        ? <Link href="/start" className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">That&apos;s a day. Set my goals <ArrowRight className="h-4 w-4" /></Link>
        : <p className="mt-3 text-center text-xs text-slate-500">Tick things off, and say how much you remembered.</p>}
    </div>
  </div>
}

function Row({ item, on, onTick, tick }: { item: Item; on: boolean; onTick: () => void; tick: (on: boolean) => string }) {
  return <li className="flex items-center gap-3 py-3">
    <button type="button" onClick={onTick} aria-pressed={on} aria-label={on ? `Undo ${item.title}` : `Mark ${item.title} done`} className={tick(on)}>{on && <Check className="h-4 w-4" strokeWidth={3} />}</button>
    <span className="min-w-0 flex-1"><span className={`block text-[15px] font-semibold leading-snug ${on ? 'text-slate-400 line-through decoration-slate-300' : ''}`}>{item.title}</span><span className="block text-xs text-slate-500">{item.goal}</span></span>
  </li>
}
