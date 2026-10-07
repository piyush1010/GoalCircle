'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Flame, Play, Plus, Target } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface Goal {
  id: string
  title: string
  current_streak: number | null
  is_completed: boolean | null
  created_at: string
}

interface FocusLog {
  goal_id: string | null
  minutes_logged: number | null
  logged_at: string
}

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

export default function DashboardPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [logs, setLogs] = useState<FocusLog[]>([])
  const [displayName, setDisplayName] = useState('Member')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      router.replace('/login')
      return
    }

    const user = session.user
    setDisplayName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Member')

    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    weekStart.setDate(weekStart.getDate() - 6)

    const [goalsResult, logsResult] = await Promise.all([
      supabase.from('goals').select('id,title,current_streak,is_completed,created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('focus_logs').select('goal_id,minutes_logged,logged_at').eq('user_id', user.id).gte('logged_at', weekStart.toISOString()).order('logged_at', { ascending: false }),
    ])

    if (goalsResult.error || logsResult.error) {
      setError(goalsResult.error?.message || logsResult.error?.message || 'Could not load your progress.')
    } else {
      setGoals((goalsResult.data || []) as Goal[])
      setLogs((logsResult.data || []) as FocusLog[])
    }
    setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadDashboard) }, [loadDashboard])

  const completedCount = goals.filter((goal) => goal.is_completed).length
  const progressPercent = goals.length ? Math.round((completedCount / goals.length) * 100) : 0
  const today = dayKey(new Date())
  const todayMinutesByGoal = useMemo(() => logs.reduce<Record<string, number>>((totals, log) => {
    if (!log.goal_id || dayKey(new Date(log.logged_at)) !== today) return totals
    totals[log.goal_id] = (totals[log.goal_id] || 0) + (log.minutes_logged || 0)
    return totals
  }, {}), [logs, today])

  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - (6 - index))
    const key = dayKey(date)
    const minutes = logs.filter((log) => dayKey(new Date(log.logged_at)) === key).reduce((sum, log) => sum + (log.minutes_logged || 0), 0)
    return { key, label: date.toLocaleDateString('en', { weekday: 'narrow' }), minutes }
  }), [logs])

  const toggleGoal = async (goal: Goal) => {
    const nextValue = !goal.is_completed
    setUpdatingGoalId(goal.id)
    setGoals((current) => current.map((item) => item.id === goal.id ? { ...item, is_completed: nextValue } : item))
    const { error: updateError } = await supabase.from('goals').update({ is_completed: nextValue }).eq('id', goal.id)
    if (updateError) {
      setGoals((current) => current.map((item) => item.id === goal.id ? goal : item))
      setError('That change was not saved. Please try again.')
    }
    setUpdatingGoalId(null)
  }

  if (loading) {
    return (
      <main className="mx-auto min-h-screen max-w-xl space-y-4 px-4 py-6 pb-28" aria-busy="true">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-32 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        {[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div><h1 className="text-xl font-black tracking-tight">GoalCircle</h1><p className="text-xs font-medium text-slate-500 dark:text-slate-400">Daily accountability dashboard</p></div>
        <div className="flex items-center gap-2 text-right"><span className="max-w-32 truncate text-xs font-bold text-amber-600 dark:text-amber-400">{displayName}</span><div className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-amber-500 shadow-sm dark:border-slate-700 dark:bg-slate-900"><Target className="h-4 w-4" aria-hidden="true" /></div></div>
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"><span>{error}</span><button onClick={() => void loadDashboard()} className="shrink-0 underline">Retry</button></div>}

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-500"><span>Today&apos;s pace</span><span>{progressPercent}%</span></div>
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">{completedCount} of {goals.length} completed</h2><p className="text-xs text-slate-500 dark:text-slate-400">{goals.length ? 'Keep the momentum going.' : 'Create your first goal to begin.'}</p></div><div className="grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#f59e0b ${progressPercent}%, var(--surface-muted) 0)` }} aria-label={`${progressPercent}% complete`}><div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[10px] font-black dark:bg-[#101b2d]">{progressPercent}%</div></div></div>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">Today&apos;s goals</h2><Link href="/create-goal" className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400"><Plus className="h-3.5 w-3.5" />New goal</Link></div>
        {goals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#101b2d]"><Target className="mx-auto mb-3 h-8 w-8 text-amber-500" /><p className="text-sm font-bold">Your next streak starts here</p><p className="mb-4 mt-1 text-xs text-slate-500">Choose one action you can repeat consistently.</p><Link href="/create-goal" className="inline-flex rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950">Create a goal</Link></div>
        ) : (
          <div className="space-y-3">{goals.map((goal) => {
            const minutes = todayMinutesByGoal[goal.id] || 0
            return <article key={goal.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><button onClick={() => void toggleGoal(goal)} disabled={updatingGoalId === goal.id} aria-label={goal.is_completed ? `Mark ${goal.title} incomplete` : `Mark ${goal.title} complete`} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${goal.is_completed ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-300 dark:border-slate-600'}`}>{goal.is_completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</button><div className="min-w-0"><Link href={`/goal/${goal.id}`} className={`block truncate text-sm font-bold ${goal.is_completed ? 'text-slate-500 line-through' : ''}`}>{goal.title}</Link><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400"><Flame className="h-3 w-3" />{goal.current_streak || 0}d streak</span></div></div>{!goal.is_completed && <Link href={`/focus?goal=${goal.id}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300"><Play className="h-3 w-3" fill="currentColor" />Focus</Link>}</div>
              <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800"><div className="mb-1 flex justify-between text-[10px] font-medium text-slate-500"><span>Time logged today</span><span>{minutes} min</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, minutes / 0.6)}%` }} /></div></div>
            </article>
          })}</div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]"><h2 className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Consistency · last 7 days</h2><div className="grid grid-cols-7 gap-2 text-center">{week.map((day) => <div key={day.key} className="space-y-1.5" title={`${day.minutes} minutes`}><div className={`grid aspect-square place-items-center rounded-lg text-xs font-black ${day.minutes > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>{day.minutes > 0 && <Check className="h-3.5 w-3.5" />}</div><span className="text-[9px] font-bold text-slate-400">{day.label}</span></div>)}</div></section>
    </main>
  )
}
