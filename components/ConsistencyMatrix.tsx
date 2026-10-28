'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

interface DayLog { date: string; dayLabel: string; minutes: number }

const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const intensity = (minutes: number) => {
  if (minutes === 0) return 'bg-slate-100 border-slate-200 text-slate-400 dark:bg-slate-800/80 dark:border-slate-800'
  if (minutes < 15) return 'bg-amber-200 border-amber-300 text-amber-900 dark:bg-amber-900/60 dark:border-amber-800 dark:text-amber-200'
  if (minutes < 30) return 'bg-slate-900 dark:bg-slate-50 border-slate-900 dark:border-slate-50 text-white dark:text-slate-900'
  return 'bg-amber-400 border-amber-300 text-slate-950 font-bold shadow-sm'
}

/** Focus minutes for each of the last 30 days. */
export default function ConsistencyMatrix({ userId }: { userId: string }) {
  const [days, setDays] = useState<DayLog[]>([])
  const [selected, setSelected] = useState<DayLog | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 29)
      const { data } = await supabase.from('focus_logs').select('minutes_logged, logged_at').eq('user_id', userId).gte('logged_at', start.toISOString())
      const byDay: Record<string, number> = {}
      ;(data || []).forEach((log) => { const key = localKey(new Date(log.logged_at)); byDay[key] = (byDay[key] || 0) + (log.minutes_logged || 0) })
      const list = Array.from({ length: 30 }, (_, index) => {
        const date = new Date(start); date.setDate(start.getDate() + index)
        const key = localKey(date)
        return { date: key, dayLabel: date.toLocaleDateString('en-US', { weekday: 'narrow' }), minutes: byDay[key] || 0 }
      })
      if (active) setDays(list)
    })()
    return () => { active = false }
  }, [userId])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-[#16181B]">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Consistency · last 30 days</h2>
        <span className="text-xs font-bold text-slate-400">{days.filter((day) => day.minutes > 0).length}/30 days</span>
      </div>
      <p className="mt-1 h-4 text-xs text-slate-500">{selected ? <><span className="font-bold text-amber-600 dark:text-amber-400">{new Date(`${selected.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>: {selected.minutes} min focused</> : 'Tap a day to see your focus time'}</p>
      <div className="mt-2 grid grid-cols-6 gap-2">
        {(days.length ? days : Array.from({ length: 30 }, (_, index) => ({ date: String(index), dayLabel: '', minutes: 0 }))).map((day) => (
          <button type="button" key={day.date} onClick={() => setSelected(day)} aria-label={`${day.date}: ${day.minutes} minutes`} className={`flex h-9 flex-col items-center justify-center rounded-xl border transition hover:scale-105 ${intensity(day.minutes)}`}>
            <span className="text-[8px] font-bold opacity-60">{day.dayLabel}</span>
            {day.minutes > 0 && <span className="text-[11px] font-bold">{day.minutes}m</span>}
          </button>
        ))}
      </div>
    </section>
  )
}
