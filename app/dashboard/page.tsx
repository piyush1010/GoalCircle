'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight, GraduationCap, UsersRound } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import ProfileAvatar from '@/components/ProfileAvatar'
import InstallNudge from '@/components/InstallNudge'
import GoalCircles, { type GoalCircle } from '@/components/home/GoalCircles'
import TodayList, { type TodayCounts } from '@/components/home/TodayList'
import { examInfo } from '@/lib/prep/exam'
import { usePrepData } from '@/lib/prep/usePrepData'
import { localDateString } from '@/lib/exams'
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
  category?: string | null
  shared?: boolean
}
interface Batch { id: string; name: string; admin: boolean; task: string | null; done: boolean; checkedIn: number; members: number }
interface Activity { goal_id: string | null; at: string; logged: boolean }

const VIEW_KEY = 'goalyaar-prep-view' // which exam the plan screens open on
const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const weekStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d }

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

/**
 * Home: your goals as circles, and one list of everything due today across all of them.
 * Exams open their plan, personal goals open their page, and batches you run open the batch.
 */
export default function HomePage() {
  const router = useRouter()
  const prep = usePrepData(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [user, setUser] = useState<{ id: string; firstName: string; name: string; avatar: string | null } | null>(null)
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<TodayCounts | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/dashboard'); return }
    const u = session.user
    const name = String(u.user_metadata?.full_name || u.user_metadata?.name || '')
    setUser({ id: u.id, firstName: name.split(' ')[0], name, avatar: (u.user_metadata?.avatar_url as string | undefined) ?? null })
    void supabase.rpc('resume_expired_goal_pauses')
    void supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false).then(({ count }) => setUnread(count || 0))

    const since = weekStart()
    const todayKey = localDateString()
    const fields = 'id,user_id,title,current_streak,status,pause_until,frequency,times_per_week,is_completed,category'
    const [goalsResult, postsResult, collabResult, membershipResult] = await Promise.all([
      supabase.from('goals').select(fields).eq('user_id', u.id).order('created_at', { ascending: true }),
      supabase.from('posts').select('goal_id,created_at').eq('user_id', u.id).gte('created_at', since.toISOString()),
      supabase.from('goal_collaborators').select('goal_id').eq('user_id', u.id).eq('status', 'accepted'),
      supabase.from('circle_memberships').select('role, circles(id,name,owner_id)').eq('user_id', u.id),
    ])
    if (goalsResult.error || postsResult.error || collabResult.error) { setError('Your day could not be loaded. Check your connection and try again.'); setLoading(false); return }

    const sharedIds = (collabResult.data || []).map((row) => row.goal_id)
    type MembershipRow = { role: string; circles: { id: string; name: string; owner_id: string } | null }
    const memberships = ((membershipResult.data || []) as unknown as MembershipRow[]).filter((row) => row.circles)
    const circleIds = memberships.map((row) => row.circles!.id)
    const adminIds = memberships.filter((row) => row.circles!.owner_id === u.id || ['owner', 'moderator'].includes(row.role)).map((row) => row.circles!.id)
    const [sharedResult, tasksResult, checkinsResult, membersResult] = await Promise.all([
      sharedIds.length ? supabase.from('goals').select(fields).in('id', sharedIds) : Promise.resolve({ data: [], error: null }),
      circleIds.length ? supabase.from('circle_tasks').select('circle_id,title').in('circle_id', circleIds).eq('task_date', todayKey) : Promise.resolve({ data: [], error: null }),
      circleIds.length ? supabase.from('circle_task_checkins').select('circle_id,user_id,status,circle_tasks!inner(task_date)').in('circle_id', circleIds).eq('circle_tasks.task_date', todayKey) : Promise.resolve({ data: [], error: null }),
      adminIds.length ? supabase.from('circle_memberships').select('circle_id,role').in('circle_id', adminIds) : Promise.resolve({ data: [], error: null }),
    ])
    const taskByCircle = new Map(((tasksResult.data || []) as Array<{ circle_id: string; title: string }>).map((row) => [row.circle_id, row.title]))
    const checkins = (checkinsResult.data || []) as Array<{ circle_id: string; user_id: string; status: string }>
    const memberRows = (membersResult.data || []) as Array<{ circle_id: string; role: string }>
    setBatches(memberships.map((row) => {
      const id = row.circles!.id
      return {
        id, name: row.circles!.name,
        admin: adminIds.includes(id),
        task: taskByCircle.get(id) ?? null,
        done: checkins.some((c) => c.circle_id === id && c.user_id === u.id),
        checkedIn: checkins.filter((c) => c.circle_id === id && c.user_id !== u.id && c.status !== 'missed').length,
        members: memberRows.filter((m) => m.circle_id === id && m.role === 'member').length,
      }
    }))

    const owned = ((goalsResult.data || []) as Goal[]).map((goal) => ({ ...goal, shared: false }))
    const ownedIds = new Set(owned.map((goal) => goal.id))
    const shared = ((sharedResult.data || []) as Goal[]).filter((goal) => !ownedIds.has(goal.id)).map((goal) => ({ ...goal, shared: true }))
    setGoals([...owned, ...shared])
    setActivity((postsResult.data || []).map((row) => ({ goal_id: row.goal_id, at: row.created_at, logged: true })))
    setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const today = localKey(new Date())
  const doneToday = useMemo(() => new Set(activity.filter((a) => localKey(new Date(a.at)) === today).map((a) => a.goal_id)), [activity, today])
  const weekDays = useMemo(() => {
    const map = new Map<string, Set<string>>()
    activity.forEach((a) => { if (!a.goal_id) return; const days = map.get(a.goal_id) || new Set<string>(); days.add(localKey(new Date(a.at))); map.set(a.goal_id, days) })
    return map
  }, [activity])

  const isPaused = (g: Goal) => g.status === 'paused' && Boolean(g.pause_until && new Date(g.pause_until) > new Date())
  const weekMet = useCallback((g: Goal) => (weekDays.get(g.id)?.size || 0) >= (g.times_per_week || 1), [weekDays])
  const personal = useMemo(() => goals.filter((g) => g.category !== 'exam_prep' && !(g.frequency === 'once' && g.is_completed)), [goals])
  // A weekly goal is due only when today is needed to reach the week's target; otherwise rest days never look like falling behind.
  const daysLeftInWeek = 7 - ((new Date().getDay() + 6) % 7)
  const listGoals = useMemo(() => personal.filter((g) => !isPaused(g) && (g.frequency !== 'weekly' || doneToday.has(g.id) || (!weekMet(g) && (g.times_per_week || 1) - (weekDays.get(g.id)?.size || 0) >= daysLeftInWeek))).map((g) => ({
    id: g.id, title: g.title, done: doneToday.has(g.id) || (g.frequency === 'weekly' && weekMet(g)),
    detail: g.frequency === 'weekly' ? `${g.times_per_week} times a week` : g.frequency === 'once' ? 'One-time goal' : (g.current_streak || 0) > 1 ? `Every day. ${g.current_streak} days in a row.` : 'Every day',
  })), [personal, doneToday, weekMet, weekDays, daysLeftInWeek])
  const mentorTasks = useMemo(() => batches.filter((b) => !b.admin && b.task).map((b) => ({ circleId: b.id, name: b.name, task: b.task!, done: b.done })), [batches])
  const toPost = batches.filter((b) => b.admin && !b.task)

  const quickDone = async (goalId: string) => {
    if (!user) return false
    const { error: postError } = await supabase.from('posts').insert({ user_id: user.id, goal_id: goalId, caption: 'Completed today’s check-in.', proof_type: 'text', checkin_status: 'done', visibility: 'private' })
    if (postError) return false
    setActivity((cur) => [...cur, { goal_id: goalId, at: new Date().toISOString(), logged: true }])
    return true
  }

  const circles: GoalCircle[] = [
    ...prep.plans.map((p) => {
      const c = counts?.byTemplate.get(p.templateId)
      return { key: `exam:${p.templateId}`, label: examInfo(p.code).short, short: examInfo(p.code).short, href: `/prep/plan?exam=${p.templateId}`, onOpen: () => { try { window.localStorage.setItem(VIEW_KEY, p.templateId) } catch { /* opens the last exam viewed */ } }, progress: c && c.total ? c.done / c.total : 0 }
    }),
    ...personal.filter((g) => !isPaused(g)).map((g) => ({
      key: `goal:${g.id}`, label: g.title, category: g.category, href: `/goal/${g.id}`,
      progress: g.frequency === 'weekly' ? Math.min(1, (weekDays.get(g.id)?.size || 0) / (g.times_per_week || 1)) : doneToday.has(g.id) ? 1 : 0,
    })),
    ...batches.filter((b) => b.admin).map((b) => ({ key: `batch:${b.id}`, label: b.name, href: `/circles/${b.id}`, runs: true, progress: b.task && b.members ? b.checkedIn / b.members : 0 })),
  ]

  if (loading || !user) {
    return <main className="mx-auto min-h-screen max-w-xl space-y-4 px-4 pb-28 pt-5" aria-busy="true">
      <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="flex gap-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />)}</div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </main>
  }

  const left = counts ? counts.total - counts.done : null
  const isNew = prep.status === 'ready' && prep.plans.length === 0 && goals.length === 0 && batches.length === 0
  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="flex items-center justify-between">
        <Link href="/profile" aria-label="Your profile and settings" className="overflow-hidden rounded-full"><ProfileAvatar value={user.avatar} name={user.name || 'You'} size={40} className="rounded-full" /></Link>
        <span className="flex items-center gap-2"><LogoMark size={28} /><span className="text-lg font-bold tracking-tight">GoalYaar</span></span>
        <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'} className="relative grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-600" />}
        </Link>
      </header>

      <section className="mt-5">
        <h1 className="text-2xl font-bold tracking-tight">{greeting()}{user.firstName ? `, ${user.firstName}` : ''}</h1>
        <p className="mt-1 text-sm text-slate-500">{isNew ? 'Set your first goal to get a plan for today.' : left === null ? ' ' : left === 0 ? (counts!.total ? 'All done for today. See you tomorrow.' : 'Nothing is due today.') : left === 1 ? 'One thing left today' : `${left} things left today`}</p>
      </section>

      {error && <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"><span>{error}</span><button type="button" onClick={() => void load()} className="shrink-0 font-semibold underline">Try again</button></div>}

      {!isNew && <section aria-labelledby="goals-h" data-guide="goals" className="mt-6">
        <div className="mb-3 flex items-baseline justify-between"><h2 id="goals-h" className="text-base font-semibold">Your goals</h2>{prep.plans.length > 0 && <Link href="/prep/plan?exams=1" className="text-sm font-medium text-amber-700 dark:text-amber-400">Manage exams</Link>}</div>
        <GoalCircles items={circles} />
      </section>}

      {isNew
        ? <section aria-labelledby="start-h" className="mt-6">
            <h2 id="start-h" className="mb-3 text-base font-semibold">Get started</h2>
            <div className="space-y-2.5">
              {[
                { href: '/start', icon: GraduationCap, title: 'Set up your goals', line: 'An exam, fitness, reading or your own' },
                { href: '/circles', icon: UsersRound, title: 'Join a batch', line: 'Use the code your mentor shared' },
              ].map((o) => <Link key={o.href} href={o.href} className={`${card} flex items-center gap-3 p-4`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><o.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{o.title}</span><span className="block text-sm text-slate-500">{o.line}</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>)}
            </div>
          </section>
        : <div className="mt-6">
            <TodayList data={prep} userId={user.id} goals={listGoals} mentor={mentorTasks} onGoalDone={quickDone} onCounts={setCounts} />
          </div>}

      {toPost.length > 0 && <section aria-labelledby="batches-h" className={`${card} mt-4`}>
        <h2 id="batches-h" className="px-4 pt-4 text-base font-semibold">For your {toPost.length === 1 ? 'batch' : 'batches'}</h2>
        <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
          {toPost.map((b) => <li key={b.id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-500">{b.name}</span><span className="block text-[15px] font-semibold">Post today&apos;s task</span></span>
            <Link href={`/circles/${b.id}`} className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold leading-10 text-white dark:bg-white dark:text-slate-900">Post</Link>
          </li>)}
        </ul>
      </section>}

      <div className="mt-4"><InstallNudge /></div>
    </main>
  )
}
