'use client'

import CircleAvatar from '@/components/CircleAvatar'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ChevronDown, Plus, Trash2 } from 'lucide-react'
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
interface BatchCard { id: string; name: string; admin: boolean; task: string | null; done: boolean; status: 'done' | 'partial' | 'missed' | null; avatarUrl?: string | null }
// checkin: counts as showing up. logged: any check-in today, including an honest "Missed".
interface Activity { goal_id: string | null; at: string; minutes: number; checkin: boolean; logged?: boolean }

// One short tour. Everything else is explained the first time it's used.
const WELCOME_TOUR: TourStep[] = [
  { target: 'today-checkin', title: "Hi, I'm Goalie! Check in here", text: 'Done today\'s work? Tap Check in. It takes ten seconds.' },
  { target: 'today-ring', title: 'Your month', text: 'Every day you show up fills a piece of the ring.' },
  { target: 'nav-create', title: 'Check in from anywhere', text: 'The + button opens the same check-in, from any page.' },
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
      supabase.from('posts').select('goal_id,created_at,checkin_status').eq('user_id', user.id).gte('created_at', since.toISOString()),
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
      // This month's batch check-ins: today's status for the cards, and showing up for the ring.
      circleIds.length ? supabase.from('circle_task_checkins').select('circle_id,status,minutes,hours,circle_tasks!inner(task_date)').in('circle_id', circleIds).eq('user_id', user.id).gte('circle_tasks.task_date', localKey(monthStart)) : Promise.resolve({ data: [], error: null }),
    ])
    type BatchCheckin = { circle_id: string; status: 'done' | 'partial' | 'missed'; minutes: number | null; hours: number | null; circle_tasks: { task_date: string } | null }
    const batchCheckins = (myCheckinsResult.data || []) as unknown as BatchCheckin[]
    const taskByCircle = new Map(((tasksResult.data || []) as Array<{ circle_id: string; title: string }>).map((row) => [row.circle_id, row.title]))
    const statusByCircle = new Map(batchCheckins.filter((row) => row.circle_tasks?.task_date === todayKey).map((row) => [row.circle_id, row.status]))
    setBatches(memberships.map((row) => ({ id: row.circles!.id, name: row.circles!.name, admin: row.circles!.owner_id === user.id || ['owner', 'moderator'].includes(row.role), task: taskByCircle.get(row.circles!.id) ?? null, done: statusByCircle.has(row.circles!.id), status: statusByCircle.get(row.circles!.id) ?? null })))
    if (circleIds.length) void supabase.from('circles').select('id,avatar_url').in('id', circleIds).then(({ data, error: photoError }) => {
      if (photoError || !data) return
      const byId = new Map(data.map((row) => [row.id as string, (row as { avatar_url?: string | null }).avatar_url ?? null]))
      setBatches((items) => items.map((item) => ({ ...item, avatarUrl: byId.get(item.id) ?? null })))
    })
    const failed = goalsResult.error || postsResult.error || logsResult.error || collabResult.error || sharedResult.error
    if (failed) { setError('Your day could not be loaded. Pull down or tap Retry.'); setLoading(false); return }

    const owned = ((goalsResult.data || []) as Goal[]).map((goal) => ({ ...goal, shared: false }))
    const ownedIds = new Set(owned.map((goal) => goal.id))
    const shared = ((sharedResult.data || []) as Goal[]).filter((goal) => !ownedIds.has(goal.id)).map((goal) => ({ ...goal, shared: true }))
    setGoals([...owned, ...shared])
    setActivity([
      // "Missed" is honest, but it doesn't fill the ring.
      ...(postsResult.data || []).map((row) => ({ goal_id: row.goal_id, at: row.created_at, minutes: 0, checkin: row.checkin_status !== 'missed', logged: true })),
      ...(logsResult.data || []).map((row) => ({ goal_id: row.goal_id, at: row.logged_at, minutes: row.minutes_logged || 0, checkin: false })),
      ...batchCheckins.filter((row) => row.status !== 'missed' && row.circle_tasks).map((row) => ({ goal_id: null, at: `${row.circle_tasks!.task_date}T12:00:00`, minutes: row.minutes ?? (row.hours != null ? Math.round(row.hours * 60) : 0), checkin: true })),
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

  const doneToday = useMemo(() => new Set(activity.filter((item) => item.logged && localKey(new Date(item.at)) === today).map((item) => item.goal_id)), [activity, today])
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
      <div className="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      {[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
    </main>
  }

  const shownDays = month.filter((day) => day.active).length
  const soFar = month.filter((day) => !day.future).length
  const weekTime = weekMinutes >= 60 ? `${Math.floor(weekMinutes / 60)} h ${weekMinutes % 60 ? `${weekMinutes % 60} m` : ''}`.trim() : `${weekMinutes} min`
  const row = 'flex items-center gap-3 px-4 py-3.5'
  const ghostButton = 'shrink-0 rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-semibold dark:border-slate-600'
  const inkButton = 'shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-50 dark:text-slate-900'
  const doneTag = 'inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-amber-700 dark:text-amber-400'
  const studentBatches = batches.filter((batch) => !batch.admin)
  const mentorBatches = batches.filter((batch) => batch.admin)

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-6">
      <GuideTour name="welcome" steps={WELCOME_TOUR} />

      <header className="mb-5">
        <p className="text-sm font-medium text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight">{greeting()}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="mt-1 text-base text-slate-500">{totalDue === 0 ? 'Nothing due yet today.' : totalDone === totalDue ? 'All done for today.' : `${totalDone} of ${totalDue} done today`}</p>
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"><span>{error}</span><button onClick={() => void load()} className="shrink-0 font-bold underline">Retry</button></div>}

      {/* Showing up, day after day: the ring plus three numbers, as plain text */}
      <section data-tour="today-ring" className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <MonthRing days={month} monthName={monthName} compact />
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-semibold leading-none tracking-tight tabular-nums">{shownDays}<span className="text-base font-medium text-slate-500"> / {soFar} days</span></p>
          <p className="mt-1 text-sm text-slate-500">showed up in {monthName}</p>
          <div className="my-3 h-px bg-slate-200 dark:bg-slate-800" />
          <p className="text-sm"><span className="font-semibold">{dailyStreak}-day</span> <span className="text-slate-500">streak</span></p>
          <p className="mt-0.5 text-sm"><span className="font-semibold">{weekTime}</span> <span className="text-slate-500">this week</span></p>
        </div>
      </section>

      <InstallNudge />

      {/* Everything to do today, in one list: the mentor's task first, then your goals */}
      <section data-tour="today-checkin" className="mt-6">
        <div className="mb-2 flex items-baseline justify-between"><h2 className="text-lg font-semibold">Today</h2><Link href="/create-goal" className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"><Plus className="h-4 w-4" />New goal</Link></div>
        {goals.length === 0 && batches.length === 0
          ? <GoalieMessage title="Your next streak starts here" message="Choose one small thing you can do every day. I'll help you keep going." actionLabel="Create a goal" href="/create-goal" />
          : <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {studentBatches.map((batch) => <Link key={batch.id} href={`/circles/${batch.id}`} className={`${row} transition hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
              <CircleAvatar name={batch.name} url={batch.avatarUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{batch.task ? `From your mentor · ${batch.name}` : batch.name}</span>
                <span className="block truncate text-base font-semibold">{batch.task ?? 'No task from your mentor today'}</span>
              </span>
              {batch.task && (batch.done
                ? batch.status === 'missed' ? <span className="shrink-0 text-sm font-semibold text-slate-500">Missed</span> : <span className={doneTag}><CheckCircle2 className="h-4 w-4" />{batch.status === 'partial' ? 'Partly' : 'Done'}</span>
                : <span className={inkButton}>Check in</span>)}
            </Link>)}

            {visibleGoals.map((goal) => {
              const paused = isPaused(goal)
              const weekly = goal.frequency === 'weekly'
              const once = goal.frequency === 'once'
              const daysThisWeek = weekDays.get(goal.id)?.size || 0
              const done = doneToday.has(goal.id) || (weekly && weekMet(goal))
              return <article key={goal.id} className={row}>
                <div className="min-w-0 flex-1">
                  <Link href={`/goal/${goal.id}`} className={`block truncate text-base font-semibold ${done ? 'text-slate-500' : ''}`}>{goal.title}</Link>
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {once ? 'One-time goal'
                      : weekly ? `${goal.times_per_week} times a week · ${Math.min(daysThisWeek, goal.times_per_week || 1)} of ${goal.times_per_week}`
                      : `Every day · ${goal.current_streak || 0}-day streak`}
                    {goal.shared ? ' · Shared' : ''}{paused ? ' · Paused' : ''}
                  </p>
                </div>
                {!paused && (done
                  ? <span className={doneTag}><CheckCircle2 className="h-4 w-4" />{weekly && !doneToday.has(goal.id) ? 'Week done' : 'Done'}</span>
                  : <Link href={`/check-in?goal=${goal.id}`} className={studentBatches.some((batch) => batch.task && !batch.done) ? ghostButton : inkButton}>Check in</Link>)}
                {!goal.shared && <button type="button" onClick={() => void deleteGoal(goal)} disabled={busyGoalId === goal.id} aria-label={`Delete ${goal.title}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}
              </article>
            })}

            {goals.length === 0 && <Link href="/create-goal" className={`${row} text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white`}><Plus className="h-4 w-4" />Add a personal goal too, like “Revise 2 hours daily”</Link>}
          </div>}
        {finishedOnce > 0 && <p className="mt-2 px-1 text-sm text-slate-500">{finishedOnce} one-time goal{finishedOnce > 1 ? 's' : ''} completed</p>}
      </section>

      {mentorBatches.length > 0 && <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">{mentorBatches.length === 1 ? 'Your batch' : 'Your batches'}</h2>
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {mentorBatches.map((batch) => <Link key={batch.id} href={`/circles/${batch.id}`} className={`${row} transition hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
            <CircleAvatar name={batch.name} url={batch.avatarUrl} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">{batch.name}</span>
              <span className="block truncate text-sm text-slate-500">{batch.task ? `Today: ${batch.task}` : 'No task posted today'}</span>
            </span>
            <span className={batch.task ? ghostButton : inkButton}>{batch.task ? 'Students' : 'Post task'}</span>
          </Link>)}
        </div>
      </section>}

      {userId && <section className="mt-6">
        <button type="button" onClick={() => setStepsOpen((open) => !open)} aria-expanded={stepsOpen} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left text-base font-semibold dark:border-slate-800 dark:bg-slate-900">
          Small steps for today <ChevronDown className={`h-5 w-5 text-slate-400 transition ${stepsOpen ? 'rotate-180' : ''}`} />
        </button>
        {stepsOpen && <div className="mt-2"><TodoWidget userId={userId} /></div>}
      </section>}
    </main>
  )
}
