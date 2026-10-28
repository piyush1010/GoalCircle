'use client'

import { useEffect, useRef, useState } from 'react'
import { GoalieBot, type GoalieMood } from '@/components/GoalieBot'
import { pickLine, type GoalieLineSet } from '@/lib/goalie'

type Reaction = { mood: GoalieMood; ms: number; then?: GoalieLineSet }
const REACTIONS: Record<'tap' | 'fall' | 'angry', Reaction> = {
  tap: { mood: 'happy', ms: 1400 },
  fall: { mood: 'dizzy', ms: 2200 },
  angry: { mood: 'angry', ms: 2600, then: 'forgive' },
}

/**
 * Goalie with a speech bubble. One tap: giggles. Three quick taps: falls over, dizzy.
 * Keep poking: gets cross, then forgives you.
 */
export default function GoalieSays({ lines, say, mood = 'normal', size = 56, layout = 'row', autoHideMs, className = '' }: {
  /** A set to pick the opening line from, or `say` for an exact line. */
  lines?: GoalieLineSet; say?: string; mood?: GoalieMood; size?: number
  /** row: bubble to the right. left: bubble to the left. stack: bubble above. */
  layout?: 'row' | 'left' | 'stack'
  /** Hide the bubble this long after it last changed (Goalie stays). */
  autoHideMs?: number; className?: string
}) {
  const [line, setLine] = useState<string | null>(null)
  const [reaction, setReaction] = useState<{ mood: GoalieMood; key: number } | null>(null)
  const taps = useRef<number[]>([])
  const timer = useRef<number | undefined>(undefined)

  // Pick after mount so server and phone agree on the first render.
  useEffect(() => {
    if (!lines && !say) return
    const t = window.setTimeout(() => setLine(say ?? (lines ? pickLine(lines) : null)), 0)
    return () => window.clearTimeout(t)
  }, [lines, say])
  useEffect(() => {
    if (!line || !autoHideMs) return
    const t = window.setTimeout(() => setLine(null), autoHideMs)
    return () => window.clearTimeout(t)
  }, [line, autoHideMs, reaction])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const react = (kind: keyof typeof REACTIONS) => {
    const { mood: face, ms, then } = REACTIONS[kind]
    window.clearTimeout(timer.current)
    setReaction({ mood: face, key: Date.now() })
    setLine((current) => pickLine(kind, current ?? undefined))
    if ('vibrate' in navigator && kind !== 'tap') navigator.vibrate?.(kind === "fall" ? 25 : 40)
    timer.current = window.setTimeout(() => {
      setReaction(null)
      if (then) setLine(pickLine(then))
    }, ms)
  }

  const poke = () => {
    const now = Date.now()
    taps.current = [...taps.current.filter((time) => now - time < 1500), now]
    const recent = taps.current.length
    if (recent >= 6) { taps.current = []; react('angry') }
    else if (recent === 3) react('fall')
    else if (reaction?.mood === 'dizzy' || reaction?.mood === 'angry') return // let it finish
    else react('tap')
  }

  const face = reaction?.mood ?? mood
  const bubble = line && <p key={line} aria-live="polite" className={`goalie-bubble relative rounded-2xl border-2 border-slate-900 px-3.5 py-2 text-sm font-bold shadow-[3px_3px_0_#101B2D] ${face === 'angry' ? 'bg-rose-50 text-rose-800' : 'bg-white text-slate-900'} ${layout === 'row' ? 'rounded-bl-md' : layout === 'left' ? 'max-w-[13rem] rounded-br-md' : 'mx-auto w-fit max-w-[16rem] rounded-b-md'}`}>{line}</p>

  return (
    <div className={`${layout === 'row' ? 'flex items-end gap-2' : layout === 'left' ? 'flex flex-row-reverse items-end gap-2' : 'flex flex-col-reverse items-center gap-2'} ${className}`}>
      <button type="button" onClick={poke} aria-label="Poke Goalie" style={{ touchAction: 'manipulation' }} className={`shrink-0 select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${reaction?.mood === 'happy' ? 'goalie-jump' : ''}`} key={reaction?.key ?? 0}>
        <GoalieBot size={size} mood={face} />
      </button>
      {bubble}
    </div>
  )
}
