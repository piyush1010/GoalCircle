'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { GoalieBot } from '@/components/GoalieBot'

export { GoalieBot }

export interface TourStep {
  /** Value of a data-tour attribute on the page; omit for a welcome step with no target. */
  target?: string
  title: string
  text: string
}

interface Rect { top: number; left: number; width: number; height: number }

export const TOUR_STORAGE_PREFIX = 'goalcircle-tour-'
export const REPLAY_TOURS_EVENT = 'goalcircle:replay-tours'
const storageKey = (name: string) => `${TOUR_STORAGE_PREFIX}${name}-done`
const PAD = 8

const ALL_TIPS_OFF = `${TOUR_STORAGE_PREFIX}all-skipped`
function readDone(name: string) {
  try { return window.localStorage.getItem(storageKey(name)) === '1' || window.localStorage.getItem(ALL_TIPS_OFF) === '1' } catch { return false }
}
function writeDone(name: string) {
  try { window.localStorage.setItem(storageKey(name), '1') } catch { /* storage unavailable */ }
}

/** Forget which tours were seen on this device, so they run again. */
export function resetTours() {
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith(TOUR_STORAGE_PREFIX)).forEach((key) => window.localStorage.removeItem(key))
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(REPLAY_TOURS_EVENT))
}

/**
 * A step-by-step guide with Goalie. Uncontrolled (default): runs once per device, replayable with replayKey.
 * Controlled: pass `open` and `onDone`; the caller decides when it shows and remembers that it was seen.
 */
