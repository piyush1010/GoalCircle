'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, X } from 'lucide-react'

const KEY = 'goalyaar-pomodoro'
const MODES = { classic: { focus: 25, rest: 5, label: '25 / 5' }, deep: { focus: 50, rest: 10, label: '50 / 10' } } as const
type Mode = keyof typeof MODES
interface Saved { title: string; mode: Mode; phase: 'focus' | 'rest'; endsAt: number | null; left: number; focusMs: number; round: number }

const read = (): Saved | null => { try { const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null'); return v && typeof v.left === 'number' ? v : null } catch { return null } }
const write = (v: Saved | null) => { try { if (v) window.localStorage.setItem(KEY, JSON.stringify(v)); else window.localStorage.removeItem(KEY) } catch { /* lives in memory only */ } }
const clock = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }

function chime() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    ;[0, 0.25].forEach((at) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, ctx.currentTime + at); g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.4); o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + 0.45) })
    navigator.vibrate?.([200, 100, 200])
  } catch { /* sound is optional */ }
}

/**
 * Full-screen Pomodoro for one subtopic: focus, short break, repeat. Survives a reload.
 * "Finish" saves the focused minutes, and can mark the subtopic as done.
 */
export default function Pomodoro({ title, subtitle, onClose, onFinish }: { title: string; subtitle?: string; onClose: () => void; onFinish: (minutes: number, markDone: boolean) => Promise<void> }) {
  const [s, setS] = useState<Saved | null>(null)
  const [now, setNow] = useState(0)
  const [ending, setEnding] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      const saved = read()
      const fresh: Saved = { title, mode: 'classic', phase: 'focus', endsAt: null, left: MODES.classic.focus * 60000, focusMs: 0, round: 1 }
      setS(saved && saved.title === title ? saved : fresh)
      setNow(Date.now())
    }, 0)
    return () => window.clearTimeout(t)
  }, [title])

  // Tick, and roll over between focus and break.
  useEffect(() => {
    if (!s?.endsAt) return
    const id = window.setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (s.endsAt && t >= s.endsAt) {
        chime()
        const m = MODES[s.mode]
        const next: Saved = s.phase === 'focus'
          ? { ...s, phase: 'rest', focusMs: s.focusMs + m.focus * 60000, left: m.rest * 60000, endsAt: t + m.rest * 60000 }
          : { ...s, phase: 'focus', round: s.round + 1, left: m.focus * 60000, endsAt: null }
        write(next); setS(next)
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [s])

  if (!s) return null
  const m = MODES[s.mode]
  const left = s.endsAt ? s.endsAt - (now || Date.now()) : s.left
  const total = (s.phase === 'focus' ? m.focus : m.rest) * 60000
  const progress = Math.min(1, Math.max(0, 1 - left / total))
  const running = Boolean(s.endsAt)
  const save = (v: Saved) => { write(v); setS(v); setNow(Date.now()) }
  const toggle = () => save(running ? { ...s, left: Math.max(0, left), endsAt: null } : { ...s, endsAt: Date.now() + s.left })
  const focusedMs = s.focusMs + (s.phase === 'focus' ? total - Math.max(0, left) : 0)
  const minutes = Math.max(1, Math.round(focusedMs / 60000))
  const finish = async (markDone: boolean) => { setBusy(true); await onFinish(minutes, markDone); write(null); setBusy(false); onClose() }
  const R = 120, C = 2 * Math.PI * R

  return <div role="dialog" aria-modal="true" aria-label="Focus timer" className="fixed inset-0 z-[60] flex flex-col bg-white px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 dark:bg-[#07101F]">
    <div className="flex items-center justify-between">
      <div className="flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">{(Object.keys(MODES) as Mode[]).map((k) => <button key={k} type="button" disabled={running || s.focusMs > 0} onClick={() => save({ ...s, mode: k, left: MODES[k].focus * 60000 })} aria-pressed={s.mode === k} className={`rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60 ${s.mode === k ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{MODES[k].label}</button>)}</div>
      <button type="button" onClick={onClose} aria-label="Minimise" className="grid h-10 w-10 place-items-center rounded-full text-slate-500"><X className="h-5 w-5" /></button>
    </div>

    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{s.phase === 'focus' ? `Focus · round ${s.round}` : 'Break'}</p>
      <div className="relative mt-6 h-[264px] w-[264px]">
        <svg viewBox="0 0 264 264" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="132" cy="132" r={R} fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800" />
          <circle cx="132" cy="132" r={R} fill="none" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} className={s.phase === 'focus' ? 'stroke-amber-500' : 'stroke-emerald-500'} style={{ transition: 'stroke-dashoffset 0.5s linear' }} />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-6xl font-light tabular-nums tracking-tight" aria-live="off">{clock(left)}</span>
      </div>
      <p className="mt-8 line-clamp-2 max-w-xs text-lg font-semibold leading-snug">{title}</p>
      {subtitle && <p className="mt-1 line-clamp-1 text-sm text-slate-500">{subtitle}</p>}
      <p className="mt-2 text-xs text-slate-400">{Math.round(focusedMs / 60000)} min focused</p>
    </div>

    {ending
      ? <div className="mx-auto w-full max-w-sm space-y-2">
          <button type="button" disabled={busy} onClick={() => void finish(true)} className="w-full rounded-xl bg-amber-500 py-3.5 text-base font-semibold text-slate-950">Done with this subtopic</button>
          <button type="button" disabled={busy} onClick={() => void finish(false)} className="w-full rounded-xl border border-slate-200 py-3.5 text-base font-semibold dark:border-slate-700">Save {minutes} min only</button>
          <button type="button" disabled={busy} onClick={() => setEnding(false)} className="w-full py-2 text-sm text-slate-500">Keep going</button>
        </div>
      : <div className="mx-auto flex w-full max-w-sm items-center gap-3">
          <button type="button" onClick={() => setEnding(true)} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-base font-semibold dark:border-slate-700">Finish</button>
          <button type="button" onClick={toggle} aria-label={running ? 'Pause' : 'Start'} className="grid h-16 w-16 place-items-center rounded-full bg-amber-500 text-slate-950">{running ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}</button>
          <button type="button" onClick={() => save(s.phase === 'focus' ? { ...s, phase: 'rest', focusMs: focusedMs, left: m.rest * 60000, endsAt: Date.now() + m.rest * 60000 } : { ...s, phase: 'focus', round: s.round + 1, left: m.focus * 60000, endsAt: null })} className="flex-1 rounded-xl border border-slate-200 py-3.5 text-base font-semibold dark:border-slate-700">{s.phase === 'focus' ? 'Break' : 'Skip'}</button>
        </div>}
  </div>
}
