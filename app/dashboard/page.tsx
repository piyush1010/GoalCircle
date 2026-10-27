'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, Flame, PauseCircle, Plus, Timer, Trash2, UsersRound } from 'lucide-react'
import GoalieMessage from '@/components/GoalieMessage'
import GuideTour, { type TourStep } from '@/components/GuideTour'
import MonthRing, { type MonthDay } from '@/components/MonthRing'
import TodoWidget from '@/components/TodoWidget'
import { confirmAction } from '@/lib/confirm'
import { supabase } from '@/utils/supabase'

interface Goal {
  id: string
  user_id: string
  title: string
  current_streak: number | null
  status: string | null
  pause_until: string | null
  shared?: boolean
}
interface Activity { goal_id: string | null; at: string; minutes: number; checkin: boolean }

const WELCOME_TOUR: TourStep[] = [
  { title: "Hi, I'm Goalie!", text: "This is Today: your goals, and how many days you've shown up this month. One minute tour?" },
  { target: 'today-ring', title: 'Your month', text: 'Every day you check in or focus fills a piece of the ring. Try not to break the circle.' },
  { target: 'today-goals', title: 'Check in', text: 'Tap Check in on a goal once you have done it today. That keeps your streak alive.' },
  { target: 'nav-create', title: 'Start here', text: 'Create a goal, or post today’s progress.' },
  { target: 'nav-circles', title: 'Circles', text: "Join your mentor's batch with an invite link, or start a group with friends." },
  { target: 'nav-feed', title: 'Feed', text: 'See who showed up today. Boost a win, comment or send a nudge.' },
]

