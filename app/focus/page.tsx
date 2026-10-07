'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Clock3, Pause, Play, RotateCcw, Target } from 'lucide-react'
import { supabase } from '@/utils/supabase'

type TimerMode = 'work' | 'shortBreak' | 'longBreak' | 'deepWork'
type GoalOption = { id: string; title: string }
const PRESETS: Record<TimerMode, { label: string; minutes: number }> = {
  work: { label: 'Pomodoro', minutes: 25 }, shortBreak: { label: 'Short break', minutes: 5 },
  longBreak: { label: 'Long break', minutes: 15 }, deepWork: { label: 'Deep work', minutes: 45 },
}
function dayStart(date: Date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d }
function weekStart(date: Date) { const d = dayStart(date); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d }

export default function FocusRoomPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [goalId, setGoalId] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<TimerMode>('work')
  const [secondsLeft, setSecondsLeft] = useState(PRESETS.work.minutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [notes, setNotes] = useState('')
  const [stats, setStats] = useState({ today: 0, week: 0, sessions: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMinutes, setSavedMinutes] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const endAt = useRef<number | null>(null)

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
    const { data, error: goalsError } = await supabase.from('goals').select('id,title').eq('user_id', session.user.id).eq('is_completed', false).order('created_at', { ascending: false })
    if (goalsError) setError('Could not load your goals.')
    else { const options = (data || []) as GoalOption[]; const requested = new URLSearchParams(window.location.search).get('goal'); setGoals(options); setGoalId(options.some((g) => g.id === requested) ? requested || '' : options[0]?.id || '') }
    try { await loadStats(session.user.id) } catch { setError('Could not load your focus history.') }
    setLoading(false)
  }) }, [loadStats, router])

  const saveSession = useCallback(async () => {
    if (!userId || !goalId || saving) return
    if (mode === 'shortBreak' || mode === 'longBreak') { setSavedMinutes(0); return }
    const minutes = PRESETS[mode].minutes; setSaving(true); setError(null)
    const { error: saveError } = await supabase.from('focus_logs').insert({ user_id: userId, goal_id: goalId, minutes_logged: minutes, note: notes.trim() || null })
    if (saveError) setError('The timer finished, but the session could not be saved. Please try again.')
    else { setSavedMinutes(minutes); setNotes(''); await loadStats(userId) }
    setSaving(false)
  }, [goalId, loadStats, mode, notes, saving, userId])

  useEffect(() => {
    if (!isRunning) return
    const tick = () => { if (!endAt.current) return; const remaining = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)); setSecondsLeft(remaining); if (!remaining) { setIsRunning(false); endAt.current = null; void saveSession() } }
    tick(); const timer = window.setInterval(tick, 250); return () => window.clearInterval(timer)
  }, [isRunning, saveSession])

  const switchMode = (next: TimerMode) => { setIsRunning(false); endAt.current = null; setMode(next); setSecondsLeft(PRESETS[next].minutes * 60); setSavedMinutes(null) }
  const toggleTimer = () => {
    if (!goalId && mode !== 'shortBreak' && mode !== 'longBreak') { setError('Choose or create a goal before starting a focus session.'); return }
    setError(null); setSavedMinutes(null)
    if (isRunning) { setIsRunning(false); endAt.current = null } else { endAt.current = Date.now() + secondsLeft * 1000; setIsRunning(true) }
  }
  const reset = () => { setIsRunning(false); endAt.current = null; setSecondsLeft(PRESETS[mode].minutes * 60); setSavedMinutes(null) }
  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0'), seconds = (secondsLeft % 60).toString().padStart(2, '0')
  const total = PRESETS[mode].minutes * 60, progress = ((total - secondsLeft) / total) * 100

  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
    <header className="mb-6 flex items-center gap-3"><button onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-lg font-black">Focus Room</h1><p className="text-xs text-slate-500">Focus time that actually counts toward your goal.</p></div></header>
    {loading ? <div className="h-96 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /> : <div className="space-y-4">
      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-[#101b2d]">{(Object.keys(PRESETS) as TimerMode[]).map((preset) => <button key={preset} onClick={() => switchMode(preset)} className={`rounded-xl px-1 py-2 text-[10px] font-black ${mode === preset ? 'bg-amber-500 text-slate-950' : 'text-slate-500'}`}>{PRESETS[preset].label}</button>)}</div>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-[#101b2d]">
        <label htmlFor="focus-goal" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Active goal</label>
        {goals.length ? <select id="focus-goal" value={goalId} onChange={(e) => setGoalId(e.target.value)} disabled={isRunning} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-[#07101f]">{goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</select> : <button onClick={() => router.push('/create-goal')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500 px-3 py-3 text-sm font-bold text-amber-600"><Target className="h-4 w-4" />Create your first goal</button>}
        <div className="relative mx-auto my-7 grid h-52 w-52 place-items-center rounded-full" style={{ background: `conic-gradient(#f59e0b ${progress}%, rgb(226 232 240) ${progress}%)` }}><div className="grid h-44 w-44 place-items-center rounded-full bg-white text-center dark:bg-[#101b2d]"><div><div aria-label={`${minutes} minutes ${seconds} seconds remaining`} className="font-mono text-5xl font-black tracking-tight">{minutes}:{seconds}</div><div className="mt-1 text-xs font-bold uppercase tracking-widest text-amber-500">{isRunning ? 'Focusing' : PRESETS[mode].label}</div></div></div></div>
        <div className="flex justify-center gap-2"><button onClick={toggleTimer} disabled={saving || (!goals.length && mode !== 'shortBreak' && mode !== 'longBreak')} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-50">{isRunning ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4" fill="currentColor" />}{isRunning ? 'Pause' : secondsLeft === total ? 'Start focus' : 'Resume'}</button><button onClick={reset} aria-label="Reset timer" className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800"><RotateCcw className="h-4 w-4" /></button></div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#101b2d]"><label htmlFor="focus-notes" className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-500">Session note <span className="font-medium normal-case">(optional)</span></label><textarea id="focus-notes" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={isRunning} rows={2} maxLength={500} placeholder="What are you working on?" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-[#07101f]" /></section>
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
      {savedMinutes !== null && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="mr-2 inline h-4 w-4" />{savedMinutes ? `${savedMinutes} focus minutes saved.` : 'Break complete. No focus minutes were added.'}</div>}
      <div className="grid grid-cols-3 gap-3 text-center"><Stat icon={<Clock3 className="mx-auto mb-1 h-4 w-4 text-amber-500" />} value={`${stats.today}m`} label="Today" /><Stat value={`${Math.floor(stats.week / 60)}h ${stats.week % 60}m`} label="This week" accent /><Stat value={String(stats.sessions)} label="Sessions" /></div>
    </div>}
  </main>
}

function Stat({ icon, value, label, accent = false }: { icon?: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-[#101b2d]">{icon}<strong className={`block text-base ${accent ? 'text-amber-500' : ''}`}>{value}</strong><span className="text-[9px] font-bold uppercase text-slate-400">{label}</span></div>
}
