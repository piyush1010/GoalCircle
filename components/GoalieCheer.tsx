'use client'

import { useEffect, useState } from 'react'
import { GoalieBot } from '@/components/GoalieBot'
import { CHEER_EVENT, pickLine } from '@/lib/goalie'

/** A short celebration from Goalie after a check-in. */
export default function GoalieCheer() {
  const [line, setLine] = useState<string | null>(null)

  useEffect(() => {
    const show = () => {
      try {
        if (window.sessionStorage.getItem('goalcircle-cheer') !== '1') return
        window.sessionStorage.removeItem('goalcircle-cheer')
      } catch { /* storage unavailable: still cheer */ }
      setLine(pickLine('cheer'))
    }
    show()
    window.addEventListener(CHEER_EVENT, show)
    return () => window.removeEventListener(CHEER_EVENT, show)
  }, [])

  useEffect(() => {
    if (!line) return
    const timer = window.setTimeout(() => setLine(null), 3800)
    return () => window.clearTimeout(timer)
  }, [line])

  if (!line) return null
  return (
    <button type="button" onClick={() => setLine(null)} role="status" aria-label={`${line} Tap to close.`} className="goalie-bubble fixed inset-x-0 top-4 z-[65] mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-amber-200 bg-white py-1.5 pl-1.5 pr-5 shadow-2xl dark:border-amber-400/30 dark:bg-[#101b2d]">
      <GoalieBot size={44} mood="happy" />
      <span className="text-sm font-black">{line}</span>
    </button>
  )
}
