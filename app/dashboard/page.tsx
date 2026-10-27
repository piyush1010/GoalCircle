'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, Flame, PauseCircle, Plus, Timer, Trash2, UsersRound } from 'lucide-react'
import GoalieMessage from '@/components/GoalieMessage'
import InstallNudge from '@/components/InstallNudge'
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
  frequency?: 'daily' | 'weekly' | 'once' | null
  times_per_week?: number | null
  is_completed?: boolean | null
  shared?: boolean
}
interface BatchCard { id: string; name: string; admin: boolean; task: string | null; done: boolean }
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
  const [batches, setBatches] = useState<BatchCard[]>([])

  const load = useCallback(async () => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/dashboard'); return }
    const user = session.user
    setUserId(user.id)
    setFirstName(String(user.user_metadata?.full_name || user.user_metadata?.name || '').split(' ')[0])
    void supabase.rpc('resume_expired_goal_pauses')

    const monthStart = new Date(); monthStart.setHours(0, 0, 0, 0); monthStart.setDate(1)
    // Weekly goals need this week's check-ins even when the week started last month.
    const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
    const since = weekStart < monthStart ? weekStart : monthStart
    const fields = 'id,user_id,title,current_streak,status,pause_until,frequency,times_per_week,is_completed'
    const todayKey = localKey(new Date())
    const [goalsResult, postsResult, logsResult, collabResult, membershipResult] = await Promise.all([
      supabase.from('goals').select(fields).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('posts').select('goal_id,created_at').eq('user_id', user.id).gte('created_at', since.toISOString()),
      supabase.from('focus_logs').select('goal_id,minutes_logged,logged_at').eq('user_id', user.id).gte('logged_at', since.toISOString()),
      supabase.from('goal_collaborators').select('goal_id').eq('user_id', user.id).eq('status', 'accepted'),
      supabase.from('circle_memberships').select('role, circles(id,name,owner_id)').eq('user_id', user.id),
    ])
    const sharedIds = (collabResult.data || []).map((row) => row.goal_id)
    type MembershipRow = { role: string; circles: { id: string; name: string; owner_id: string } | null }
    const memberships = ((membershipResult.data || []) as unknown as MembershipRow[]).filter((row) => row.circles)
    const circleIds = memberships.map((row) => row.circles!.id)
    const [sharedResult, tasksResult, myCheckinsResult] = await Promise.all([
      sharedIds.length ? supabase.from('goals').select(fields).in('id', sharedIds) : Promise.resolve({ data: [], error: null }),
      circleIds.length ? supabase.from('circle_tasks').select('circle_id,title').in('circle_id', circleIds).eq('task_date', todayKey) : Promise.resolve({ data: [], error: null }),
      circleIds.length ? supabase.from('circle_task_checkins').select('circle_id,circle_tasks!inner(task_date)').in('circle_id', circleIds).eq('user_id', user.id).eq('circle_tasks.task_date', todayKey) : Promise.resolve({ data: [], error: null }),
    ])
    const taskByCircle = new Map(((tasksResult.data || []) as Array<{ circle_id: string; title: string }>).map((row) => [row.circle_id, row.title]))
    const doneCircles = new Set(((myCheckinsResult.data || []) as Array<{ circle_id: string }>).map((row) => row.circle_id))
    setBatches(memberships.map((row) => ({ id: row.circles!.id, name: row.circles!.name, admin: row.circles!.owner_id === user.id || ['owner', 'moderator'].includes(row.role), task: taskByCircle.get(row.circles!.id) ?? null, done: doneCircles.has(row.circles!.id) })))
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
  // Days checked in this week, per goal (weeks start on Monday)
  const weekDays = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const map = new Map<string, Set<string>>()
    activity.forEach((item) => { if (!item.goal_id || new Date(item.at) < start) return; const days = map.get(item.goal_id) || new Set<string>(); days.add(localKey(new Date(item.at))); map.set(item.goal_id, days) })
    return map
  }, [activity])
  const dailyStreak = goals.filter((goal) => (goal.frequency ?? 'daily') === 'daily').reduce((max, goal) => Math.max(max, goal.current_streak || 0), 0)
  const visibleGoals = goals.filter((goal) => !(goal.frequency === 'once' && goal.is_completed))
  const finishedOnce = goals.filter((goal) => goal.frequency === 'once' && goal.is_completed).length
  const isPaused = (goal: Goal) => goal.status === 'paused' && Boolean(goal.pause_until && new Date(goal.pause_until) > new Date())
  const weekMet = (goal: Goal) => (weekDays.get(goal.id)?.size || 0) >= (goal.times_per_week || 1)
  // Only goals that are actually due today count: a weekly goal that already hit its target isn't.
  // A weekly goal only counts as due when today is needed to still hit the week's target;
  // otherwise it's an optional check-in, so rest days never look like falling behind.
  const daysLeftInWeek = 7 - ((new Date().getDay() + 6) % 7)
  const weeklyDue = (goal: Goal) => (goal.times_per_week || 1) - (weekDays.get(goal.id)?.size || 0) >= daysLeftInWeek
  const activeGoals = visibleGoals.filter((goal) => !isPaused(goal) && (goal.frequency !== 'weekly' || doneToday.has(goal.id) || (!weekMet(goal) && weeklyDue(goal))))
  const checkedCount = activeGoals.filter((goal) => doneToday.has(goal.id)).length
  const studentTasks = batches.filter((batch) => !batch.admin && batch.task)
  const totalDue = activeGoals.length + studentTasks.length
  const totalDone = checkedCount + studentTasks.filter((batch) => batch.done).length

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
        <h1 className="text-2xl font-black tracking-tight">{totalDue === 0 ? 'Let’s start today' : totalDone === totalDue ? 'All done today! 🎉' : `${totalDue - totalDone} to go today`}</h1>
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"><span>{error}</span><button onClick={() => void load()} className="shrink-0 font-black underline">Retry</button></div>}

      {/* The 80%: showing up, day after day */}
      <section data-tour="today-ring" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
        <MonthRing days={month} monthName={monthName} />
      </section>

      <InstallNudge />

      {/* Quick numbers, swipe sideways */}
      <div className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <span className={chip}><Flame className="h-4 w-4 text-orange-500" />{dailyStreak} day streak</span>
        <span className={chip}><CheckCircle2 className="h-4 w-4 text-emerald-500" />{totalDone}/{totalDue} today</span>
        <span className={chip}><Timer className="h-4 w-4 text-sky-500" />{weekMinutes} min this week</span>
      </div>

      {batches.length > 0 && <section className="mt-5">
        <h2 className="mb-2 text-lg font-black">{batches.length === 1 ? 'Your batch' : 'Your circles'}</h2>
        <div className="space-y-2.5">{batches.map((batch) => (
          <Link key={batch.id} href={`/circles/${batch.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-amber-500 dark:border-slate-700/70 dark:bg-[#101b2d]">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><UsersRound className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-black">{batch.name}</span>
              <span className="block truncate text-sm font-semibold text-slate-600 dark:text-slate-300">{batch.task ? batch.task : batch.admin ? 'No task posted today' : 'No task yet today'}</span>
            </span>
            {batch.admin
              ? <span className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black dark:border-slate-700">{batch.task ? 'Students' : 'Post task'}</span>
              : batch.task && (batch.done
                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" />Done</span>
                : <span className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950">Check in</span>)}
          </Link>
        ))}</div>
      </section>}

      <section data-tour="today-goals" className="mt-5">
        <div className="mb-2 flex items-center justify-between"><h2 className="text-lg font-black">Today’s goals</h2><Link href="/create-goal" className="flex items-center gap-1 text-sm font-black text-amber-600 dark:text-amber-400"><Plus className="h-4 w-4" />New goal</Link></div>
        {goals.length === 0 && batches.length > 0
          ? <Link href="/create-goal" className="block rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">Add a personal goal too, like “Revise 2 hours daily”</Link>
          : goals.length === 0
          ? <GoalieMessage title="Your next streak starts here" message="Choose one small thing you can do every day. I'll help you keep going." actionLabel="Create a goal" href="/create-goal" />
          : <div className="space-y-2.5">{visibleGoals.map((goal) => {
            const paused = isPaused(goal)
            const weekly = goal.frequency === 'weekly'
            const once = goal.frequency === 'once'
            const daysThisWeek = weekDays.get(goal.id)?.size || 0
            const done = doneToday.has(goal.id) || (weekly && weekMet(goal))
            return <article key={goal.id} className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm ${done ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-slate-200 bg-white dark:border-slate-700/70 dark:bg-[#101b2d]'}`}>
              <div className="min-w-0 flex-1">
                <Link href={`/goal/${goal.id}`} className="block truncate text-base font-black">{goal.title}</Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {once ? <span>One-time goal</span>
                    : weekly ? <><span>{Math.min(daysThisWeek, goal.times_per_week || 1)} of {goal.times_per_week} this week</span><span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" />{goal.current_streak || 0} wk</span></>
                    : <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" />{goal.current_streak || 0} day{goal.current_streak === 1 ? '' : 's'}</span>}
                  {goal.shared && <span className="inline-flex items-center gap-1 text-violet-600 dark:text-violet-400"><UsersRound className="h-3.5 w-3.5" />Shared</span>}
                  {paused && <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400"><PauseCircle className="h-3.5 w-3.5" />Paused</span>}
                </p>
              </div>
              {!paused && (done
                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-white"><CheckCircle2 className="h-4 w-4" />{weekly && !doneToday.has(goal.id) ? 'Week done' : 'Done'}</span>
                : <Link href={`/check-in?goal=${goal.id}`} className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-sm">Check in</Link>)}
              {!goal.shared && <button type="button" onClick={() => void deleteGoal(goal)} disabled={busyGoalId === goal.id} aria-label={`Delete ${goal.title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}
            </article>
          })}</div>}
      </section>

      {finishedOnce > 0 && <p className="mt-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300">🎉 {finishedOnce} one-time goal{finishedOnce > 1 ? 's' : ''} completed</p>}

      {userId && <section className="mt-5">
        <button type="button" onClick={() => setStepsOpen((open) => !open)} aria-expanded={stepsOpen} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-base font-black shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
          Small steps for today <ChevronDown className={`h-5 w-5 transition ${stepsOpen ? 'rotate-180' : ''}`} />
        </button>
        {stepsOpen && <div className="mt-2"><TodoWidget userId={userId} /></div>}
      </section>}
    </main>
  )
}
