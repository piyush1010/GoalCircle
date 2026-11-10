'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { CHEER_EVENT, CHEER_LINES } from '@/lib/cheer'

/** A brief confirmation at the top of the screen after a check-in. */
export default function CheerToast() {
  const [line, setLine] = useState<string | null>(null)

  useEffect(() => {
    const show = () => {
      try {
        if (window.sessionStorage.getItem('goalcircle-cheer') !== '1') return
        window.sessionStorage.removeItem('goalcircle-cheer')
      } catch { /* storage unavailable: still confirm */ }
      setLine(CHEER_LINES[Math.floor(Math.random() * CHEER_LINES.length)])
    }
    const t = window.setTimeout(show, 0)
    window.addEventListener(CHEER_EVENT, show)
    return () => { window.clearTimeout(t); window.removeEventListener(CHEER_EVENT, show) }
  }, [])

  useEffect(() => {
    if (!line) return
    const timer = window.setTimeout(() => setLine(null), 3200)
    return () => window.clearTimeout(timer)
  }, [line])

  if (!line) return null
  return (
    <button type="button" onClick={() => setLine(null)} role="status" aria-label={`${line} Tap to close.`} className="fixed inset-x-0 top-4 z-[65] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full bg-slate-900 py-2 pl-2.5 pr-5 text-white shadow-xl dark:bg-white dark:text-slate-900">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500 text-slate-950"><Check className="h-3.5 w-3.5" /></span>
      <span className="text-sm font-semibold">{line}</span>
    </button>
  )
}
