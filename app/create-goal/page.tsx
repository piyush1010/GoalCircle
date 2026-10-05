'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Globe2, LockKeyhole, Target } from 'lucide-react'
import { supabase } from '@/utils/supabase'

export default function CreateGoalPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (cleanTitle.length < 3) { setError('Give your goal a clear title of at least 3 characters.'); return }
    setSubmitting(true)
    setError(null)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) { router.replace('/login?next=/create-goal'); return }
    const { data, error: createError } = await supabase.from('goals').insert({ user_id: session.user.id, title: cleanTitle, visibility, is_completed: false, current_streak: 0 }).select('id').single()
    if (createError) { setError(createError.message || 'Your goal could not be created. Please try again.'); setSubmitting(false); return }
    router.push(data?.id ? `/goal/${data.id}` : '/dashboard')
    router.refresh()
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-8 flex items-center gap-3"><button onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-lg font-black">Create a goal</h1><p className="text-xs text-slate-500 dark:text-slate-400">Start with one repeatable action.</p></div></header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><Target className="h-6 w-6" /></div><label htmlFor="goal-title" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">What will you do consistently?</label><input id="goal-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} autoFocus placeholder="Read 20 pages every day" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-[#07101f]" /><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>Make it specific and achievable.</span><span>{title.length}/100</span></div></section>
        <fieldset><legend className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Who can see it?</legend><div className="grid grid-cols-2 gap-3">{([{ value: 'public' as const, label: 'Public', helper: 'GoalCircle community', icon: Globe2 }, { value: 'private' as const, label: 'Private', helper: 'Only you', icon: LockKeyhole }]).map((option) => { const Icon = option.icon; const selected = visibility === option.value; return <button type="button" key={option.value} onClick={() => setVisibility(option.value)} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]'}`} aria-pressed={selected}><Icon className={`mb-3 h-5 w-5 ${selected ? 'text-amber-500' : 'text-slate-400'}`} /><span className="block text-sm font-black">{option.label}</span><span className="text-[10px] text-slate-500 dark:text-slate-400">{option.helper}</span></button> })}</div></fieldset>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating your goal…' : 'Create goal'}</button>
      </form>
    </main>
  )
}
