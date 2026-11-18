'use client'

import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { supabase } from '@/utils/supabase'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Settings: which day the weekly summary arrives. Sunday unless the person picks another. */
export default function WeeklySummaryDay() {
  const [day, setDay] = useState<number | null>(null) // null = not loaded, or the database isn't ready yet
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return
      const { data, error } = await supabase.from('user_preferences').select('weekly_summary_day').eq('user_id', session.user.id).maybeSingle()
      if (!alive || error) return // column not added yet: keep the setting hidden
      setDay(Number((data as { weekly_summary_day?: number } | null)?.weekly_summary_day ?? 0))
    })
    return () => { alive = false }
  }, [])
  if (day === null) return null
  const change = async (next: number) => {
    const before = day
    setDay(next); setNote(null)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = session?.user
      ? await supabase.from('user_preferences').upsert({ user_id: session.user.id, weekly_summary_day: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      : { error: true }
    if (error) { setDay(before); setNote('That didn’t save. Please try again.') } else setNote(`Saved. Your summary comes on ${DAYS[next]} evenings.`)
  }
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <label className="flex items-center gap-3" htmlFor="summary-day">
      <CalendarDays className="h-5 w-5 shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 dark:text-white">Weekly summary on</span><span className="block text-xs text-slate-500">Your last seven days, in the evening</span></span>
      <select id="summary-day" value={day} onChange={(e) => void change(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
        {DAYS.map((name, i) => <option key={name} value={i}>{name}</option>)}
      </select>
    </label>
    {note && <p role="status" className="mt-2 text-xs text-slate-500">{note}</p>}
  </div>
}
