'use client'

import { useEffect, useState } from 'react'
import { Moon } from 'lucide-react'
import { dayEndsHour } from '@/lib/exams'
import { DAY_END_EVENT, saveDayEnd } from '@/lib/dayEnd'

const OPTIONS = [[0, 'Midnight'], [1, '1 AM'], [2, '2 AM'], [3, '3 AM'], [4, '4 AM']] as const

/** Settings: "My day ends at", for people who study past midnight. */
export default function DayEndSetting() {
  const [hour, setHour] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    const read = () => setHour(dayEndsHour())
    const t = window.setTimeout(read, 0)
    window.addEventListener(DAY_END_EVENT, read)
    return () => { window.clearTimeout(t); window.removeEventListener(DAY_END_EVENT, read) }
  }, [])
  const change = async (next: number) => {
    setHour(next); setNote(null)
    const ok = await saveDayEnd(next)
    setNote(ok ? 'Saved.' : 'Saved on this phone. It will apply to your account once you are online.')
  }
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <label className="flex items-center gap-3" htmlFor="day-ends">
      <Moon className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">My day ends at</span><span className="block text-xs text-slate-500">Study after midnight counts for the day before, until this time.</span></span>
      <select id="day-ends" value={hour} onChange={(e) => void change(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">{OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
    {note && <p role="status" className="mt-2 text-xs text-slate-500">{note}</p>}
  </div>
}
