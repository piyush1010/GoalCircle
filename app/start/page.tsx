'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronRight, Search, UsersRound } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import { examInfo } from '@/lib/prep/exam'
import { localDateString } from '@/lib/exams'
import { HABITS, howOften, readDraft, writeDraft, type HabitDraft, type HabitId, type Level, type StartDraft } from '@/lib/startDraft'
import { supabase } from '@/utils/supabase'

/** Exams, grouped the way students think of them. State services ask for the state first. */
const GROUPS: { name: string; line: string; ask?: string; exams: { code: string; name: string; line: string }[] }[] = [
  { name: 'Civil services', line: 'UPSC Civil Services Examination', exams: [{ code: 'upsc_cse_v1', name: 'UPSC CSE', line: 'Prelims, Mains and interview' }] },
  { name: 'State services', line: 'UPPCS, BPSC, MPSC and more', ask: 'Which state?', exams: [
    { code: 'uppcs_v1', name: 'Uttar Pradesh', line: 'UPPCS' }, { code: 'bpsc_v1', name: 'Bihar', line: 'BPSC' }, { code: 'mpsc_rajyaseva_v1', name: 'Maharashtra', line: 'MPSC Rajyaseva' },
    { code: 'hpsc_hcs_v1', name: 'Haryana', line: 'HCS' }, { code: 'jkpsc_cce_v1', name: 'Jammu and Kashmir', line: 'JKPSC CCE' },
  ] },
  { name: 'Staff Selection Commission', line: 'SSC CGL', exams: [{ code: 'ssc_cgl_v1', name: 'SSC CGL', line: 'Tier 1 and Tier 2' }] },
  { name: 'Banking', line: 'IBPS PO and SBI PO', exams: [{ code: 'bank_po_v1', name: 'Bank PO', line: 'Prelims and Mains' }] },
  { name: 'Teaching', line: 'CTET and UPTET', exams: [{ code: 'ctet_v1', name: 'CTET', line: 'Central teacher eligibility' }, { code: 'uptet_v1', name: 'UPTET', line: 'Uttar Pradesh teacher eligibility' }] },
  { name: 'Judiciary', line: 'Civil judge examinations', exams: [{ code: 'up_pcsj_v1', name: 'UP PCS-J', line: 'Uttar Pradesh' }, { code: 'mp_civil_judge_v1', name: 'MP Civil Judge', line: 'Madhya Pradesh' }] },
  { name: 'Defence', line: 'UPSC CDS', exams: [{ code: 'cds_v1', name: 'UPSC CDS', line: 'IMA, INA, AFA and OTA' }] },
  { name: 'MBA entrance', line: 'CAT', exams: [{ code: 'cat_v1', name: 'CAT', line: 'For the IIMs and other business schools' }] },
]
const ALL_EXAMS = GROUPS.flatMap((g) => g.exams.map((e) => ({ ...e, group: g.name, label: g.ask ? e.line : e.name })))
const SEARCH_WORDS: Record<string, string> = {
  upsc_cse_v1: 'upsc cse ias ips civil services', uppcs_v1: 'uppcs uppsc ro aro uttar pradesh up', bpsc_v1: 'bpsc bihar', mpsc_rajyaseva_v1: 'mpsc maharashtra rajyaseva',
  hpsc_hcs_v1: 'hcs hpsc haryana', jkpsc_cce_v1: 'jkpsc jammu kashmir kas', ssc_cgl_v1: 'ssc cgl staff selection', bank_po_v1: 'bank po ibps sbi banking',
  ctet_v1: 'ctet teacher tet', uptet_v1: 'uptet teacher tet uttar pradesh', up_pcsj_v1: 'up pcs-j pcsj judiciary judge law', mp_civil_judge_v1: 'mp civil judge judiciary madhya pradesh',
  cds_v1: 'cds defence army navy air force ssb', cat_v1: 'cat mba iim',
}
const LEVELS: [Level, string, string][] = [
  ['beginner', 'Just starting', 'Starting the syllabus from the beginning'],
  ['intermediate', 'Partly done', 'I have covered some subjects already'],
  ['advanced', 'Mostly done', 'Now revising and practising'],
]
const HOURS = [2, 4, 6, 8]
const OFTEN: [number, string][] = [[7, 'Every day'], [5, 'Five days a week'], [3, 'Three days a week'], [1, 'Once a week']]
const plusDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return localDateString(d) }
const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