const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export default function TodayPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [firstName, setFirstName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyGoalId, setBusyGoalId] = useState<string | null>(null)
  const [stepsOpen, setStepsOpen] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/dashboard'); return }
    const user = session.user
    setUserId(user.id)
    setFirstName(String(user.user_metadata?.full_name || user.user_metadata?.name || '').split(' ')[0])
    void supabase.rpc('resume_expired_goal_pauses')

    const monthStart = new Date(); monthStart.setHours(0, 0, 0, 0); monthStart.setDate(1)
    const fields = 'id,user_id,title,current_streak,status,pause_until'
    const [goalsResult, postsResult, logsResult, collabResult] = await Promise.all([
      supabase.from('goals').select(fields).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('posts').select('goal_id,created_at').eq('user_id', user.id).gte('created_at', monthStart.toISOString()),
      supabase.from('focus_logs').select('goal_id,minutes_logged,logged_at').eq('user_id', user.id).gte('logged_at', monthStart.toISOString()),
      supabase.from('goal_collaborators').select('goal_id').eq('user_id', user.id).eq('status', 'accepted'),
    ])
    const sharedIds = (collabResult.data || []).map((row) => row.goal_id)
    const sharedResult = sharedIds.length ? await supabase.from('goals').select(fields).in('id', sharedIds) : { data: [], error: null }
    const failed = goalsResult.error || postsResult.error || logsResult.error || collabResult.error || sharedResult.error
    if (failed) { setError('Your day could not be loaded. Pull down or tap Retry.'); setLoading(false); return }

    const owned = ((goalsResult.data || []) as Goal[]).map((goal) => ({ ...goal, shared: false }))
    const ownedIds = new Set(owned.map((goal) => goal.id))
    const shared = ((sharedResult.data || []) as Goal[]).filter((goal) => !ownedIds.has(goal.id)).map((goal) => ({ ...goal, shared: true }))
    setGoals([...owned, ...shared])
    setActivity([
      ...(postsResult.data || []).map((row) => ({ goal_id: row.goal_id, at: row.created_at, minutes: 0, checkin: true })),
      ...(logsResult.data || []).map((row) => ({ goal_id: row.goal_id, at: row.logged_at, minutes: row.minutes_logged || 0, checkin: false })),
    ])
    setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const today = localKey(new Date())
  const { month, monthName } = useMemo(() => {
    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const byDay = new Map<string, { minutes: number; checkins: number }>()
    activity.forEach((item) => {
      const key = localKey(new Date(item.at))
      const entry = byDay.get(key) || { minutes: 0, checkins: 0 }
      entry.minutes += item.minutes; if (item.checkin) entry.checkins += 1
      byDay.set(key, entry)
    })
    const list: MonthDay[] = Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), index + 1)
      const key = localKey(date)
      const entry = byDay.get(key)
      return { day: index + 1, key, active: Boolean(entry && (entry.checkins || entry.minutes)), minutes: entry?.minutes || 0, checkins: entry?.checkins || 0, future: key > today, today: key === today }
    })
    return { month: list, monthName: now.toLocaleDateString(undefined, { month: 'long' }) }
  }, [activity, today])

  const doneToday = useMemo(() => new Set(activity.filter((item) => item.checkin && localKey(new Date(item.at)) === today).map((item) => item.goal_id)), [activity, today])
  const weekMinutes = useMemo(() => {
    const since = Date.now() - 7 * 86_400_000
    return activity.filter((item) => new Date(item.at).getTime() >= since).reduce((sum, item) => sum + item.minutes, 0)
  }, [activity])
  const bestStreak = goals.reduce((max, goal) => Math.max(max, goal.current_streak || 0), 0)
  const activeGoals = goals.filter((goal) => !(goal.status === 'paused' && goal.pause_until && new Date(goal.pause_until) > new Date()))
  const checkedCount = activeGoals.filter((goal) => doneToday.has(goal.id)).length

  const deleteGoal = async (goal: Goal) => {
    if (goal.user_id !== userId || !(await confirmAction(`Delete “${goal.title}” and all its progress? This cannot be undone.`))) return
    setBusyGoalId(goal.id)
    const { data, error: deleteError } = await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', goal.user_id).select('id')
    setBusyGoalId(null)
    if (deleteError || !data?.length) { setError('That goal could not be deleted. Please try again.'); return }
    setGoals((current) => current.filter((item) => item.id !== goal.id))
  }

  if (loading) {
    return <main className="mx-auto min-h-screen max-w-xl space-y-4 px-4 pb-28 pt-5" aria-busy="true">
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="mx-auto h-52 w-52 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
      {[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
    </main>
  }

  const chip = 'flex shrink-0 snap-start items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold shadow-sm dark:border-slate-700 dark:bg-[#101b2d]'

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
      <GuideTour name="welcome" steps={WELCOME_TOUR} />

      <header className="mb-4">
        <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{greeting()}{firstName ? `, ${firstName}` : ''} 👋</p>
        <h1 className="text-2xl font-black tracking-tight">{activeGoals.length === 0 ? 'Let’s start today' : checkedCount === activeGoals.length ? 'All done today! 🎉' : `${activeGoals.length - checkedCount} to go today`}</h1>
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"><span>{error}</span><button onClick={() => void load()} className="shrink-0 font-black underline">Retry</button></div>}

      {/* The 80%: showing up, day after day */}
      <section data-tour="today-ring" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
        <MonthRing days={month} monthName={monthName} />
      </section>

      {/* Quick numbers, swipe sideways */}
      <div className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <span className={chip}><Flame className="h-4 w-4 text-orange-500" />{bestStreak} day streak</span>
        <span className={chip}><CheckCircle2 className="h-4 w-4 text-emerald-500" />{checkedCount}/{activeGoals.length} today</span>
        <span className={chip}><Timer className="h-4 w-4 text-sky-500" />{weekMinutes} min this week</span>
      </div>

      <section data-tour="today-goals" className="mt-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-black">Today’s goals</h2><Link href="/create-goal" className="flex items-center gap-1 text-sm font-black text-amber-600 dark:text-amber-400"><Plus className="h-4 w-4" />New goal</Link></div>
        {goals.length === 0
          ? <GoalieMessage title="Your next streak starts here" message="Choose one small thing you can do every day. I'll help you keep going." actionLabel="Create a goal" href="/create-goal" />
          : <div className="space-y-2.5">{goals.map((goal) => {
            const paused = goal.status === 'paused' && Boolean(goal.pause_until && new Date(goal.pause_until) > new Date())
            const done = doneToday.has(goal.id)
            return <article key={goal.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm ${done ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 bg-white dark:border-slate-700/70 dark:bg-[#101b2d]'}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/goal/${goal.id}`} className="block truncate text-base font-black">{goal.title}</Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" />{goal.current_streak || 0} day{goal.current_streak === 1 ? '' : 's'}</span>
                  {goal.shared && <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400"><UsersRound className="h-3.5 w-3.5" />Shared</span>}
                  {paused && <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400"><PauseCircle className="h-3.5 w-3.5" />Paused</span>}
                </p>
              </div>
              {!paused && (done
                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" />Done</span>
                : <Link href={`/check-in?goal=${goal.id}`} className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-sm">Check in</Link>)}
              {!goal.shared && <button type="button" onClick={() => void deleteGoal(goal)} disabled={busyGoalId === goal.id} aria-label={`Delete ${goal.title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}
            </article>
          })}</div>}
      </section>

      {userId && <section className="mt-5">
        <button type="button" onClick={() => setStepsOpen((open) => !open)} aria-expanded={stepsOpen} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-black shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
          Small steps for today <ChevronDown className={`h-5 w-5 transition ${stepsOpen ? 'rotate-180' : ''}`} />
        </button>
        {stepsOpen && <div className="mt-2"><TodoWidget userId={userId} /></div>}
      </section>}
    </main>
  )
}
