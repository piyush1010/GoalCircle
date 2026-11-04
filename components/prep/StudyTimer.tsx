'use client'

import { useEffect, useState } from 'react'
import { Pause, Play, Square, Timer } from 'lucide-react'
import type { Unit } from '@/lib/prep/pace'

const KEY = 'goalyaar-prep-timer'
interface Saved { unitId: string; startedAt: number; pausedMs: number; pausedAt: number | null }
const read = (): Saved | null => { try { const v = JSON.parse(window.localStorage.getItem(KEY) ?? 'null'); return v && typeof v.startedAt === 'number' ? v : null } catch { return null } }
const write = (v: Saved | null) => { try { if (v) window.localStorage.setItem(KEY, JSON.stringify(v)); else window.localStorage.removeItem(KEY) } catch { /* timer lives in memory only */ } }
const elapsed = (v: Saved, now: number) => Math.max(0, (v.pausedAt ?? now) - v.startedAt - v.pausedMs)
/** The current time, read in event handlers and timers, never during render. */
const nowMs = () => Date.now()
const clock = (ms: number) => { const s = Math.floor(ms / 1000); const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s % 60).padStart(2, '0')}` }

/** A study timer tied to one subtopic. Survives a page reload; minutes go into the weekly review. */
export default function StudyTimer({ units, onFinish }: { units: Unit[]; onFinish: (unit: Unit, minutes: number, tick: boolean) => Promise<void> }) {
  const [saved, setSaved] = useState<Saved | null>(null)
  const [pick, setPick] = useState<string>('')
  const [now, setNow] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => { const t = window.setTimeout(() => { setSaved(read()); setNow(nowMs()) }, 0); return () => window.clearTimeout(t) }, [])
  useEffect(() => { if (!saved || saved.pausedAt) return; const t = window.setInterval(() => setNow(nowMs()), 1000); return () => window.clearInterval(t) }, [saved])

  const unit = units.find((u) => u.id === (saved?.unitId ?? pick)) ?? (saved ? undefined : units[0])
  if (!units.length && !saved) return null
  const update = (v: Saved | null) => { write(v); setSaved(v); setNow(nowMs()) }
  const finish = async (tick: boolean) => {
    if (!saved || !unit) { update(null); return }
    setBusy(true)
    await onFinish(unit, Math.max(1, Math.round(elapsed(saved, nowMs()) / 60000)), tick)
    setBusy(false); update(null)
  }

  return <section data-guide="plan-timer" className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    {!saved
      ? <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 shrink-0 text-amber-600" />
          <select aria-label="What are you studying?" value={unit?.id ?? ''} onChange={(e) => setPick(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">{units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}</select>
          <button type="button" disabled={!unit} onClick={() => unit && update({ unitId: unit.id, startedAt: nowMs(), pausedMs: 0, pausedAt: null })} className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-bold text-slate-950"><Play className="h-4 w-4" />Start</button>
        </div>
      : <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Studying</p>
          <p className="text-sm font-semibold leading-snug">{unit?.title ?? 'Subtopic'}</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums" aria-live="off">{clock(elapsed(saved, now || nowMs()))}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button type="button" disabled={busy} onClick={() => update(saved.pausedAt ? { ...saved, pausedMs: saved.pausedMs + (nowMs() - saved.pausedAt), pausedAt: null } : { ...saved, pausedAt: nowMs() })} className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold dark:border-slate-600">{saved.pausedAt ? <><Play className="h-4 w-4" />Resume</> : <><Pause className="h-4 w-4" />Pause</>}</button>
            <button type="button" disabled={busy} onClick={() => void finish(false)} className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 py-2.5 text-sm font-bold dark:border-slate-600"><Square className="h-4 w-4" />Stop</button>
            <button type="button" disabled={busy} onClick={() => void finish(true)} className="rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">Done · tick</button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Stop saves the time only. Done also ticks the subtopic.</p>
        </div>}
  </section>
}
