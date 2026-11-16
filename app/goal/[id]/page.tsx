'use client'

import { confirmAction } from '@/lib/confirm'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CalendarDays, Check, CircleCheck, PauseCircle, RotateCcw, Timer, UsersRound } from 'lucide-react'
import GoalCollaborators from '@/components/GoalCollaborators'
import GoalCalendarActions from '@/components/GoalCalendarActions'
import ItemMenu from '@/components/ItemMenu'
import { supabase } from '@/utils/supabase'
import AmountSheet from '@/components/AmountSheet'
import GoalReportCard from '@/components/GoalReportCard'
import UnitPicker from '@/components/UnitPicker'
import { goalReport, withUnit } from '@/lib/goalReport'

interface Goal {
  id: string
  user_id: string
  title: string
  category: string | null
  status: string | null
  is_completed: boolean | null
  current_streak: number | null
  pause_count: number | null
  pause_until: string | null
  target_date: string | null
  frequency: 'daily' | 'weekly' | 'once' | null
  times_per_week: number | null
  track_unit?: string | null
  created_at: string
}

interface Post {
  id: string
  user_id: string
  caption: string | null
  media_url?: string | null
  media_urls?: string[] | null
  proof_type?: string | null
  checkin_status?: 'done' | 'partial' | 'missed' | null
  amount?: number | string | null
  minutes_logged?: number | null
  created_at: string
}

const QUICK_CAPTION = 'Completed today’s check-in.'
const OFTEN: [number, string][] = [[7, 'Every day'], [5, 'Five days a week'], [3, 'Three days a week'], [1, 'Once a week']]
const localKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const goalMediaPath = (value: string | null | undefined) => {
  if (!value) return null
  try {
    const marker = '/storage/v1/object/public/goal-media/'
    const pathname = new URL(value).pathname
    const markerIndex = pathname.indexOf(marker)
    return markerIndex === -1 ? null : decodeURIComponent(pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}
const howOften = (g: Goal) => g.frequency === 'once' ? 'One-time goal' : g.frequency === 'weekly' ? (g.times_per_week === 1 ? 'Once a week' : `${['', '', 'Two', 'Three', 'Four', 'Five', 'Six'][g.times_per_week ?? 1] ?? g.times_per_week} days a week`) : 'Every day'
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })

/**
 * A personal goal's space. My Goal: log today, your run, this week, and every check-in.
 * Group: the people you share it with. Edit, pause, finish and delete are all here.
 */
