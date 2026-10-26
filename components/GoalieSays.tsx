'use client'

import { useEffect, useState } from 'react'
import { GoalieBot, type GoalieMood } from '@/components/GoalieBot'
import { pickLine, type GoalieLineSet } from '@/lib/goalie'

/** Goalie with a speech bubble. Tap Goalie and it giggles and says something new. */
export default function GoalieSays({ lines, mood = 'normal', size = 56, layout = 'row', className = '' }: {
  lines: GoalieLineSet; mood?: GoalieMood; size?: number; layout?: 'row' | 'stack'; className?: string
}) {
  const [line, setLine] = useState<string | null>(null)
  const [tapped, setTapped] = useState(false)
  const [taps, setTaps] = useState(0)

  // Pick after mount so server and phone agree on the first render.
  useEffect(() => { const timer = window.setTimeout(() => setLine(pickLine(lines)), 0); return () => window.clearTimeout(timer) }, [lines])

  useEffect(() => {
    if (!tapped) return
    const timer = window.setTimeout(() => setTapped(false), 1400)
    return () => window.clearTimeout(timer)
  }, [tapped, taps])

  const poke = () => { setTapped(true); setTaps((count) => count + 1); setLine((current) => pickLine('tap', current ?? undefined)) }

  const bubble = line && <p key={line} aria-live="polite" className={`goalie-bubble relative rounded-2xl bg-amber-50 px-3.5 py-2 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-100 dark:ring-amber-400/30 ${layout === 'row' ? 'rounded-bl-md' : 'mx-auto w-fit max-w-[16rem] rounded-b-md'}`}>{line}</p>

  return (
    <div className={`${layout === 'row' ? 'flex items-end gap-2' : 'flex flex-col-reverse items-center gap-2'} ${className}`}>
      <button type="button" onClick={poke} aria-label="Poke Goalie" className={`shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${tapped ? 'goalie-jump' : ''}`} key={taps}>
        <GoalieBot size={size} mood={tapped ? 'happy' : mood} />
      </button>
      {bubble}
    </div>
  )
}
