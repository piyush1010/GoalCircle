'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock3, Play } from 'lucide-react'
import FocusTimer from '@/components/FocusTimer'
import GuideTour, { type TourStep } from '@/components/GuideTour'
import { localDateString } from '@/lib/exams'
import { focusMinutesKey } from '@/lib/focusHandoff'
import { supabase } from '@/utils/supabase'

const FOCUS_TOUR: TourStep[] = [
  { target: 'focus-goal', title: 'What are you focusing on?', text: 'Pick a goal or today\'s batch task. The minutes are saved to it.' },
  { target: 'focus-modes', title: 'Pick a mode', text: '25 / 5 and 50 / 10 run in rounds with breaks; the stopwatch simply counts up.' },
  { target: 'focus-start', title: 'Just start', text: "Press start and do the first five minutes. Starting is the hardest part; it usually gets easier." },
]

type GoalOption = { id: string; title: string }
// A focus target: one of your goals, today's batch task, or nothing in particular.
type Target = { key: string; label: string; goalId: string | null; circleId: string | null }
function dayStart(date: Date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function weekStart(date: Date) { const d = dayStart(date); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d }

export default function FocusRoomPage() {
  const router = useRouter()
  const [targets, setTargets] = useState<Target[]>([])
  const [targetKey, setTargetKey] = useState('none')
  const [userId, setUserId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [stats, setStats] = useState({ today: 0, week: 0, sessions: 0 })
  const [loading, setLoading] = useState(true)
  const [savedMinutes, setSavedMinutes] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async (uid: string) => {
    const now = new Date()
    const { data, error: logsError } = await supabase.from('focus_logs').select('minutes_logged,logged_at').eq('user_id', uid).gte('logged_at', weekStart(now).toISOString())
    if (logsError) throw logsError
    const logs = data || []; const todayStart = dayStart(now).getTime()
    setStats({
      today: logs.reduce((sum, log) => sum + (new Date(log.logged_at).getTime() >= todayStart ? Number(log.minutes_logged) : 0), 0),
      week: logs.reduce((sum, log) => sum + Number(log.minutes_logged), 0), sessions: logs.length,
    })
  }, [])

  useEffect(() => { void Promise.resolve().then(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/focus'); return }
    setUserId(session.user.id)
    const today = localDateString()
    const [goalsResult, membershipResult] = await Promise.all([
      supabase.from('goals').select('id,title').eq('user_id', session.user.id).eq('is_completed', false).order('created_at', { ascending: false }),
      supabase.from('circle_memberships').select('role, circles(id,name,owner_id)').eq('user_id', session.user.id),
    ])
    const batches = ((membershipResult.data || []) as unknown as Array<{ role: string; circles: { id: string; name: string; owner_id: string } | null }>)
      .filter((row) => row.circles && row.role === 'member' && row.circles.owner_id !== session.user.id).map((row) => row.circles!)
    const { data: tasks } = batches.length
      ? await supabase.from('circle_tasks').select('circle_id,title').in('circle_id', batches.map((b) => b.id)).eq('task_date', today)
      : { data: [] as Array<{ circle_id: string; title: string }> }
    if (goalsResult.error) setError('Could not load your goals.')
    const options: Target[] = [
      ...((tasks || []) as Array<{ circle_id: string; title: string }>).map((task) => ({ key: `c:${task.circle_id}`, label: `${batches.find((b) => b.id === task.circle_id)?.name ?? 'Batch'} · ${task.title}`, goalId: null, circleId: task.circle_id })),
      ...((goalsResult.data || []) as GoalOption[]).map((goal) => ({ key: `g:${goal.id}`, label: goal.title, goalId: goal.id, circleId: null })),
      { key: 'none', label: 'Just focus (not linked to anything)', goalId: null, circleId: null },
    ]
    const params = new URLSearchParams(window.location.search)
    const wanted = params.get('circle') ? `c:${params.get('circle')}` : params.get('goal') ? `g:${params.get('goal')}` : ''
    setTargets(options)
    setTargetKey(options.some((t) => t.key === wanted) ? wanted : options[0].key)
    try { await loadStats(session.user.id) } catch { setError('Could not load your focus history.') }
    setLoading(false)
  }) }, [loadStats, router])

  const target = targets.find((t) => t.key === targetKey) ?? null
  const [open, setOpen] = useState(false)
  // Saves whatever was focused, rounds or stopwatch, when the timer is finished.
  const saveSession = useCallback(async (minutes: number) => {
    if (!userId) return
    setError(null); setSavedMinutes(null)
    const { error: saveError } = await supabase.from('focus_logs').insert({ user_id: userId, goal_id: target?.goalId ?? null, minutes_logged: minutes, note: notes.trim() || (target?.circleId ? target.label : null) })
    if (saveError) { setError('The session could not be saved. Please try again.'); return }
    // Batch task: hand the minutes to the batch check-in so the student doesn't type them.
    if (target?.circleId) {
      try {
        const key = focusMinutesKey(target.circleId, localDateString())
        window.localStorage.setItem(key, String(Number(window.localStorage.getItem(key) || 0) + minutes))
      } catch { /* storage unavailable */ }
    }
    setSavedMinutes(minutes); setNotes(''); await loadStats(userId)
  }, [loadStats, notes, target, userId])

  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
    <header className="mb-6 flex items-center gap-3"><button onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101B2D]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-lg font-bold">Focus</h1><p className="text-xs text-slate-500">Focus time that counts toward your goal.</p></div></header>
    {loading ? <div className="h-96 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /> : <div className="space-y-4">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#101B2D]">
        <label htmlFor="focus-goal" data-tour="focus-goal" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Focusing on</label>
        <select id="focus-goal" value={targetKey} onChange={(e) => setTargetKey(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold dark:border-slate-700 dark:bg-[#07101F]">{targets.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}</select>
        <label htmlFor="focus-notes" className="mb-2 mt-4 block text-xs font-bold uppercase tracking-wider text-slate-500">Session note <span className="font-medium normal-case">(optional)</span></label>
        <textarea id="focus-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder="What are you working on?" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-[#07101F]" />
        <button data-tour="focus-start" type="button" onClick={() => { setSavedMinutes(null); setOpen(true) }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-base font-bold text-slate-950"><Play className="h-4 w-4" fill="currentColor" />Start focus</button>
        <p data-tour="focus-modes" className="mt-2 text-center text-xs text-slate-500">Choose 25 / 5, 50 / 10 or a stopwatch on the timer.</p>
      </section>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      {savedMinutes !== null && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="mr-2 inline h-4 w-4" />{savedMinutes} focus minutes saved.{target?.circleId ? <Link href={`/circles/${target.circleId}`} className="mt-2 block text-amber-700 underline dark:text-amber-300">Go back and check in →</Link> : null}</div>}
      <div className="grid grid-cols-3 gap-3 text-center"><Stat icon={<Clock3 className="mx-auto mb-1 h-4 w-4 text-amber-500" />} value={`${stats.today}m`} label="Today" /><Stat value={`${Math.floor(stats.week / 60)}h ${stats.week % 60}m`} label="This week" accent /><Stat value={String(stats.sessions)} label="Sessions" /></div>
    </div>}
    {open && target && <FocusTimer title={target.key === 'none' ? 'Focus session' : target.label} onClose={() => setOpen(false)} onFinish={(minutes) => saveSession(minutes)} />}
  <GuideTour name="focus" steps={FOCUS_TOUR} />
    </main>
}

function Stat({ icon, value, label, accent = false }: { icon?: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#101B2D]">{icon}<strong className={`block text-base ${accent ? 'text-amber-500' : ''}`}>{value}</strong><span className="text-[11px] font-bold uppercase text-slate-400">{label}</span></div>
}