export default function GoalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.id as string

  const [goal, setGoal] = useState<Goal | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'goal' | 'group'>('goal')
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState<{ title: string; targetDate: string; perWeek: number; unit: string | null }>({ title: '', targetDate: '', perWeek: 7, unit: null })
  const [asking, setAsking] = useState<{ post: Post; editing: boolean } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const loadGoalDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user.id || null)
      await supabase.rpc('resume_expired_goal_pauses')
      const { data: goalData, error: goalError } = await supabase.from('goals').select('*').eq('id', goalId).single()
      if (goalError) throw goalError
      setGoal(goalData as Goal)
      const { data: postsData } = await supabase.from('posts').select('*').eq('goal_id', goalId).order('created_at', { ascending: false })
      setPosts(postsData || [])
    } catch {
      setGoal(null)
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => { if (goalId) void Promise.resolve().then(loadGoalDetails) }, [goalId, loadGoalDetails])
  useEffect(() => { if (!message) return; const t = window.setTimeout(() => setMessage(null), 3000); return () => window.clearTimeout(t) }, [message])

  const today = localKey(new Date())
  const week = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
    const done = new Set(posts.filter((p) => p.checkin_status !== 'missed').map((p) => localKey(new Date(p.created_at))))
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); const key = localKey(d); return { key, name: d.toLocaleDateString('en-IN', { weekday: 'narrow' }), done: done.has(key), future: key > today } })
  }, [posts, today])
  const report = useMemo(() => goalReport(posts, goal?.track_unit ?? null), [posts, goal?.track_unit])
  const mineToday = posts.filter((p) => p.user_id === userId && localKey(new Date(p.created_at)) === today && p.checkin_status !== 'missed')

  if (loading) return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-5" aria-busy="true">{[1, 2, 3].map((k) => <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (!goal) return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl font-bold">Goal not found</h1><p className="mt-2 text-sm text-slate-500">It may have been deleted, or it belongs to someone else.</p><Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Back to Home</Link></div></main>

  const isCompleted = Boolean(goal.is_completed || goal.status === 'completed')
  const isOwner = goal.user_id === userId
  const isPaused = goal.status === 'paused' && Boolean(goal.pause_until && new Date(goal.pause_until) > new Date())
  const target = goal.frequency === 'weekly' ? goal.times_per_week || 1 : goal.frequency === 'once' ? 1 : 7
  const weekDone = week.filter((d) => d.done).length

  // The run is worked out in the database when a check-in is added or removed; read it back.
  const refreshStreak = async () => {
    const { data } = await supabase.from('goals').select('current_streak,status,is_completed').eq('id', goalId).single()
    if (data) setGoal((g) => (g ? { ...g, ...data } : g))
  }
  const logToday = async () => {
    if (!userId) return
    setUpdating(true)
    const { data, error } = await supabase.from('posts').insert({ user_id: userId, goal_id: goal.id, caption: QUICK_CAPTION, proof_type: 'text', checkin_status: 'done', visibility: 'private' }).select('*').single()
    setUpdating(false)
    if (error || !data) { setMessage('Could not log today. Please try again.'); return }
    setPosts((cur) => [data as Post, ...cur]); void refreshStreak()
    if (goal.track_unit) setAsking({ post: data as Post, editing: false }); else setMessage('Logged. Well done.')
    if (goal.frequency === 'once') { await supabase.from('goals').update({ status: 'completed', is_completed: true }).eq('id', goal.id).eq('user_id', userId); setGoal({ ...goal, status: 'completed', is_completed: true }) }
  }
  const undoToday = async () => {
    const last = mineToday[0]
    if (!last || !userId) return
    setUpdating(true)
    const { error } = await supabase.from('posts').delete().eq('id', last.id).eq('user_id', userId)
    setUpdating(false)
    if (error) { setMessage('Could not undo. Please try again.'); return }
    setPosts((cur) => cur.filter((p) => p.id !== last.id)); setMessage('Undone.'); void refreshStreak()
  }
  const startEdit = () => { setEdit({ title: goal.title, targetDate: goal.target_date || '', perWeek: goal.frequency === 'weekly' ? goal.times_per_week || 1 : 7, unit: goal.track_unit ?? null }); setEditing(true) }
  const saveAmount = async (post: Post, amount: number | null) => {
    const { error } = await supabase.from('posts').update({ amount }).eq('id', post.id).eq('user_id', userId!)
    if (error) return false
    setPosts((cur) => cur.map((p) => (p.id === post.id ? { ...p, amount } : p)))
    return true
  }
  const saveGoal = async () => {
    if (!isOwner || edit.title.trim().length < 3) { setMessage('Give the goal a name of at least three letters.'); return }
    setUpdating(true)
    const frequency = goal.frequency === 'once' ? 'once' : edit.perWeek >= 7 ? 'daily' : 'weekly'
    const changes = { title: edit.title.trim(), target_date: edit.targetDate || null, frequency, times_per_week: frequency === 'weekly' ? edit.perWeek : null, track_unit: edit.unit, updated_at: new Date().toISOString() }
    let { error } = await supabase.from('goals').update(changes).eq('id', goal.id).eq('user_id', userId!)
    // Before the goal-numbers migration runs, save everything else.
    if (error && /track_unit|PGRST204|42703/.test(`${error.code} ${error.message}`)) ({ error } = await supabase.from('goals').update({ ...changes, track_unit: undefined }).eq('id', goal.id).eq('user_id', userId!))
    setUpdating(false)
    if (error) { setMessage('Your changes could not be saved.'); return }
    setGoal({ ...goal, ...changes, frequency: frequency as Goal['frequency'] }); setEditing(false); setMessage('Saved.')
  }
  const deleteGoal = async () => {
    setUpdating(true)
    const { error } = await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', userId!)
    if (error) { setMessage('The goal could not be deleted.'); setUpdating(false); return false }
    router.replace('/dashboard'); router.refresh(); return true
  }
  const toggleComplete = async () => {
    const next = !isCompleted
    setUpdating(true)
    const { error } = await supabase.from('goals').update({ status: next ? 'completed' : 'active', is_completed: next }).eq('id', goal.id).eq('user_id', userId!)
    setUpdating(false)
    if (error) { setMessage('Could not update the goal.'); return }
    setGoal({ ...goal, status: next ? 'completed' : 'active', is_completed: next }); setMessage(next ? 'Marked as achieved. Congratulations.' : 'Back to active.')
  }
  const pauseGoal = async () => {
    if (!(await confirmAction('Pause this goal for seven days? Your run is kept while it is paused. Each goal can be paused once.', { confirmLabel: 'Pause' }))) return
    setUpdating(true)
    const { data, error } = await supabase.rpc('pause_goal_for_week', { target_goal_id: goal.id })
    setUpdating(false)
    if (error) { setMessage(error.message || 'The goal could not be paused.'); return }
    setGoal({ ...goal, status: 'paused', pause_count: 1, pause_until: String(data) }); setMessage('Paused for seven days. Take care of yourself.')
  }
  const deletePost = async (post: Post) => {
    const { error } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', userId!)
    if (error) return false
    setPosts((cur) => cur.filter((p) => p.id !== post.id)); void refreshStreak()
    const paths = [post.media_url, ...(post.media_urls || [])].map(goalMediaPath).filter((p): p is string => Boolean(p?.startsWith(`${userId}/`)))
    if (paths.length) await supabase.storage.from('goal-media').remove(paths)
    return true
  }

  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
  const input = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-transparent px-3.5 py-3 text-[15px] dark:border-slate-600'

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="flex items-center gap-3">
      <Link href="/dashboard" aria-label="Back to Home" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="truncate text-2xl font-bold tracking-tight">{goal.title}</h1><p className="text-sm text-slate-500">{isCompleted ? 'Achieved' : isPaused ? `Paused until ${new Date(goal.pause_until as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}` : howOften(goal)}</p></div>
      {isOwner && <ItemMenu label="goal" onEdit={startEdit} onDelete={deleteGoal} deleteMessage="Delete this goal and all of its check-ins? This can't be undone." />}
    </header>

    <div role="tablist" aria-label="Goal" className="mb-4 mt-4 grid grid-cols-2 border-b border-slate-200 dark:border-slate-800">
      {([['goal', 'My Goal'], ['group', 'Group']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px h-11 border-b-2 text-sm font-semibold ${tab === id ? 'border-amber-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500'}`}>{label}</button>)}
    </div>

    {message && <p role="status" className="mb-3 rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-medium text-white dark:bg-white dark:text-slate-900">{message}</p>}

    {tab === 'goal' && <div className="space-y-3">
      {editing && <section className={`${card} p-4`}>
        <h2 className="text-base font-semibold">Edit goal</h2>
        <label className="mt-3 block text-sm font-medium text-slate-700 dark:text-slate-300">Name<input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} maxLength={100} className={input} /></label>
        {goal.frequency !== 'once' && <><p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">How often</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">{OFTEN.map(([n, label]) => <button key={n} type="button" onClick={() => setEdit({ ...edit, perWeek: n })} aria-pressed={edit.perWeek === n} className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${edit.perWeek === n ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-700'}`}>{label}</button>)}</div></>}
        <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">What to count</p>
        <p className="text-sm text-slate-500">Log a number each time, like km run or pages read, and see it add up.</p>
        <div className="mt-2"><UnitPicker value={edit.unit} onChange={(unit) => setEdit({ ...edit, unit })} category={goal.category} /></div>
        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Finish by (optional)<input type="date" value={edit.targetDate} min={today} onChange={(e) => setEdit({ ...edit, targetDate: e.target.value })} className={`${input} dark:[color-scheme:dark]`} /></label>
        <div className="mt-4 flex gap-2"><button type="button" onClick={() => setEditing(false)} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold dark:border-slate-600">Cancel</button><button type="button" disabled={updating} onClick={() => void saveGoal()} className="h-11 flex-1 rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Save changes</button></div>
      </section>}

      {isOwner && !isCompleted && !isPaused && <section className={`${card} p-4 text-center`}>
        <p className="text-sm text-slate-500">Today</p>
        {mineToday.length
          ? <><p className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-5 w-5" />Logged</p>
              <div className="mt-1 flex justify-center gap-2"><button type="button" disabled={updating} onClick={() => void undoToday()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><RotateCcw className="h-3.5 w-3.5" />Undo</button><Link href={`/check-in?goal=${goal.id}`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Add a note or photo</Link></div></>
          : <><button type="button" disabled={updating} onClick={() => void logToday()} className="mt-3 h-12 w-full rounded-xl bg-slate-900 text-base font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Log today</button>
              <Link href={`/check-in?goal=${goal.id}`} className="mt-2 inline-block text-sm font-medium text-slate-500 underline-offset-2 hover:underline">Log with a note or photo</Link></>}
      </section>}

      <section className="grid grid-cols-2 gap-2">
        <div className={`${card} p-4`}><p className="text-2xl font-bold tabular-nums">{goal.current_streak || 0}</p><p className="text-sm text-slate-500">{goal.frequency === 'weekly' ? (goal.current_streak === 1 ? 'week in a row' : 'weeks in a row') : (goal.current_streak === 1 ? 'day in a row' : 'days in a row')}</p></div>
        <div className={`${card} p-4`}><p className="text-2xl font-bold tabular-nums">{Math.min(weekDone, target)}<span className="text-base font-medium text-slate-500"> of {target}</span></p><p className="text-sm text-slate-500">this week</p></div>
      </section>

      <section aria-label="This week" className={`${card} p-4`}>
        <div className="grid grid-cols-7 gap-1.5 text-center">{week.map((d) => <div key={d.key} className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-slate-500">{d.name}</span>
          <span className={`grid h-8 w-8 place-items-center rounded-full ${d.done ? 'bg-emerald-600 text-white' : d.future ? 'border border-dashed border-slate-200 dark:border-slate-700' : 'border border-slate-300 dark:border-slate-600'}`}>{d.done && <Check className="h-4 w-4" strokeWidth={3} />}</span>
        </div>)}</div>
      </section>

      {goal.frequency !== 'once' && posts.length > 0 && <section aria-labelledby="report-h" className={`${card} p-4`}>
        <div className="mb-2 flex items-baseline justify-between gap-3"><h2 id="report-h" className="text-base font-semibold">Your report</h2>{isOwner && !goal.track_unit && <button type="button" onClick={startEdit} className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline">Count km, pages…</button>}</div>
        <GoalReportCard report={report} />
      </section>}

      {isOwner && <section className="flex flex-wrap gap-2">
        {!isCompleted && <Link href={`/focus?goal=${goal.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold dark:border-slate-600"><Timer className="h-4 w-4" />Start focus</Link>}
        {!isCompleted && !isPaused && Number(goal.pause_count || 0) === 0 && <button type="button" disabled={updating} onClick={() => void pauseGoal()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold dark:border-slate-600"><PauseCircle className="h-4 w-4" />Pause for a week</button>}
        <button type="button" disabled={updating} onClick={() => void toggleComplete()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold dark:border-slate-600"><CircleCheck className="h-4 w-4" />{isCompleted ? 'Mark as active again' : 'Mark as achieved'}</button>
      </section>}

      {goal.target_date && <section className={`${card} p-4`}>
        <p className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-slate-500" />Finish by {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <GoalCalendarActions goalId={goal.id} title={goal.title} targetDate={goal.target_date} />
      </section>}

      <section aria-labelledby="recent-h" className="pt-2">
        <h2 id="recent-h" className="mb-2 text-base font-semibold">Check-ins</h2>
        {posts.length === 0
          ? <p className={`${card} p-5 text-sm text-slate-500`}>No check-ins yet. Log today to start your run.</p>
          : <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>{posts.map((p) => <li key={p.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{shortDate(p.created_at)}{p.checkin_status === 'partial' ? ', partly done' : p.checkin_status === 'missed' ? ', missed' : ''}</p>
                  {goal.track_unit && p.amount !== null && p.amount !== undefined && p.amount !== '' && <p className="text-sm text-slate-600 dark:text-slate-300">{withUnit(Number(p.amount), goal.track_unit)}</p>}
                  {p.caption && p.caption !== QUICK_CAPTION && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{p.caption}</p>}
                </div>
                {p.user_id === userId && <ItemMenu label="check-in" onEdit={goal.track_unit ? () => setAsking({ post: p, editing: true }) : undefined} onDelete={() => deletePost(p)} deleteMessage="Delete this check-in? This can't be undone." />}
              </div>
              {p.media_url && (p.proof_type === 'video' ? <video src={p.media_url} controls preload="metadata" playsInline className="mt-2 max-h-96 w-full rounded-xl bg-slate-950 object-contain" /> : <div className="relative mt-2 h-44 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950"><Image src={p.media_url} alt="Check-in photo" fill unoptimized className="object-contain" /></div>)}
            </li>)}</ul>}
      </section>
    </div>}

    {asking && goal.track_unit && <AmountSheet unit={goal.track_unit} goalTitle={goal.title} editing={asking.editing} initial={asking.post.amount === null || asking.post.amount === undefined || asking.post.amount === '' ? null : Number(asking.post.amount)}
      onSave={(amount) => saveAmount(asking.post, amount)} onClose={() => { if (!asking.editing) setMessage('Logged. Well done.'); setAsking(null) }} />}

    {tab === 'group' && <div className="space-y-3">
      {userId && <GoalCollaborators goalId={goal.id} ownerId={goal.user_id} currentUserId={userId} />}
      <Link href="/circles" className={`${card} flex items-center gap-3 p-4`}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><UsersRound className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Join a batch or community</span><span className="block text-sm text-slate-500">A coach&apos;s batch, or a group of friends with the same goal</span></span>
      </Link>
    </div>}
  </main>
}
