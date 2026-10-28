'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import GoalieSays from '@/components/GoalieSays'

const LAST_VISIT_KEY = 'goalcircle-last-visit'
const AWAY_DAYS = 3

/** A gentle note from Goalie when someone returns after a few days away. */
export default function WelcomeBack() {
  const [daysAway, setDaysAway] = useState<number | null>(null)

  useEffect(() => {
    try {
      const now = Date.now()
      const last = Number(window.localStorage.getItem(LAST_VISIT_KEY) || 0)
      window.localStorage.setItem(LAST_VISIT_KEY, String(now))
      if (last > 0) {
        const days = Math.floor((now - last) / 86_400_000)
        if (days >= AWAY_DAYS) setDaysAway(days)
      }
    } catch { /* storage unavailable: skip the note */ }
  }, [])

  if (daysAway === null) return null

  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-[#101B2D]">
      <button type="button" onClick={() => setDaysAway(null)} aria-label="Close" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
      <div className="pr-6">
        <GoalieSays lines="welcomeBack" mood="wave" size={60} />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">It&apos;s been {daysAway} days. No pressure, every restart counts. One small step today?</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => setDaysAway(null)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500">Not now</button>
        <Link href="/check-in" onClick={() => setDaysAway(null)} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm">Check in</Link>
      </div>
    </div>
  )
}
