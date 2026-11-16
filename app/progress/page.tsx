'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Timer } from 'lucide-react'
import MonthRing, { type MonthDay } from '@/components/MonthRing'
import { examInfo } from '@/lib/prep/exam'
import { planFor } from '@/lib/prep/pace'
import { retention } from '@/lib/prep/revision'
import { usePrepData } from '@/lib/prep/usePrepData'
import { localDateString } from '@/lib/exams'
import { supabase } from '@/utils/supabase'

interface Goal { id: string; title: string; current_streak: number | null; frequency: string | null; times_per_week: number | null; category: string | null; is_completed: boolean | null }

const VIEW_KEY = 'goalyaar-prep-view'
const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const duration = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`)

/** Progress: how the month and week have gone, each exam's coverage, and each personal goal's run. */
export default function ProgressPage() {
  const router = useRouter()
  const prep = usePrepData(true)
  const today = localDateString()
  const [goals, setGoals] = useState<Goal[]>([])
  const [posts, setPosts] = useState<{ goal_id: string | null; created_at: string }[]>([])
  const [focus, setFocus] = useState<{ minutes_logged: number | null; logged_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/progress'); return }
      const monthStart = new Date(); monthStart.setHours(0, 0, 0, 0); monthStart.setDate(1)
      const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
      const since = weekStart < monthStart ? weekStart : monthStart
      const [g, p, f] = await Promise.all([
        supabase.from('goals').select('id,title,current_streak,frequency,times_per_week,category,is_completed').eq('user_id', session.user.id).order('created_at', { ascending: true }),
        supabase.from('posts').select('goal_id,created_at').eq('user_id', session.user.id).gte('created_at', since.toISOString()),
        supabase.from('focus_logs').select('minutes_logged,logged_at').eq('user_id', session.user.id).gte('logged_at', since.toISOString()),
      ])
      setGoals(((g.data ?? []) as Goal[]).filter((x) => x.category !== 'exam_prep' && !(x.frequency === 'once' && x.is_completed)))
      setPosts((p.data ?? []) as typeof posts)
      setFocus((f.data ?? []) as typeof focus)
      setLoading(false)
    })()
  }, [router])

  // Every day with any activity: a check-in, focus time, or study and revision on the plan.
  const { month, monthName, activeDays, soFar, weekMinutes, weekDays } = useMemo(() => {
    const now = new Date()
    const days = new Map<string, number>()
    const bump = (key: string, minutes = 0) => days.set(key, (days.get(key) ?? 0) + minutes)
    posts.forEach((p) => bump(localKey(new Date(p.created_at))))
    focus.forEach((f) => bump(localKey(new Date(f.logged_at)), f.minutes_logged ?? 0))
    prep.events.filter((e) => !e.undo).forEach((e) => bump(e.occurredOn, e.minutes ?? 0))
    const count = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const list: MonthDay[] = Array.from({ length: count }, (_, i) => {
      const key = localKey(new Date(now.getFullYear(), now.getMonth(), i + 1))
      return { day: i + 1, key, active: days.has(key), minutes: days.get(key) ?? 0, checkins: 0, future: key > today, today: key === today }
    })
    const ws = new Date(); ws.setHours(0, 0, 0, 0); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7))
    const weekKeys = [...days.keys()].filter((k) => k >= localKey(ws) && k <= today)
    return {
      month: list, monthName: now.toLocaleDateString('en-IN', { month: 'long' }),
      activeDays: list.filter((d) => d.active).length, soFar: list.filter((d) => !d.future).length,
      weekMinutes: weekKeys.reduce((sum, k) => sum + (days.get(k) ?? 0), 0), weekDays: weekKeys.length,
    }
  }, [posts, focus, prep.events, today])

  const exams = useMemo(() => prep.status !== 'ready' ? [] : prep.plans.map((p) => {
    const nodes = prep.nodesByTemplate.get(p.templateId) ?? []
    const plan = planFor(nodes, prep.states, p, today)
    const units = plan?.units ?? []
    const covered = units.filter((u) => prep.states.get(u.id)?.touchedOn).length
    const due = nodes.filter((n) => n.kind === 'topic' && !n.ownerId && prep.states.get(n.id)?.touchedOn).filter((n) => { const r = retention(prep.states.get(n.id)!, today); return r.status === 'due_today' || r.status === 'overdue' }).length
    return { id: p.templateId, name: examInfo(p.code).short, pct: units.length ? Math.round((covered / units.length) * 100) : 0, covered, total: units.length, due }
  }), [prep.status, prep.plans, prep.nodesByTemplate, prep.states, today])

  const weekCount = (goalId: string) => {
    const ws = new Date(); ws.setHours(0, 0, 0, 0); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7))
    return new Set(posts.filter((p) => p.goal_id === goalId && new Date(p.created_at) >= ws).map((p) => localKey(new Date(p.created_at)))).size
  }

  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-6">
    <h1 className="text-2xl font-bold tracking-tight">Progress</h1>

    {loading
      ? <div className="mt-5 space-y-3" aria-busy="true">{[1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>
      : <>
          <section aria-label="This month" className={`${card} mt-5 flex items-center gap-4 p-4`}>
            <MonthRing days={month} monthName={monthName} compact />
            <div className="min-w-0 flex-1 space-y-3">
              <div><p className="text-2xl font-bold tabular-nums">{activeDays}<span className="text-base font-medium text-slate-500"> of {soFar} days</span></p><p className="text-sm text-slate-500">active in {monthName}</p></div>
              {weekMinutes > 0
                ? <div><p className="text-lg font-bold tabular-nums">{duration(weekMinutes)}</p><p className="text-sm text-slate-500">of study and focus this week, over {weekDays === 1 ? 'one day' : `${weekDays} days`}</p></div>
                : <p className="text-sm text-slate-500">No study or focus time logged this week yet.</p>}
            </div>
          </section>

          {exams.length > 0 && <section aria-labelledby="exams-h" className="mt-6">
            <h2 id="exams-h" className="mb-3 text-base font-semibold">Exams</h2>
            <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
              {exams.map((e) => <Link key={e.id} href="/prep/progress" onClick={() => { try { window.localStorage.setItem(VIEW_KEY, e.id) } catch { /* opens the last exam viewed */ } }} className="flex items-center gap-3 px-4 py-4">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3"><span className="text-[15px] font-semibold">{e.name}</span><span className="text-sm font-semibold tabular-nums">{e.pct}%</span></span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${e.pct}%` }} /></span>
                  <span className="mt-2 block text-sm text-slate-500">{e.covered} of {e.total} subtopics covered{e.due ? `. ${e.due} ${e.due === 1 ? 'topic is' : 'topics are'} due for revision.` : '.'}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>)}
            </div>
            <p className="mt-2 px-1 text-sm text-slate-500">Open an exam for mock scores, weak topics and mistakes.</p>
          </section>}

          {goals.length > 0 && <section aria-labelledby="goals-h" className="mt-6">
            <h2 id="goals-h" className="mb-3 text-base font-semibold">Personal goals</h2>
            <div className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
              {goals.map((g) => {
                const week = weekCount(g.id)
                const line = g.frequency === 'weekly' ? `${Math.min(week, g.times_per_week || 1)} of ${g.times_per_week || 1} this week` : g.frequency === 'once' ? 'One-time goal' : (g.current_streak || 0) > 0 ? `${g.current_streak} ${g.current_streak === 1 ? 'day' : 'days'} in a row` : 'Not started this week'
                return <Link key={g.id} href={`/goal/${g.id}`} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{g.title}</span><span className="block text-sm text-slate-500">{line}</span></span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              })}
            </div>
          </section>}

          <Link href="/focus" className={`${card} mt-6 flex items-center gap-3 p-4`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Timer className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Focus sessions</span><span className="block text-sm text-slate-500">The timer, and this week&apos;s sessions to edit or delete</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>

          {exams.length === 0 && goals.length === 0 && <p className="mt-6 text-sm text-slate-500">Your progress shows up here once you have a goal or an exam plan.</p>}
        </>}
  </main>
}
