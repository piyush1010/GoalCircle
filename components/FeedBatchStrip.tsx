'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import CircleAvatar from '@/components/CircleAvatar'
import { localDateString } from '@/lib/exams'
import { supabase } from '@/utils/supabase'

interface BatchToday { id: string; name: string; task: string; checked: number; members: number }

/**
 * Batch check-ins aren't posts, so a batch-only student's feed would look empty.
 * This shows each batch's day at the top of the Feed: today's task and how many checked in.
 */
export default function FeedBatchStrip({ userId }: { userId: string }) {
  const [batches, setBatches] = useState<BatchToday[]>([])

  useEffect(() => {
    void (async () => {
      const today = localDateString()
      const { data: memberships } = await supabase.from('circle_memberships').select('circles(id,name)').eq('user_id', userId)
      const circles = ((memberships || []) as unknown as Array<{ circles: { id: string; name: string } | null }>).map((row) => row.circles).filter(Boolean) as Array<{ id: string; name: string }>
      if (!circles.length) return
      const { data: tasks } = await supabase.from('circle_tasks').select('circle_id,title').in('circle_id', circles.map((circle) => circle.id)).eq('task_date', today)
      const withTask = ((tasks || []) as Array<{ circle_id: string; title: string }>)
      const rows = await Promise.all(withTask.map(async (task) => {
        const { data } = await supabase.rpc('circle_today_progress', { target_circle: task.circle_id, on_date: today })
        const row = Array.isArray(data) ? data[0] as { checked_in: number; members: number } | undefined : undefined
        return { id: task.circle_id, name: circles.find((circle) => circle.id === task.circle_id)?.name ?? 'Your batch', task: task.title, checked: row?.checked_in ?? 0, members: row?.members ?? 0 }
      }))
      setBatches(rows)
    })()
  }, [userId])

  if (!batches.length) return null
  return <section aria-label="Your batches today" className="mb-4 space-y-2">
    {batches.map((batch) => <Link key={batch.id} href={`/circles/${batch.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-400 dark:border-slate-700/70 dark:bg-[#101B2D]">
      <CircleAvatar name={batch.name} size={40} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{batch.name} · today</span>
        <span className="block truncate text-sm text-slate-600 dark:text-slate-300">{batch.task}</span>
      </span>
      {batch.members > 0 && <span className="shrink-0 text-right text-xs text-slate-500"><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{batch.checked}/{batch.members}</span>checked in</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
    </Link>)}
  </section>
}