export default function GuideTour({ name, steps, replayKey = 0, open, onDone }: { name: string; steps: TourStep[]; replayKey?: number; open?: boolean; onDone?: () => void }) {
  const controlled = open !== undefined
  const [index, setIndex] = useState<number | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)

  // Only steps whose target is on the page right now (or welcome steps without one).
  const available = useCallback(() => steps.filter((step) => !step.target || document.querySelector(`[data-tour="${step.target}"]`)), [steps])
  const [active, setActive] = useState<TourStep[]>([])

  const start = useCallback(() => { const list = available(); setActive(list); setIndex(list.length ? 0 : null) }, [available])

  useEffect(() => {
    if (controlled) {
      if (!open) { setIndex(null); return }
      const timer = window.setTimeout(start, 300)
      return () => window.clearTimeout(timer)
    }
    if (replayKey > 0) { const timer = window.setTimeout(start, 50); return () => window.clearTimeout(timer) }
    if (readDone(name)) return
    const timer = window.setTimeout(start, 700) // let the page settle first
    return () => window.clearTimeout(timer)
  }, [controlled, name, open, replayKey, start])

  useEffect(() => {
    if (controlled) return
    const replay = () => window.setTimeout(start, 50)
    window.addEventListener(REPLAY_TOURS_EVENT, replay)
    return () => window.removeEventListener(REPLAY_TOURS_EVENT, replay)
  }, [controlled, start])

  const step = index !== null ? active[index] : null

  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return }
    const element = document.querySelector(`[data-tour="${step.target}"]`)
    if (!element) { setRect(null); return }
    const box = element.getBoundingClientRect()
    setRect({ top: box.top - PAD, left: box.left - PAD, width: box.width + PAD * 2, height: box.height + PAD * 2 })
  }, [step])

  useLayoutEffect(() => {
    if (!step) return
    const target = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
    // Bring the target near the top so the speech bubble below doesn't cover it.
    if (target) { target.style.scrollMarginTop = '96px'; target.scrollIntoView({ block: 'start', behavior: 'smooth' }) }
    const timer = window.setTimeout(measure, 350)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [measure, step])

  const finish = (skipped = false) => {
    setIndex(null)
    if (controlled) onDone?.()
    else writeDone(name)
    // Skipping one tour means "no more tips": don't greet them with a tour on every page.
    if (skipped) { try { window.localStorage.setItem(ALL_TIPS_OFF, '1') } catch { /* storage unavailable */ } }
  }

  if (!step || index === null) return null
  const last = index === active.length - 1
  // If the target is still low on screen (end of the page), put Goalie and the bubble at the top instead.
  const atTop = !!rect && rect.top + rect.height / 2 > window.innerHeight * 0.5

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`Guide: ${step.title}`}>
      <style>{`
        @keyframes goalie-bob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }
        @keyframes goalie-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(0.1) } }
        @keyframes goalie-wiggle { 0%,100% { transform: rotate(0) } 50% { transform: rotate(10deg) } }
        @keyframes guide-point { 0%,100% { transform: translate(-50%, 0) } 50% { transform: translate(-50%, -8px) } }
        @keyframes guide-pop { from { opacity: 0; transform: translateY(12px) scale(.98) } to { opacity: 1; transform: none } }
        .goalie-bob { animation: goalie-bob 2.4s ease-in-out infinite }
        .goalie-eyes { transform-origin: 32px 32px; animation: goalie-blink 4s infinite }
        .goalie-antenna { transform-origin: 32px 14px; animation: goalie-wiggle 1.6s ease-in-out infinite }
        .guide-pointer { animation: guide-point 1s ease-in-out infinite }
        .guide-card { animation: guide-pop .3s ease-out }
        @media (prefers-reduced-motion: reduce) { .goalie-bob,.goalie-eyes,.goalie-antenna,.guide-pointer,.guide-card { animation: none } }
      `}</style>

      {/* Dim everything except the spotlighted element. */}
      {rect
        ? <div className="pointer-events-none absolute rounded-2xl ring-4 ring-amber-400 transition-all duration-300" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.62)' }} />
        : <div className="absolute inset-0 bg-slate-950/60" />}

      {rect && <svg width="34" height="34" viewBox="0 0 24 24" className="guide-pointer pointer-events-none absolute drop-shadow-lg" style={{ left: rect.left + rect.width / 2, top: rect.top - 40 }} aria-hidden="true">
        <path d="M12 21 L4 11 H9 V3 H15 V11 H20 Z" fill="#f59e0b" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>}

      {/* Clicks on the dimmed area do nothing; use the buttons. */}
      <div className="absolute inset-0" />

      <div className={`guide-card absolute inset-x-4 mx-auto flex max-w-md select-none ${atTop ? 'top-4 flex-col-reverse' : 'bottom-20 flex-col'}`}>
        {/* Comic speech bubble */}
        <div className="relative rounded-[28px] border-[3px] border-slate-900 bg-white p-4 text-slate-900 shadow-[5px_5px_0_#121212]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Goalie · {index + 1} of {active.length}</p>
          <h2 className="mt-0.5 text-lg font-bold leading-snug">{step.title}</h2>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">{step.text}</p>
          <div className="mt-4 flex items-center gap-2">
            <button type="button" onClick={() => finish(true)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500">Skip tips</button>
            <span className="flex-1" />
            {index > 0 && <button type="button" onClick={() => setIndex(index - 1)} className="rounded-xl border-2 border-slate-900 px-4 py-2 text-sm font-bold">Back</button>}
            <button type="button" onClick={() => (last ? finish() : setIndex(index + 1))} autoFocus className="rounded-xl border-2 border-slate-900 bg-amber-400 px-5 py-2 text-sm font-bold text-slate-950 shadow-[2px_2px_0_#121212] active:translate-x-px active:translate-y-px active:shadow-none">{last ? 'Got it' : 'Next'}</button>
          </div>
          {/* Tail pointing at Goalie */}
          <svg width="36" height="26" viewBox="0 0 36 26" aria-hidden="true" className={`absolute left-12 ${atTop ? '-top-[23px] -scale-y-100' : '-bottom-[23px]'}`}>
            <path d="M0 0 L12 24 L34 0 Z" fill="#fff" />
            <path d="M2 1 L12 24 L32 1" fill="none" stroke="#121212" strokeWidth="3" strokeLinejoin="round" />
          </svg>
        </div>
        {/* Goalie stands outside the bubble */}
        <div className={`ml-1 w-fit drop-shadow-xl ${atTop ? 'mb-4' : 'mt-4'}`}>
          <GoalieBot size={84} mood={index === 0 ? 'wave' : last ? 'happy' : 'think'} />
        </div>
      </div>
    </div>
  )
}
