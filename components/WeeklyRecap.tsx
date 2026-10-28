'use client'

import { useEffect, useMemo, useState } from 'react'
import { Share2, Sparkles } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface Checkin { checkin_status: 'done' | 'partial' | 'missed' | null; minutes_logged: number | null; created_at: string }

export default function WeeklyRecap({ userId }: { userId: string }) {
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0, 0, 0, 0)
    void supabase.from('posts').select('checkin_status,minutes_logged,created_at').eq('user_id', userId).gte('created_at', since.toISOString()).then(({ data }) => setCheckins((data || []) as Checkin[]))
  }, [userId])

  const stats = useMemo(() => {
    const done = checkins.filter((item) => item.checkin_status === 'done').length
    const partial = checkins.filter((item) => item.checkin_status === 'partial').length
    const focused = checkins.reduce((total, item) => total + (item.minutes_logged || 0), 0)
    const consistency = checkins.length ? Math.round(((done + partial * 0.5) / checkins.length) * 100) : 0
    return { done, partial, focused, consistency }
  }, [checkins])

  const share = async () => {
    const text = `My GoalYaar week: ${stats.done} completed check-ins, ${stats.focused} focus minutes, ${stats.consistency}% consistency.`
    if (navigator.share) { try { await navigator.share({ title: 'My GoalYaar week', text }); return } catch { return } }
    await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#101B2D]">
    <div className="flex items-start justify-between"><div><h2 className="flex items-center gap-1.5 text-sm font-bold"><Sparkles className="h-4 w-4 text-amber-500" />Your week</h2><p className="text-xs text-slate-500">A private recap. Share only when you choose.</p></div><button onClick={() => void share()} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold dark:border-slate-700"><Share2 className="h-3.5 w-3.5" />{copied ? 'Copied' : 'Share'}</button></div>
    <div className="mt-3 grid grid-cols-3 gap-2"><div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-[#07101F]"><p className="text-lg font-bold text-amber-500">{stats.done}</p><p className="text-[11px] font-bold text-slate-500">Done</p></div><div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-[#07101F]"><p className="text-lg font-bold text-sky-500">{stats.focused}</p><p className="text-[11px] font-bold text-slate-500">Focus min</p></div><div className="rounded-2xl bg-slate-50 p-3 text-center dark:bg-[#07101F]"><p className="text-lg font-bold text-emerald-500">{stats.consistency}%</p><p className="text-[11px] font-bold text-slate-500">Consistency</p></div></div>
  </section>
}
