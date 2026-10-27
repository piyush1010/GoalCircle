'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Target, UsersRound } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { supabase } from '@/utils/supabase'

interface BatchTask { circleId: string; circleName: string; title: string; done: boolean }

export default function CreatePage() {
  const [batchTasks, setBatchTasks] = useState<BatchTask[]>([])

  // Students in a batch usually tap + to check in for the mentor's task, so offer that first.
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user.id
      if (!uid) return
      const today = localDateString()
      const { data: memberships } = await supabase.from('circle_memberships').select('role, circles(id,name,owner_id)').eq('user_id', uid)
      const rows = ((memberships || []) as unknown as Array<{ role: string; circles: { id: string; name: string; owner_id: string } | null }>)
        .filter((row) => row.circles && row.role === 'member' && row.circles.owner_id !== uid)
      if (!rows.length) return
      const ids = rows.map((row) => row.circles!.id)
      const [tasks, mine] = await Promise.all([
        supabase.from('circle_tasks').select('circle_id,title').in('circle_id', ids).eq('task_date', today),
        supabase.from('circle_task_checkins').select('circle_id,circle_tasks!inner(task_date)').in('circle_id', ids).eq('user_id', uid).eq('circle_tasks.task_date', today),
      ])
      const done = new Set(((mine.data || []) as Array<{ circle_id: string }>).map((row) => row.circle_id))
      setBatchTasks(((tasks.data || []) as Array<{ circle_id: string; title: string }>).map((task) => ({
        circleId: task.circle_id, circleName: rows.find((row) => row.circles!.id === task.circle_id)?.circles?.name || 'Your batch', title: task.title, done: done.has(task.circle_id),
      })))
    })()
  }, [])

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-8">
      <div className="mb-6"><h1 className="text-2xl font-black">What did you do today?</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Check in, or start something new.</p></div>
      <div className="space-y-3">
        {batchTasks.map((task) => (
          <Link key={task.circleId} href={`/circles/${task.circleId}`} className={`group flex items-center gap-4 rounded-3xl border p-5 transition ${task.done ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-amber-500/50 bg-amber-500/10 hover:border-amber-500'}`}>
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${task.done ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-950'}`}>{task.done ? <CheckCircle2 className="h-6 w-6" /> : <UsersRound className="h-6 w-6" />}</div>
            <div className="min-w-0 flex-1"><p className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">{task.circleName} · today’s task</p><h2 className="truncate text-base font-black">{task.title}</h2><p className="text-sm text-slate-600 dark:text-slate-300">{task.done ? 'Checked in. Tap to edit.' : 'Tap to check in'}</p></div>
            <ArrowRight className="h-5 w-5 shrink-0 text-amber-500 transition group-hover:translate-x-1" />
          </Link>
        ))}
        <Link href="/check-in" className={`group flex items-center gap-4 rounded-3xl border p-5 transition hover:border-amber-500 ${batchTasks.length ? 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]' : 'border-amber-500/40 bg-amber-500/10'}`}><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${batchTasks.length ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-amber-500 text-slate-950'}`}><CheckCircle2 className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h2 className="text-base font-black">Check in on my own goal</h2><p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">Add proof, focus minutes, or a note.</p></div><ArrowRight className="h-5 w-5 text-amber-500 transition group-hover:translate-x-1" /></Link>
        <Link href="/create-goal" className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Target className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h2 className="text-base font-black">Start a new goal</h2><p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">One clear action you’ll repeat.</p></div><ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-500" /></Link>
      </div>
    </main>
  )
}
