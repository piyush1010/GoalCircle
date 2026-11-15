'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Copy, MessageCircle } from 'lucide-react'
import { inviteMessage } from '@/components/MentorDashboard'
import { ALL_EXAMS, GROUPS, batchExamTag } from '@/lib/examGroups'
import { supabase } from '@/utils/supabase'

type Kind = 'exam' | 'fitness' | 'skill' | 'other'
const KINDS: { id: Kind; name: string; line: string; batch: string; target: string; category: string; how: string }[] = [
  { id: 'exam', name: 'An exam', line: 'UPSC, state services, SSC, banking', batch: 'Prelims 2027 batch', target: '', category: 'learning', how: 'Your batch follows the exam’s syllabus. Tasks can be topics to study, written answers or mock tests.' },
  { id: 'fitness', name: 'Fitness or health', line: 'Gym, yoga, meditation', batch: 'Morning fitness batch', target: 'Five workouts a week', category: 'fitness', how: 'Members check in with a tick, their minutes or a photo, and you see who showed up.' },
  { id: 'skill', name: 'A skill', line: 'Music, coding, spoken English', batch: 'Guitar for beginners', target: 'Practise 20 minutes a day', category: 'learning', how: 'Students log their practice minutes, or send a photo, video or link for you to review.' },
  { id: 'other', name: 'Something else', line: 'Name it yourself', batch: '', target: 'Every day', category: 'habits', how: 'Set the goal and how often. Members tick it off each time.' },
]
const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/**
 * Start a batch: what you coach, a name and a target, then a link to share with your students.
 * Works the same for a UPSC teacher, a fitness trainer and a skill coach.
 */
export default function NewBatchPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [kind, setKind] = useState<Kind>('exam')
  const [name, setName] = useState('')
  const [named, setNamed] = useState(false) // stop replacing the name once the mentor types one
  const [exam, setExam] = useState('upsc_cse_v1')
  const [target, setTarget] = useState(KINDS[0].target)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; name: string; link: string; code: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login?mode=signup&next=/circles/new')
      else setUserId(data.session.user.id)
    })
  }, [router])

  const info = KINDS.find((k) => k.id === kind)!
  const pick = (next: Kind) => { setKind(next); const k = KINDS.find((x) => x.id === next)!; if (!named) setName(k.batch); setTarget(k.target) }
  useEffect(() => { const t = window.setTimeout(() => { setName((n) => n || KINDS[0].batch) }, 0); return () => window.clearTimeout(t) }, [])

  const create = async () => {
    if (!userId) return
    const clean = name.trim()
    if (clean.length < 2) { setError('Give the batch a name of at least two letters.'); return }
    if (kind !== 'exam' && !target.trim()) { setError('Say what members will do, and how often.'); return }
    setBusy(true); setError(null)
    const { data, error: createError } = await supabase.from('circles').insert({
      owner_id: userId, name: clean, description: null, category: info.category, emoji: 'circle', member_count: 1, visibility: 'private',
      exam: kind === 'exam' ? batchExamTag(exam) : null, coach_kind: kind, exam_template: kind === 'exam' ? exam : null, target: kind === 'exam' ? null : target.trim(),
    }).select('id,name,invite_code').single()
    if (createError || !data) { setBusy(false); setError('The batch could not be created. Please try again.'); return }
    const { error: memberError } = await supabase.from('circle_memberships').insert({ circle_id: data.id, user_id: userId, role: 'owner' })
    setBusy(false)
    if (memberError) { setError('The batch was created, but something went wrong. Open it from Communities.'); return }
    setCreated({ id: data.id, name: data.name, code: data.invite_code ?? '', link: `${window.location.origin}/circles/join/${data.invite_code}` })
  }

  const copy = async () => { if (!created) return; try { await navigator.clipboard.writeText(created.link); setCopied(true); window.setTimeout(() => setCopied(false), 2500) } catch { /* the link is on screen */ } }
  const option = (on: boolean) => `relative flex min-h-[84px] flex-col justify-between rounded-2xl border bg-white p-3.5 text-left transition dark:bg-slate-900 ${on ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-800'}`
  const field = 'mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base dark:border-slate-700 dark:bg-slate-900'

  if (created) return <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
    <div className="flex flex-1 flex-col justify-center text-center">
      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Batch created</p>
      <h1 className="mt-2 text-[26px] font-bold tracking-tight">{created.name}</h1>
      <p className="mt-6 text-[15px] text-slate-600 dark:text-slate-300">Share this link with your students. They join with one tap.</p>
      <p className="mx-auto mt-3 max-w-full break-all rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium dark:bg-slate-800">{created.link}</p>
      <p className="mt-4 text-sm text-slate-500">When they join, each student chooses what you can see. You can ask any of them to share their full plan.</p>
    </div>
    <div className="space-y-2.5">
      <a href={whatsappUrl(inviteMessage(created.name, created.link))} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-base font-semibold text-white dark:bg-white dark:text-slate-900"><MessageCircle className="h-5 w-5" />Share on WhatsApp</a>
      <button type="button" onClick={() => void copy()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 text-[15px] font-semibold dark:border-slate-600">{copied ? <><Check className="h-4 w-4" />Copied</> : <><Copy className="h-4 w-4" />Copy invite link</>}</button>
      <Link href={`/circles/${created.id}`} className="block py-2 text-center text-[15px] font-semibold text-slate-600 dark:text-slate-300">Go to the batch</Link>
    </div>
  </main>

  return <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
    <div className="flex h-10 items-center gap-2">
      <button type="button" onClick={() => router.back()} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button>
      <span className="text-[15px] font-semibold">Start a batch</span>
    </div>

    <div className="flex-1 pt-5">
      <h1 className="text-[26px] font-bold tracking-tight">What do you coach?</h1>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {KINDS.map((k) => <button key={k.id} type="button" onClick={() => pick(k.id)} aria-pressed={kind === k.id} className={option(kind === k.id)}>
          <span className="pr-6 text-[15px] font-semibold">{k.name}</span><span className="mt-1 text-xs text-slate-500">{k.line}</span>
          {kind === k.id && <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Check className="h-3 w-3" strokeWidth={3.5} /></span>}
        </button>)}
      </div>

      {kind === 'exam' && <label className="mt-6 block text-sm font-semibold text-slate-700 dark:text-slate-300">Which exam?
        <select value={exam} onChange={(e) => setExam(e.target.value)} className={field}>
          {GROUPS.map((g) => <optgroup key={g.name} label={g.name}>{g.exams.map((e) => <option key={e.code} value={e.code}>{ALL_EXAMS.find((x) => x.code === e.code)?.label ?? e.name}</option>)}</optgroup>)}
        </select>
      </label>}

      <label className="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-300">Name your batch
        <input value={name} onChange={(e) => { setName(e.target.value); setNamed(true) }} maxLength={80} placeholder="For example, Evening yoga batch" className={field} />
      </label>

      {kind !== 'exam' && <label className="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-300">{kind === 'skill' ? 'What will students practise, and how often?' : 'What will members do, and how often?'}
        <input value={target} onChange={(e) => setTarget(e.target.value)} maxLength={120} placeholder="For example, five workouts a week" className={field} />
      </label>}

      <p className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">{info.how}</p>
      <p className="mt-4 text-sm text-slate-500">Starting an open group anyone can find instead? <Link href="/circles?create=1" className="font-semibold text-slate-900 underline underline-offset-2 dark:text-white">Use the group form</Link>.</p>
      {error && <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
    </div>

    <button type="button" disabled={busy || !userId} onClick={() => void create()} className="mt-6 h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Creating…' : 'Create batch'}</button>
  </main>
}