type Step = { kind: 'goals' } | { kind: 'group' } | { kind: 'exam' } | { kind: 'date' } | { kind: 'pace' } | { kind: 'habit'; id: HabitId } | { kind: 'ready' }

/**
 * First-time setup, one question per screen: your goals, then the exam (type, exam, date, pace),
 * then each habit, then a summary of your first day with sign-up. Nothing is saved before sign-up.
 */
export default function StartPage() {
  const router = useRouter()
  const today = localDateString()
  const [signedIn, setSignedIn] = useState(false)
  const [picked, setPicked] = useState<('exam' | HabitId)[]>([])
  const [group, setGroup] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [stage, setStage] = useState<'prelims' | 'mains'>('prelims')
  const [custom, setCustom] = useState(false)
  const [hours, setHours] = useState(4)
  const [level, setLevel] = useState<Level | null>(null)
  const [habits, setHabits] = useState<Record<string, HabitDraft>>({})
  const [at, setAt] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Pick up where the visitor left off on this device, and know whether they already have an account.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const d = readDraft()
      if (d) {
        setPicked(d.goals)
        if (d.exam) { setCode(d.exam.code); setDate(d.exam.date); setStage(d.exam.stage); setHours(d.exam.hours); setLevel(d.exam.level) }
        setHabits(Object.fromEntries(d.habits.map((h) => [h.id, h])))
      }
    }, 0)
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    return () => window.clearTimeout(t)
  }, [])

  const steps: Step[] = useMemo(() => [
    { kind: 'goals' },
    ...(picked.includes('exam') ? [{ kind: 'group' } as Step, { kind: 'exam' } as Step, { kind: 'date' } as Step, { kind: 'pace' } as Step] : []),
    ...HABITS.filter((h) => picked.includes(h.id)).map((h) => ({ kind: 'habit', id: h.id }) as Step),
    { kind: 'ready' },
  ], [picked])
  const step = steps[Math.min(at, steps.length - 1)]
  const info = examInfo(code)
  const exam = ALL_EXAMS.find((e) => e.code === code)
  const presets = info.presets.filter((p) => p.date > today)
  const habitList = HABITS.filter((h) => picked.includes(h.id)).map((h) => habits[h.id] ?? { id: h.id, title: h.title, perWeek: h.perWeek })

  const draft = (): Omit<StartDraft, 'savedAt'> => ({
    goals: picked,
    exam: picked.includes('exam') && code && date && level ? { code, date, stage: info.targetStages.includes(stage) ? stage : info.targetStages[0], hours, level } : null,
    habits: habitList,
  })
  useEffect(() => { if (picked.length) writeDraft(draft()) })

  const toggle = (id: 'exam' | HabitId) => setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id])
  const back = () => { setError(null); if (step.kind === 'exam' && group !== null && !query) { setGroup(null); setAt(at - 1); return } setAt(Math.max(0, at - 1)) }
  const next = () => {
    setError(null)
    if (step.kind === 'goals' && !picked.length) return setError('Choose at least one goal.')
    if (step.kind === 'exam' && !code) return setError('Choose your exam.')
    if (step.kind === 'date' && (!date || date <= today)) return setError('Choose a date in the future.')
    if (step.kind === 'pace' && !level) return setError('Choose the one closest to where you are.')
    if (step.kind === 'habit' && !(habits[step.id]?.title ?? HABITS.find((h) => h.id === step.id)!.title).trim()) return setError('Give this goal a name.')
    setAt(at + 1)
  }
  const pickGroup = (i: number) => { setGroup(i); setQuery(''); if (GROUPS[i].exams.length === 1) setCode(GROUPS[i].exams[0].code); setAt(at + 1) }
  const setHabit = (id: HabitId, patch: Partial<HabitDraft>) => setHabits((cur) => { const base = cur[id] ?? (() => { const h = HABITS.find((x) => x.id === id)!; return { id, title: h.title, perWeek: h.perWeek } })(); return { ...cur, [id]: { ...base, ...patch } } })

  const google = async () => {
    setBusy(true); writeDraft(draft())
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/start/finish')}` } })
    if (oauthError) { setBusy(false); setError('Google sign-in could not start. Please try again, or use email.') }
  }

  const option = (on: boolean) => `flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left transition dark:bg-slate-900 ${on ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-800'}`
  const tick = <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"><Check className="h-3 w-3" strokeWidth={3.5} /></span>
  const primary = 'w-full rounded-2xl bg-slate-900 py-4 text-base font-semibold text-white transition active:scale-[0.99] disabled:opacity-40 dark:bg-white dark:text-slate-900'
  const progressSteps = steps.length - 1
  const stepNo = Math.min(at, progressSteps)

  const search = query.trim().toLowerCase()
  const matches = search ? ALL_EXAMS.filter((e) => `${e.name} ${e.line} ${SEARCH_WORDS[e.code] ?? ''}`.toLowerCase().includes(search)) : []

  return <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
    <div className="flex h-10 items-center gap-3">
      {at === 0
        ? <Link href="/" className="flex items-center gap-2 font-bold"><LogoMark size={28} />GoalYaar</Link>
        : <button type="button" onClick={back} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button>}
      {step.kind !== 'ready' && progressSteps > 1 && <div aria-label={`Step ${stepNo + 1} of ${progressSteps}`} className="flex flex-1 gap-1.5">{Array.from({ length: progressSteps }, (_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepNo ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-800'}`} />)}</div>}
    </div>

    <div className="flex-1 pt-6">
      {step.kind === 'goals' && <>
        <h1 className="text-[26px] font-bold tracking-tight">What are your goals?</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">Choose up to five. You can change them later.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {([{ id: 'exam' as const, name: 'Crack an exam', line: 'UPSC, state services, SSC, banking' }, ...HABITS]).map((g) => {
            const on = picked.includes(g.id)
            return <button key={g.id} type="button" onClick={() => toggle(g.id)} aria-pressed={on} className={`relative flex min-h-[88px] flex-col justify-between rounded-2xl border bg-white p-3.5 text-left transition dark:bg-slate-900 ${on ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-800'}`}>
              <span className="pr-6 text-[15px] font-semibold">{g.name}</span>
              <span className="mt-1 text-xs leading-snug text-slate-500">{g.line}</span>
              {on && <span className="absolute right-3 top-3">{tick}</span>}
            </button>
          })}
        </div>
        <Link href={signedIn ? '/circles' : '/login?mode=signup&next=/circles'} className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-3.5 dark:border-slate-700">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><UsersRound className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">I teach, train or coach</span><span className="block text-xs text-slate-500">Set up a batch for your students</span></span>
          <ChevronRight className="h-4 w-4 text-slate-400" />
        </Link>
      </>}

      {step.kind === 'group' && <>
        <h1 className="text-[26px] font-bold tracking-tight">Which exam?</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">Start with the type of exam, or search for it.</p>
        <label className="relative mt-5 block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="For example, UPPCS or SSC CGL" aria-label="Search exams" className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-10 pr-4 text-base dark:border-slate-700 dark:bg-slate-900" />
        </label>
        <div className="mt-3 space-y-2">
          {search
            ? matches.length ? matches.map((e) => <button key={e.code} type="button" onClick={() => { setCode(e.code); setGroup(GROUPS.findIndex((g) => g.name === e.group)); setAt(at + 2) }} className={option(false)}>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{e.group === 'State services' ? e.line : e.name}</span><span className="block text-sm text-slate-500">{e.group === 'State services' ? `${e.name} state services` : e.line}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>) : <p className="px-1 py-3 text-sm text-slate-500">No exam matches “{query}”. Try another name, or choose a type below.</p>
            : GROUPS.map((g, i) => <button key={g.name} type="button" onClick={() => pickGroup(i)} className={option(false)}>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{g.name}</span><span className="block text-sm text-slate-500">{g.line}</span></span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>)}
        </div>
      </>}

      {step.kind === 'exam' && <>
        <h1 className="text-[26px] font-bold tracking-tight">{group !== null ? GROUPS[group].ask ?? GROUPS[group].name : 'Your exam'}</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">{group !== null && GROUPS[group].ask ? 'Your state public service commission.' : 'Choose your exam.'}</p>
        <div className="mt-5 space-y-2">
          {(group !== null ? GROUPS[group].exams : ALL_EXAMS).map((e) => <button key={e.code} type="button" onClick={() => setCode(e.code)} aria-pressed={code === e.code} className={option(code === e.code)}>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{e.name}</span><span className="block text-sm text-slate-500">{e.line}</span></span>
            {code === e.code && tick}
          </button>)}
        </div>
        <p className="mt-4 text-sm text-slate-500">Preparing for two exams? You can add the second one later.</p>
      </>}

      {step.kind === 'date' && <>
        <h1 className="text-[26px] font-bold tracking-tight">When is your {exam?.label ?? 'exam'}{info.targetStages.length > 1 ? ' exam' : ''}?</h1>
        <div className="mt-5 space-y-2">
          {presets.map((p) => <button key={p.label} type="button" onClick={() => { setDate(p.date); setStage(p.stage); setCustom(false) }} aria-pressed={date === p.date && !custom} className={option(date === p.date && !custom)}>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{p.label.replace(/ · /g, ', ')}</span><span className="block text-sm text-slate-500">{p.source ? `From the ${p.source}` : 'Expected date'}</span></span>
            {date === p.date && !custom && tick}
          </button>)}
          {!presets.length && [[91, 'In three months'], [182, 'In six months'], [365, 'In a year']].map(([days, label]) => { const d = plusDays(days as number); return <button key={label} type="button" onClick={() => { setDate(d); setCustom(false) }} aria-pressed={date === d && !custom} className={option(date === d && !custom)}>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{label}</span><span className="block text-sm text-slate-500">{longDate(d)}</span></span>
            {date === d && !custom && tick}
          </button> })}
          <button type="button" onClick={() => setCustom(true)} aria-pressed={custom} className={option(custom)}><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Another date</span><span className="block text-sm text-slate-500">Set your own target</span></span>{custom && tick}</button>
          {custom && <input type="date" min={plusDays(1)} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Exam date" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base dark:border-slate-700 dark:bg-slate-900 dark:[color-scheme:dark]" />}
        </div>
      </>}

      {step.kind === 'pace' && <>
        <h1 className="text-[26px] font-bold tracking-tight">How many hours a day can you study?</h1>
        <div className="mt-5 grid grid-cols-4 gap-2">
          {HOURS.map((h) => <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h} className={`rounded-2xl border bg-white py-3.5 text-[15px] font-semibold dark:bg-slate-900 ${hours === h ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-800'}`}>{h === 8 ? '8+' : h} h</button>)}
        </div>
        <h2 className="mt-8 text-lg font-bold">Where are you with the syllabus?</h2>
        <div className="mt-3 space-y-2">
          {LEVELS.map(([id, name, line]) => <button key={id} type="button" onClick={() => setLevel(id)} aria-pressed={level === id} className={option(level === id)}>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{name}</span><span className="block text-sm text-slate-500">{line}</span></span>
            {level === id && tick}
          </button>)}
        </div>
        {level && level !== 'beginner' && <p className="mt-3 text-sm text-slate-500">After you sign up, you can tick off what you have already covered.</p>}
      </>}

      {step.kind === 'habit' && (() => {
        const h = HABITS.find((x) => x.id === step.id)!
        const value = habits[h.id] ?? { id: h.id, title: h.title, perWeek: h.perWeek }
        return <>
          <h1 className="text-[26px] font-bold tracking-tight">{h.id === 'own' ? 'Your own goal' : `Your ${h.name.toLowerCase()} goal`}</h1>
          <p className="mt-1.5 text-[15px] text-slate-500">Keep it small enough to do on a busy day.</p>
          <label htmlFor="habit-title" className="mt-6 block text-sm font-semibold text-slate-700 dark:text-slate-300">What will you do?</label>
          <input id="habit-title" value={value.title} onChange={(e) => setHabit(h.id, { title: e.target.value })} maxLength={80} placeholder="For example, walk 5,000 steps" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base dark:border-slate-700 dark:bg-slate-900" />
          <p className="mt-6 text-sm font-semibold text-slate-700 dark:text-slate-300">How often?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {OFTEN.map(([n, label]) => <button key={n} type="button" onClick={() => setHabit(h.id, { perWeek: n })} aria-pressed={value.perWeek === n} className={`rounded-2xl border bg-white px-3 py-3.5 text-[15px] font-semibold dark:bg-slate-900 ${value.perWeek === n ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-800'}`}>{label}</button>)}
          </div>
          {signedIn && <p className="mt-6 text-sm text-slate-500">Want to announce it on your feed, or set a finish date? <Link href="/create-goal" className="font-semibold text-slate-900 underline underline-offset-2 dark:text-white">Use the full goal form</Link>.</p>}
        </>
      })()}

      {step.kind === 'ready' && <>
        <h1 className="text-[26px] font-bold tracking-tight">Your plan is ready</h1>
        <p className="mt-1.5 text-[15px] text-slate-500">{signedIn ? 'Here is what you have set up.' : 'Create a free account to save it. It takes a moment.'}</p>
        <ul className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {picked.includes('exam') && exam && date && <li className="px-4 py-3.5">
            <span className="block text-[15px] font-semibold">{exam.label}, {longDate(date)}</span>
            <span className="mt-0.5 block text-sm text-slate-500">A few new subtopics each day to fit {hours === 8 ? 'eight or more' : ['', '', 'two', '', 'four', '', 'six'][hours]} hours, with revision built in</span>
          </li>}
          {habitList.map((h) => <li key={h.id} className="px-4 py-3.5">
            <span className="block text-[15px] font-semibold">{h.title.trim()}</span>
            <span className="mt-0.5 block text-sm text-slate-500">{howOften(h.perWeek).replace(/^./, (c) => c.toUpperCase())}</span>
          </li>)}
        </ul>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
      </>}

      {step.kind !== 'ready' && error && <p role="alert" className="mt-4 text-sm font-medium text-rose-600">{error}</p>}
    </div>

    <div className="pt-6">
      {step.kind === 'ready'
        ? signedIn
          ? <button type="button" onClick={() => { writeDraft(draft()); router.push('/start/finish') }} className={primary}>Create my plan</button>
          : <div className="space-y-2.5">
              <button type="button" disabled={busy} onClick={() => void google()} className={primary}>Continue with Google</button>
              <Link href="/login?mode=signup&next=/start/finish" onClick={() => writeDraft(draft())} className="block w-full rounded-2xl border border-slate-300 py-3.5 text-center text-[15px] font-semibold dark:border-slate-700">Use email</Link>
              <Link href="/login?next=/start/finish" onClick={() => writeDraft(draft())} className="block py-2 text-center text-sm font-medium text-slate-500">I already have an account</Link>
            </div>
        : step.kind === 'group'
          ? null
          : <button type="button" onClick={next} disabled={step.kind === 'goals' && !picked.length} className={primary}>
              {step.kind === 'goals' ? (picked.length ? `Continue with ${picked.length} ${picked.length === 1 ? 'goal' : 'goals'}` : 'Choose at least one goal') : 'Continue'}
            </button>}
      {step.kind === 'goals' && <p className="mt-3 text-center text-xs text-slate-500">Free, with no ads.</p>}
    </div>
  </main>
}
