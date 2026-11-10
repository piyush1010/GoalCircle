'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'

/**
 * The one focus timer in the app: full screen, three modes, survives a reload.
 *  - 25 / 5: focus 25 minutes, 5-minute break, a 15-minute break after every fourth round.
 *  - 50 / 10: longer deep-work rounds.
 *  - Stopwatch: counts up, for study that does not fit a round.
 * "Finish" saves the focused minutes; when a done label is given it can also mark the item done.
 */

const KEY = 'goalyaar-focus-timer'
const MODES = {
  classic: { focus: 25, rest: 5, long: 15, label: '25 / 5' },
  deep: { focus: 50, rest: 10, long: 10, label: '50 / 10' },
  stopwatch: { focus: 0, rest: 0, long: 0, label: 'Stopwatch' },
} as const
export type FocusMode = keyof typeof MODES
interface Saved {
  title: string; mode: FocusMode; phase: 'focus' | 'rest'; round: number
  endsAt: number | null; left: number // countdown modes
  swStart: number | null; swAcc: number // stopwatch
  focusMs: number // completed focus rounds
}

const read = (): Saved | null => { try { const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null'); return v && typeof v.left === 'number' && typeof v.swAcc === 'number' ? v : null } catch { return null } }
const write = (v: Saved | null) => { try { if (v) window.localStorage.setItem(KEY, JSON.stringify(v)); else window.localStorage.removeItem(KEY) } catch { /* lives in memory only */ } }
/** The current time, read in event handlers and timers, never during render. */
const nowMs = () => Date.now()
const clock = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h ? `${h}:` : ''}${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const fresh = (title: string, mode: FocusMode = 'classic'): Saved => ({ title, mode, phase: 'focus', round: 1, endsAt: null, left: MODES[mode].focus * 60000, swStart: null, swAcc: 0, focusMs: 0 })

/** A session left running for this item, e.g. to show "Resume focus" on a page. */
export function savedFocusTitle(): string | null { const s = read(); return s ? s.title : null }

function chime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ;[0, 0.25].forEach((at) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + at); g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.4); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.45) })
    navigator.vibrate?.([200, 100, 200])
  } catch { /* sound is optional */ }
}

