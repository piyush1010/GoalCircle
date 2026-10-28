'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Plus, Target, UsersRound, XCircle } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { supabase } from '@/utils/supabase'

interface BatchTask { circleId: string; circleName: string; title: string; status: 'done' | 'partial' | 'missed' | null }
interface GoalRow { id: string; title: string; doneToday: boolean }

/**
 * The + button: always the same check-in sheet. Today's batch tasks first (that's what a
 * mentor is waiting for), then your own goals, then "Start a new goal".
 */
export default function CreatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([])
  const [goals, setGoals] = useState<GoalRow[]>([])

  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user.id
      if (!uid) { router.replace('/login?next=/create'); return }
      const today = localDateString()
      const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
      const [memberships, ownGoals, todaysPosts] = await Promise.all([
        supabase.from('circle_memberships').select('role, circles(id,name,owner_id)').eq('user_id', uid),
        supabase.from('goals').select('id,title').eq('user_id', uid).eq('is_completed', false).order('created_at', { ascending: false }),
        supabase.from('posts').select('goal_id').eq('user_id', uid).gte('created_at', dayStart.toISOString()),
      ])
      const checked = new Set(((todaysPosts.data || []) as Array<{ goal_id: string | null }>).map((row) => row.goal_id))
      setGoals(((ownGoals.data || []) as Array<{ id: string; title: string }>).map((goal) => ({ ...goal, doneToday: checked.has(goal.id) })))

      const rows = ((memberships.data || []) as unknown as Array<{ role: string; circles: { id: string; name: string; owner_id: string } | null }>)
        .filter((row) => row.circles && row.role === 'member' && row.circles.owner_id !== uid)
      if (rows.length) {
        const ids = rows.map((row) => row.circles!.id)
        const [tasks, mine] = await Promise.all([
          supabase.from('circle_tasks').select('circle_id,title').in('circle_id', ids).eq('task_date', today),
          supabase.from('circle_task_checkins').select('circle_id,status,circle_tasks!inner(task_date)').in('circle_id', ids).eq('user_id', uid).eq('circle_tasks.task_date', today),
        ])
        const statusByCircle = new Map(((mine.data || []) as Array<{ circle_id: string; status: BatchTask['status'] }>).map((row) => [row.circle_id, row.status]))
        setBatchTasks(((tasks.data || []) as Array<{ circle_id: string; title: string }>).map((task) => ({
          circleId: task.circle_id, circleName: rows.find((row) => row.circles!.id === task.circle_id)?.circles?.name || 'Your batch', title: task.title, status: statusByCircle.get(task.circle_id) ?? null,
        })))
      }
      setLoading(false)
    })()
  }, [router])

  const nothing = !loading && batchTasks.length === 0 && goals.length === 0

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-8">
      <div className="mb-6"><h1 className="text-2xl font-bold">Check in</h1><p className="mt-1 text-base text-slate-600 dark:text-slate-300">What did you work on today?</p></div>

      {loading && <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-20 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />)}</div>}

      {nothing && <div className="rounded-3xl border border-amber-500/40 bg-amber-500/10 p-6 text-center">
        <Target className="mx-auto h-8 w-8 text-amber-500" />
        <h2 className="mt-2 text-lg font-bold">Nothing to check in yet</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Start with one small goal you can do every day, or join your mentor&apos;s batch with their invite link.</p>
        <Link href="/create-goal" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-50 px-5 py-3 text-sm font-bold text-white dark:text-slate-900"><Plus className="h-4 w-4" />Create your first goal</Link>
      </div>}

      {!loading && !nothing && <div className="space-y-6">
        {batchTasks.length > 0 && <section>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">From your mentor</h2>
          <div className="space-y-2">
            {batchTasks.map((task) => {
              const done = task.status === 'done' || task.status === 'partial'
              return <Link key={task.circleId} href={`/circles/${task.circleId}`} className={`group flex items-center gap-4 rounded-3xl border p-4 transition ${done ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : task.status === 'missed' ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101B2D]' : 'border-amber-500/50 bg-amber-500/10 hover:border-amber-500'}`}>
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${done ? 'bg-emerald-500 text-white' : task.status === 'missed' ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'}`}>{done ? <CheckCircle2 className="h-5 w-5" /> : task.status === 'missed' ? <XCircle className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}</div>
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-amber-700 dark:text-amber-400">{task.circleName}</p><h3 className="truncate text-base font-bold">{task.title}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{done ? 'Checked in. Tap to edit.' : task.status === 'missed' ? 'Marked missed. Tap to change.' : 'Tap to check in'}</p></div>
                <ArrowRight className="h-5 w-5 shrink-0 text-amber-500 transition group-hover:translate-x-1" />
              </Link>
            })}
          </div>
        </section>}

        {goals.length > 0 && <section>
          <h2 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">Your goals</h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101B2D]">
            {goals.map((goal, index) => <Link key={goal.id} href={`/check-in?goal=${goal.id}`} className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 ${index ? 'border-t border-slate-100 dark:border-slate-800' : ''}`}>
              {goal.doneToday ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> : <Target className="h-5 w-5 shrink-0 text-amber-500" />}
              <span className="min-w-0 flex-1 truncate text-base font-bold">{goal.title}</span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${goal.doneToday ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500 text-slate-950'}`}>{goal.doneToday ? 'Done' : 'Check in'}</span>
            </Link>)}
          </div>
        </section>}

        <Link href="/create-goal" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-3.5 text-sm font-bold text-slate-600 transition hover:border-amber-500 hover:text-amber-600 dark:border-slate-700 dark:text-slate-300"><Plus className="h-4 w-4" />Start a new goal</Link>
      </div>}
    </main>
  )
}
