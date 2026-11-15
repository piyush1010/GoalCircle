'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, UsersRound } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import MentorShare from '@/components/prep/MentorShare'
import AnswerReviews from '@/components/prep/AnswerReviews'

interface Batch { id: string; name: string; mentor: string; task: string | null; done: boolean }
interface Request { circleId: string; batch: string; mentor: string }
interface Room { template_id: string; title: string; subject: string; done: boolean; done_count: number }

const nameOf = (p: { full_name: string | null; username: string | null } | undefined) => p?.full_name || p?.username || 'Your mentor'

/**
 * The Batch tab of an exam: the batches you are in, today's task from each, requests from a mentor
 * to see your full plan, what you share, answers sent for review, and the exam's topic of the day.
 */
export default function ExamBatch({ userId, templateId, examName }: { userId: string; templateId: string; examName: string }) {
  const today = localDateString()
  const [batches, setBatches] = useState<Batch[] | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [answered, setAnswered] = useState<{ circleId: string; allow: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareKey, setShareKey] = useState(0) // remounts the sharing control after an answer

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from('circle_memberships').select('circle_id, circles(id,name,owner_id)').eq('user_id', userId).eq('role', 'member')
    type Row = { circle_id: string; circles: { id: string; name: string; owner_id: string } | null }
    const list = ((rows ?? []) as unknown as Row[]).filter((r) => r.circles)
    const ids = list.map((r) => r.circle_id)
    const owners = [...new Set(list.map((r) => r.circles!.owner_id))]
    const [profiles, tasks, checkins, shares, rooms] = await Promise.all([
      owners.length ? supabase.from('profiles').select('id,full_name,username').in('id', owners) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('circle_tasks').select('circle_id,title').in('circle_id', ids).eq('task_date', today) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('circle_task_checkins').select('circle_id,circle_tasks!inner(task_date)').eq('user_id', userId).in('circle_id', ids).eq('circle_tasks.task_date', today) : Promise.resolve({ data: [] }),
      supabase.from('prep_mentor_shares').select('circle_id,scope,requested_at,requested_by,answered_at'),
      supabase.rpc('prep_room_today'),
    ])
    const people = new Map(((profiles.data ?? []) as { id: string; full_name: string | null; username: string | null }[]).map((p) => [p.id, p]))
    const taskOf = new Map(((tasks.data ?? []) as { circle_id: string; title: string }[]).map((t) => [t.circle_id, t.title]))
    const doneIn = new Set(((checkins.data ?? []) as { circle_id: string }[]).map((c) => c.circle_id))
    setBatches(list.map((r) => ({ id: r.circle_id, name: r.circles!.name, mentor: nameOf(people.get(r.circles!.owner_id)), task: taskOf.get(r.circle_id) ?? null, done: doneIn.has(r.circle_id) })))
    const pending = ((shares.data ?? []) as { circle_id: string; scope: string; requested_at: string | null; answered_at: string | null; requested_by: string | null }[]).filter((s) => s.requested_at && !s.answered_at && s.scope !== 'full')
    setRequests(pending.map((s) => { const b = list.find((r) => r.circle_id === s.circle_id); return { circleId: s.circle_id, batch: b?.circles?.name ?? 'your batch', mentor: nameOf(people.get(s.requested_by ?? b?.circles?.owner_id ?? '')) } }))
    setRoom(((rooms.data ?? []) as Room[]).find((r) => r.template_id === templateId) ?? null)
  }, [userId, today, templateId])

  useEffect(() => { const t = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(t) }, [load])

  const answer = async (circleId: string, allow: boolean) => {
    setBusy(true); setError(null)
    const { error: e } = await supabase.rpc('prep_answer_share', { target_circle: circleId, allow })
    setBusy(false)
    if (e) { setError('Could not save your answer. Please try again.'); return }
    setAnswered({ circleId, allow }); setRequests((cur) => cur.filter((r) => r.circleId !== circleId)); setShareKey((k) => k + 1)
  }

  if (!batches) return <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-busy="true" />
  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'

  return <div className="space-y-3">
    {requests.map((r) => <section key={r.circleId} className="rounded-2xl border-[1.5px] border-slate-900 bg-white p-4 dark:border-white dark:bg-slate-900">
      <h2 className="text-[15px] font-semibold">{r.mentor} would like to see your full plan</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">For {r.batch}. Allowing this shares your progress, your last three mock scores and how many mistakes are still open. Your notes are never shared, and you can change this at any time.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => void answer(r.circleId, true)} className="h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Allow</button>
        <button type="button" disabled={busy} onClick={() => void answer(r.circleId, false)} className="h-11 rounded-xl border border-slate-300 text-sm font-semibold disabled:opacity-50 dark:border-slate-600">Not now</button>
      </div>
    </section>)}
    {answered && <p role="status" className="px-1 text-sm text-slate-600 dark:text-slate-300">{answered.allow ? 'Your mentor can now see your full plan. You can change this below.' : 'Nothing has changed. Your mentor sees only what you already share.'}</p>}
    {error && <p role="alert" className="px-1 text-sm font-medium text-rose-600">{error}</p>}

    {batches.length === 0
      ? <section className={`${card} p-5`}>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><UsersRound className="h-5 w-5" /></span>
          <h2 className="mt-3 text-[15px] font-semibold">You are not in a batch yet</h2>
          <p className="mt-1 text-sm text-slate-500">Ask your mentor for the batch code. Or start a study group with friends preparing for {examName}, and keep each other going.</p>
        </section>
      : batches.map((b) => <section key={b.id} className={card}>
          <Link href={`/circles/${b.id}`} className="flex items-center gap-3 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{b.mentor.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{b.name}</span><span className="block text-sm text-slate-500">Mentored by {b.mentor}</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
          <div className="border-t border-slate-100 px-4 py-3.5 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500">Today&apos;s task</p>
            {b.task
              ? <div className="mt-1 flex items-start gap-3"><p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{b.task}</p>
                  {b.done ? <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />Done</span> : <Link href={`/circles/${b.id}`} className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Check in</Link>}</div>
              : <p className="mt-1 text-sm text-slate-500">Nothing posted yet today.</p>}
          </div>
        </section>)}

    {room && <section className={`${card} p-4`}>
      <p className="text-xs font-medium text-slate-500">{examName} community</p>
      <p className="mt-1 text-[15px] font-semibold">Topic of the day: {room.title}</p>
      <p className="mt-0.5 text-sm text-slate-500">{room.done_count > 0 ? `${room.done_count} ${room.done_count === 1 ? 'student has' : 'students have'} done it today${room.done ? ', including you' : ''}.` : 'Be the first to do it today.'}</p>
    </section>}

    {batches.length > 0 && <div key={shareKey}><MentorShare userId={userId} /></div>}
    <AnswerReviews userId={userId} />

    <div className="grid grid-cols-2 gap-2 pt-1">
      <Link href="/circles/join" className="grid h-12 place-items-center rounded-2xl border border-slate-300 text-sm font-semibold dark:border-slate-600">Join with a code</Link>
      <Link href="/circles/new" className="grid h-12 place-items-center rounded-2xl border border-slate-300 text-sm font-semibold dark:border-slate-600">Start a batch</Link>
    </div>
  </div>
}
