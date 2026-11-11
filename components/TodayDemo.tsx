'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Undo2 } from 'lucide-react'

type Recall = 'got' | 'partly' | 'forgot'
const RECALL: [Recall, string, string][] = [
  // The gaps the app uses for a topic's second revision (prep_next_interval).
  ['got', 'Got it', 'Comes back in 15 days.'],
  ['partly', 'Partly', 'Comes back in a week.'],
  ['forgot', 'Forgot', 'Comes back in 3 days.'],
]

/** The welcome page's sample day. Every button works, so a visitor learns the app by tapping it. */
export default function TodayDemo() {
  const [studied, setStudied] = useState(false)
  const [recall, setRecall] = useState<Recall | null>(null)
  const [focusNote, setFocusNote] = useState(false)
  const done = 2 + (studied ? 1 : 0) + (recall ? 1 : 0)
  const finished = studied && recall

  return <div>
    <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Try it: a sample day</p>
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#0E1A2C]">
      <p className="text-lg font-semibold">Riya&apos;s plan for today</p>
      <div className="mt-3 flex items-baseline justify-between gap-3"><p className="whitespace-nowrap text-2xl font-semibold tabular-nums" aria-live="polite">{done} of 5 done</p><p className="text-right text-xs text-slate-500">UPSC · 200 days left</p></div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${done * 20}%` }} /></div>

      <div className={`mt-4 rounded-2xl p-4 transition-colors ${studied ? 'border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'}`}>
        <p className="text-[11px] uppercase tracking-[0.14em] opacity-60">Study</p>
        <p className="mt-2 text-lg font-semibold leading-snug">Fundamental Rights: Articles 12 to 18</p>
        <p className="mt-1 text-sm opacity-70">Indian polity</p>
        {studied
          ? <div className="mt-3 flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />Done. It comes back for revision in 3 days.</span>
              <button type="button" onClick={() => setStudied(false)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Undo2 className="h-3.5 w-3.5" />Undo</button>
            </div>
          : <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => { setStudied(true); setFocusNote(false) }} className="flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-slate-900 active:scale-[0.98] dark:bg-slate-900 dark:text-white">Done</button>
              <button type="button" onClick={() => setFocusNote(!focusNote)} aria-expanded={focusNote} className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold dark:border-slate-300">Focus</button>
            </div>}
        {focusNote && !studied && <p className="mt-3 text-sm opacity-80">Focus opens a full-screen timer (25 / 5, 50 / 10 or a stopwatch) and saves the minutes to this topic.</p>}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Revise</p>
        <p className="mt-2 font-semibold leading-snug">Monsoon and its mechanism</p>
        <p className="mt-1 text-xs text-slate-500">How much did you remember?</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
          {RECALL.map(([key, label]) => <button key={key} type="button" onClick={() => setRecall(recall === key ? null : key)} aria-pressed={recall === key} className={`rounded-lg py-2 transition-colors ${recall === key ? 'bg-amber-500 text-slate-950' : 'border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>{label}</button>)}
        </div>
        {recall && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{RECALL.find(([k]) => k === recall)?.[2]} The better you remember, the longer the gap.</p>}
      </div>

      {finished
        ? <Link href="/login?mode=signup&next=/prep/start" className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-slate-950 hover:bg-amber-400">That&apos;s a day. Make my plan <ArrowRight className="h-4 w-4" /></Link>
        : <p className="mt-4 text-center text-xs text-slate-500">Tap Done, then say how much you remembered.</p>}
    </div>
  </div>
}