export default function FocusTimer({ title, subtitle, doneLabel, defaultMode = 'classic', onClose, onFinish }: {
  title: string; subtitle?: string
  doneLabel?: string | null // e.g. "Done with this subtopic"; leave out when there is nothing to mark done
  defaultMode?: FocusMode
  onClose: () => void
  onFinish: (minutes: number, markDone: boolean) => Promise<void>
}) {
  const [s, setS] = useState<Saved | null>(null)
  const [now, setNow] = useState(0)
  const [ending, setEnding] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      const saved = read()
      setS(saved && saved.title === title ? saved : fresh(title, defaultMode))
      setNow(nowMs())
    }, 0)
    return () => window.clearTimeout(t)
  }, [title, defaultMode])

  // Tick; in countdown modes, roll over between focus and breaks.
  const running = Boolean(s && (s.mode === 'stopwatch' ? s.swStart : s.endsAt))
  useEffect(() => {
    if (!s || !running) return
    const id = window.setInterval(() => {
      const t = nowMs()
      setNow(t)
      if (s.mode !== 'stopwatch' && s.endsAt && t >= s.endsAt) {
        chime()
        const m = MODES[s.mode]
        const rest = s.round % 4 === 0 ? m.long : m.rest
        const next: Saved = s.phase === 'focus'
          ? { ...s, phase: 'rest', focusMs: s.focusMs + m.focus * 60000, left: rest * 60000, endsAt: t + rest * 60000 }
          : { ...s, phase: 'focus', round: s.round + 1, left: m.focus * 60000, endsAt: null }
        write(next); setS(next)
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [s, running])

  if (!s) return null
  const m = MODES[s.mode]
  const stopwatch = s.mode === 'stopwatch'
  const swElapsed = s.swAcc + (s.swStart ? now - s.swStart : 0)
  const left = stopwatch ? 0 : s.endsAt ? s.endsAt - now : s.left
  const total = stopwatch ? 1 : (s.phase === 'focus' ? m.focus : s.round % 4 === 0 ? m.long : m.rest) * 60000
  const progress = stopwatch ? (swElapsed % 3600000) / 3600000 : Math.min(1, Math.max(0, 1 - left / total))
  const save = (v: Saved) => { write(v); setS(v); setNow(nowMs()) }
  const toggle = () => stopwatch
    ? save(s.swStart ? { ...s, swAcc: s.swAcc + (nowMs() - s.swStart), swStart: null } : { ...s, swStart: nowMs() })
    : save(running ? { ...s, left: Math.max(0, left), endsAt: null } : { ...s, endsAt: nowMs() + s.left })
  const focusedMs = stopwatch ? swElapsed : s.focusMs + (s.phase === 'focus' ? total - Math.max(0, left) : 0)
  const minutes = Math.max(1, Math.round(focusedMs / 60000))
  const started = stopwatch ? swElapsed > 0 : s.focusMs > 0 || running || s.left < m.focus * 60000
  const finish = async (markDone: boolean) => { setBusy(true); await onFinish(minutes, markDone); write(null); setBusy(false); onClose() }
  const skip = () => {
    const rest = s.round % 4 === 0 ? m.long : m.rest
    save(s.phase === 'focus' ? { ...s, phase: 'rest', focusMs: focusedMs, left: rest * 60000, endsAt: nowMs() + rest * 60000 } : { ...s, phase: 'focus', round: s.round + 1, left: m.focus * 60000, endsAt: null })
  }
  const R = 120, C = 2 * Math.PI * R

  return <div role="dialog" aria-modal="true" aria-label="Focus timer" className="fixed inset-0 z-[60] flex flex-col bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] dark:bg-[#07101F]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">{(Object.keys(MODES) as FocusMode[]).map((k) => <button key={k} type="button" disabled={started} onClick={() => save(fresh(title, k))} aria-pressed={s.mode === k} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${s.mode === k ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{MODES[k].label}</button>)}</div>
      <button type="button" onClick={onClose} aria-label="Minimise" className="grid h-10 w-10 place-items-center rounded-full text-slate-500"><X className="h-5 w-5" /></button>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{stopwatch ? 'Stopwatch' : s.phase === 'focus' ? `Focus · round ${s.round}` : s.round % 4 === 0 ? 'Long break' : 'Break'}</p>
      <div className="relative mt-6 h-[264px] w-[264px]">
        <svg viewBox="0 0 264 264" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="132" cy="132" r={R} fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800" />
          <circle cx="132" cy="132" r={R} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} className={s.phase === 'focus' ? 'stroke-amber-500' : 'stroke-emerald-500'} style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-6xl font-light tabular-nums tracking-tight" aria-live="off">{clock(stopwatch ? swElapsed : left + 999)}</span>
      </div>
      <p className="mt-8 line-clamp-2 max-w-xs text-lg font-semibold leading-snug">{title}</p>
      {subtitle && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{subtitle}</p>}
      {!stopwatch && <p className="mt-2 text-xs text-slate-400">{Math.round(focusedMs / 60000)} min focused</p>}
    </div>

    {ending
      ? <div className="mx-auto w-full max-w-sm space-y-2">
          {doneLabel && <button type="button" disabled={busy} onClick={() => void finish(true)} className="w-full rounded-xl bg-amber-500 py-3.5 text-base font-semibold text-slate-950">{doneLabel}</button>}
          <button type="button" disabled={busy} onClick={() => void finish(false)} className={`w-full rounded-xl py-3.5 text-base font-semibold ${doneLabel ? 'border border-slate-200 dark:border-slate-700' : 'bg-amber-500 text-slate-950'}`}>Save {minutes} min{doneLabel ? ' only' : ''}</button>
          <button type="button" disabled={busy} onClick={() => { write(null); onClose() }} className="w-full py-2 text-sm text-slate-500">Discard this session</button>
          <button type="button" disabled={busy} onClick={() => setEnding(false)} className="w-full py-2 text-sm text-slate-500">Keep going</button>
        </div>
      : <div className="mx-auto flex w-full max-w-sm items-center gap-3">
          <button type="button" disabled={!started} onClick={() => setEnding(true)} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-base font-semibold disabled:opacity-50 dark:border-slate-700">Finish</button>
          <button type="button" onClick={toggle} aria-label={running ? 'Pause' : 'Start'} className="grid h-16 w-16 place-items-center rounded-full bg-amber-500 text-slate-950">{running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}</button>
          {stopwatch
            ? <span className="flex-1" />
            : <button type="button" onClick={skip} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-base font-semibold dark:border-slate-700">{s.phase === 'focus' ? 'Break' : 'Skip'}</button>}
        </div>}
  </div>
}
