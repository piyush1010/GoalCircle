'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface GoalOption { id: string; title: string }

export default function CheckInPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [goalId, setGoalId] = useState('')
  const [caption, setCaption] = useState('')
  const [minutes, setMinutes] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace('/login?next=/check-in'); return }
      setUserId(session.user.id)
      const { data, error: goalsError } = await supabase.from('goals').select('id,title').eq('user_id', session.user.id).eq('is_completed', false).order('created_at', { ascending: false })
      if (goalsError) setError('Could not load your goals.')
      else {
        const options = (data || []) as GoalOption[]
        const requestedGoal = new URLSearchParams(window.location.search).get('goal')
        const selectedGoal = options.some((goal) => goal.id === requestedGoal)
          ? requestedGoal
          : options[0]?.id
        setGoals(options)
        setGoalId(selectedGoal || '')
      }
      setLoading(false)
    })
  }, [router])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId || !goalId || !caption.trim()) { setError('Choose a goal and describe today’s progress.'); return }
    setSubmitting(true); setError(null)
    const parsedMinutes = minutes ? Number(minutes) : null
    const { error: postError } = await supabase.from('posts').insert({ user_id: userId, goal_id: goalId, caption: caption.trim(), proof_type: parsedMinutes ? 'focus' : 'text', minutes_logged: parsedMinutes, visibility: 'public' })
    if (postError) { setError(postError.message || 'Your check-in could not be published.'); setSubmitting(false); return }

    if (parsedMinutes) {
      const { error: logError } = await supabase.from('focus_logs').insert({
        user_id: userId,
        goal_id: goalId,
        minutes_logged: parsedMinutes,
        note: caption.trim(),
      })
      if (logError) {
        setError('Your update was published, but the focus minutes were not saved. Please try logging them again.')
        setSubmitting(false)
        return
      }
    }

    router.push('/feed'); router.refresh()
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-7 flex items-center gap-3"><button onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-lg font-black">Daily check-in</h1><p className="text-xs text-slate-500 dark:text-slate-400">Small proof. Real momentum.</p></div></header>
      {loading ? <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /> : goals.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-amber-500" /><h2 className="font-black">Create a goal first</h2><p className="mb-4 mt-1 text-xs text-slate-500">Every check-in belongs to a goal.</p><button onClick={() => router.push('/create-goal')} className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950">Create a goal</button></div> : <form onSubmit={submit} className="space-y-5"><div><label htmlFor="goal" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Goal</label><select id="goal" value={goalId} onChange={(event) => setGoalId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-[#101b2d]">{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></div><div><label htmlFor="caption" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">What progress did you make?</label><textarea id="caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={5} maxLength={500} placeholder="Finished chapter four before sunrise…" className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-[#101b2d]" /><div className="mt-1 text-right text-[10px] text-slate-400">{caption.length}/500</div></div><div><label htmlFor="minutes" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Focus minutes <span className="font-medium normal-case">(optional)</span></label><input id="minutes" type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="25" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-[#101b2d]" /></div>{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}<button type="submit" disabled={submitting} className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-black text-slate-950 disabled:opacity-60">{submitting ? 'Publishing…' : 'Publish check-in'}</button></form>}
    </main>
  )
}
