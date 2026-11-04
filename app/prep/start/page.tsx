'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, CalendarDays, Check, Gauge, GraduationCap, ListChecks } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { supabase } from '@/utils/supabase'
import { addDays } from '@/lib/prep/revision'
import { byExamOrder, examInfo } from '@/lib/prep/exam'
import { childrenMap } from '@/lib/prep/explorer'
import { enablePush, pushIsOn, pushSupported } from '@/lib/push'
import { usePrepData, type PrepProfile } from '@/lib/prep/usePrepData'
import type { SyllabusNode } from '@/lib/prep/types'

type Level = NonNullable<PrepProfile['level']>
const EXAM_LABEL: Record<string, [string, string]> = {
  upsc_cse_v1: ['UPSC CSE', 'Civil Services'],
  uppcs_v1: ['UPPCS', 'Uttar Pradesh'],
  bpsc_v1: ['BPSC', 'Bihar'],
  jkpsc_cce_v1: ['JKPSC CCE', 'Jammu and Kashmir'],
  hpsc_hcs_v1: ['HCS', 'Haryana'],
  ssc_cgl_v1: ['SSC CGL', 'Staff Selection Commission'],
  bank_po_v1: ['Bank PO', 'IBPS PO and SBI PO'],
  ctet_v1: ['CTET', 'Central teacher eligibility'],
  uptet_v1: ['UPTET', 'UP teacher eligibility'],
  cat_v1: ['CAT', 'MBA entrance'],
}
const LEVELS: [Level, string, string][] = [
  ['beginner', 'Just starting', 'Starting fresh with the syllabus'],
  ['intermediate', 'Some done', 'I have covered some subjects already'],
  ['advanced', 'Mostly done', 'Revision and practice phase'],
]
const QUICK: [string, number][] = [['3 months', 91], ['6 months', 182], ['1 year', 365]]

/**
 * First-time setup, one question per screen: exam → date → level and hours → (if not a beginner)
 * tick the subjects already finished. Ends on the plan with today's target.
 */
export default function PrepStartPage() {
  const router = useRouter()
  const data = usePrepData(true)
  const today = localDateString()
  const [step, setStep] = useState(1)
  const [exam, setExam] = useState<string | null>(null)
  const [stage, setStage] = useState<'prelims' | 'mains'>('prelims')
  const [date, setDate] = useState('')
  const [level, setLevel] = useState<Level | null>(null)
  const [hours, setHours] = useState(6)
  const [done, setDone] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [request, setRequest] = useState<{ open: boolean; name: string; note: string; sent: boolean; busy: boolean }>({ open: false, name: '', note: '', sent: false, busy: false })
  const [adding, setAdding] = useState(false) // "Add another exam": start blank and skip exams already added

  // Start from what is saved, so this also works for changing exam later.
  useEffect(() => {
    if (data.status !== 'ready') return
    const t = window.setTimeout(() => {
      const add = new URLSearchParams(window.location.search).get('add') === '1'
      setAdding(add)
      if (add) return
      setExam((cur) => cur ?? (data.profile.saved ? data.templateId : null))
      setStage(data.profile.targetStage)
      setDate((cur) => cur || (data.profile.examDate && data.profile.examDate > today ? data.profile.examDate : ''))
      setLevel((cur) => cur ?? data.profile.level)
      if (data.profile.dailyMinutes) setHours(Math.round(data.profile.dailyMinutes / 60))
    }, 0)
    return () => window.clearTimeout(t)
  }, [data.status, data.profile, data.templateId, today])

  const code = data.templates.find((t) => t.id === exam)?.code
  const info = examInfo(code)
  const presets = info.presets.filter((p) => p.date > today && (info.targetStages.length === 1 || p.stage === stage))

  const singleStage = info.targetStages.length === 1
  // Subjects of the chosen stage, for "what have you finished?" (shown once the exam's syllabus is loaded).
  const subjects = useMemo(() => {
    if (data.templateId !== exam) return []
    const kids = childrenMap(data.nodes)
    const root = (kids.get('') ?? []).find((r) => r.kind === 'stage' && r.stages.length === 1 && r.stages[0] === (singleStage ? 'prelims' : stage))
    if (!root) return []
    const out: { subject: SyllabusNode; paper: string; units: string[] }[] = []
    for (const paper of kids.get(root.id) ?? []) {
      if ((paper.code ?? '').endsWith('.OPT')) continue
      for (const subject of kids.get(paper.id) ?? []) {
        const units = (kids.get(subject.id) ?? []).filter((t) => t.kind === 'topic' && !t.ownerId).flatMap((t) => { const subs = (kids.get(t.id) ?? []).filter((s) => s.kind === 'subtopic' && !s.ownerId); return subs.length ? subs.map((s) => s.id) : [t.id] })
        if (units.length) out.push({ subject, paper: paper.title, units })
      }
    }
    return out
  }, [data.nodes, data.templateId, exam, singleStage, stage])

  if (data.status === 'loading') return <main className="mx-auto max-w-md px-5 pt-10" aria-busy="true"><div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></main>
  if (data.status !== 'ready') return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">Couldn&apos;t load</h1><p className="mt-2 text-sm text-slate-500">Check your connection and try again.</p><button type="button" onClick={() => void data.reload()} className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Try again</button></div></main>

  const total = level === 'beginner' ? 3 : 4
  const saveSettings = async () => {
    if (!exam || !date || !level) return false
    setBusy(true); setError(null)
    const restart = exam !== data.templateId || date !== data.profile.examDate || stage !== data.profile.targetStage || !data.profile.planStartOn
    const ok = await data.saveProfile({ templateId: exam, examDate: date, targetStage: info.targetStages.includes(stage) ? stage : info.targetStages[0], dailyMinutes: hours * 60, planStartOn: restart ? today : data.profile.planStartOn, level, active: true, reminderEnabled: data.profile.saved ? data.profile.reminderEnabled : true })
    setBusy(false)
    if (!ok) setError('Could not save. Please check your connection and try again.')
    return ok
  }
  const finish = async () => {
    setBusy(true); setError(null)
    const ids = subjects.filter((s) => done.has(s.subject.id)).flatMap((s) => s.units).filter((id) => !data.states.get(id)?.touchedOn)
    if (ids.length && !(await data.tickMany(ids))) { setBusy(false); setError('Could not save your ticks. Please try again.'); return }
    if (pushSupported() && !(await pushIsOn())) await enablePush()
    router.replace('/prep/plan?welcome=1')
  }
  const next = async () => {
    if (step === 1 && !exam) return
    if (step === 2 && (!date || date <= today)) { setError('Pick a date in the future.'); return }
    if (step === 3) {
      if (!level) { setError('Pick the one closest to you.'); return }
      if (!(await saveSettings())) return
      if (level === 'beginner') { await finish(); return }
    }
    setError(null); setStep(step + 1)
  }

  const option = (active: boolean) => `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${active ? 'border-amber-500 bg-amber-500/[0.06] ring-1 ring-amber-500' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`
  const Icon = [GraduationCap, CalendarDays, Gauge, ListChecks][step - 1]
  const title = [adding ? 'Add another exam' : 'What are you preparing for?', 'When is your exam?', 'Where are you right now?', 'What have you already finished?'][step - 1]
  const subtitle = [adding ? 'Today will show all your exams together. Shared subtopics count for both.' : 'You can change this later. Progress is saved for each exam.', 'We work out how much to do each day to finish in time.', 'This sets how hard your daily plan pushes.', 'Tick whole subjects you have genuinely covered. You can change any of it later.'][step - 1]

  return <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pt-5">
    <div className="flex items-center gap-3">
      {step > 1 ? <button type="button" onClick={() => { setError(null); setStep(step - 1) }} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></button>
        : <Link href="/dashboard" aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>}
      <div className="flex-1"><p className="text-center text-xs font-bold text-slate-500">Step {step} of {total}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500 transition-[width]" style={{ width: `${(step / total) * 100}%` }} /></div></div>
      <span className="w-10" />
    </div>

    <div className="mt-6">
      <Icon className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <h1 className="mt-3 text-[22px] font-extrabold leading-tight tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>

    <div className="mt-5 flex-1 space-y-2 pb-28">
      {step === 1 && [...data.templates].sort(byExamOrder).map((t) => { const [name, sub] = EXAM_LABEL[t.code] ?? [t.name, '']; const added = adding && data.plans.some((p) => p.templateId === t.id); return <button key={t.id} type="button" disabled={added} onClick={() => setExam(t.id)} aria-pressed={exam === t.id} className={`${option(exam === t.id)} ${added ? 'opacity-50' : ''}`}>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-bold">{name}</span>{(sub || added) && <span className="block text-[13px] text-slate-500">{added ? 'Already in your plan' : sub}</span>}</span>
        {exam === t.id && <Check className="h-5 w-5 shrink-0 text-amber-600" />}
      </button> })}

      {step === 1 && <div className="pt-2">
        {request.sent
          ? <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">Thanks. We have noted <b>{request.name}</b> and will let you know when its planner is ready.</p>
          : !request.open
            ? <button type="button" onClick={() => setRequest({ ...request, open: true })} className="w-full py-2 text-sm font-medium text-slate-500 underline-offset-4 hover:underline">My exam is not listed</button>
            : <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-sm font-semibold">Request a planner</p>
                <input value={request.name} onChange={(e) => setRequest({ ...request, name: e.target.value })} maxLength={120} placeholder="Exam name, e.g. RAS, MPPSC, NDA" className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" />
                <input value={request.note} onChange={(e) => setRequest({ ...request, note: e.target.value })} maxLength={500} placeholder="Anything to add? (optional)" className="w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700" />
                <button type="button" disabled={request.busy || request.name.trim().length < 2} onClick={async () => { setRequest({ ...request, busy: true }); const { error: e } = await supabase.from('prep_exam_requests').insert({ exam_name: request.name.trim(), details: request.note.trim() || null }); setRequest({ ...request, busy: false, sent: !e }); if (e) setError('Could not send. Try again.') }} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">Send request</button>
              </div>}
      </div>}

      {step === 2 && <>
        {info.targetStages.length > 1 && <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{info.targetStages.map((s) => <button key={s} type="button" onClick={() => setStage(s)} aria-pressed={stage === s} className={`rounded-lg py-2.5 text-sm font-bold ${stage === s ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{info.stageName[s]}</button>)}</div>}
        {presets.map((p) => <button key={p.date} type="button" onClick={() => setDate(p.date)} aria-pressed={date === p.date} className={option(date === p.date)}>
          <span className="min-w-0 flex-1"><span className="block text-base font-bold">{info.short} {p.label}</span><span className="block text-xs text-slate-500">Official date · {p.source}</span></span>
          {date === p.date && <Check className="h-5 w-5 shrink-0 text-amber-600" />}
        </button>)}
        <div className="grid grid-cols-3 gap-2">{QUICK.map(([label, days]) => <button key={label} type="button" onClick={() => setDate(addDays(today, days))} className={`rounded-xl border py-2.5 text-sm font-bold ${date === addDays(today, days) ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>In {label}</button>)}</div>
        <label className="block text-sm font-bold">Or pick a date<input type="date" min={addDays(today, 7)} value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-base dark:border-slate-700 dark:bg-slate-900" /></label>
        {presets.length === 0 && <p className="text-xs text-slate-500">The official date for this exam is not announced yet. Pick your best guess; you can change it any time.</p>}
      </>}

      {step === 3 && <>
        {LEVELS.map(([id, name, sub]) => <button key={id} type="button" onClick={() => setLevel(id)} aria-pressed={level === id} className={option(level === id)}>
          <span className="min-w-0 flex-1"><span className="block text-base font-bold">{name}</span><span className="block text-sm text-slate-500">{sub}</span></span>
          {level === id && <Check className="h-5 w-5 shrink-0 text-amber-600" />}
        </button>)}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between"><span className="text-sm font-bold">Study hours a day</span><span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-extrabold text-slate-950">{hours}h</span></div>
          <input type="range" min={1} max={14} value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Study hours a day" className="mt-3 w-full accent-amber-500" />
        </div>
      </>}

      {step === 4 && (subjects.length === 0
        ? <div className="h-40 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" aria-busy="true" />
        : <div className="space-y-2">{subjects.map(({ subject, paper, units }) => { const on = done.has(subject.id); const already = units.every((u) => data.states.get(u)?.touchedOn); return <button key={subject.id} type="button" disabled={already} onClick={() => setDone((cur) => { const n = new Set(cur); if (n.has(subject.id)) n.delete(subject.id); else n.add(subject.id); return n })} aria-pressed={on || already} className={option(on || already)}>
            <BookOpenCheck className={`h-5 w-5 shrink-0 ${on || already ? 'text-amber-600' : 'text-slate-400'}`} />
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{subject.title === paper ? paper : subject.title}</span><span className="block text-xs text-slate-500">{already ? 'Already ticked' : `${units.length} subtopics`}{subject.title !== paper ? ` · ${paper.replace(/^Paper [IVX]+: /, '')}` : ''}</span></span>
            {(on || already) && <Check className="h-5 w-5 shrink-0 text-amber-600" />}
          </button> })}</div>)}
    </div>

    {error && <p role="alert" className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 text-center text-sm font-semibold text-rose-600">{error}</p>}
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur dark:border-slate-800 dark:bg-[#07101F]/95"><div className="mx-auto max-w-md">
    <button type="button" disabled={busy || (step === 1 && !exam) || (step === 2 && !date) || (step === 3 && !level)} onClick={() => void (step === 4 ? finish() : next())} className="w-full rounded-xl bg-amber-500 py-3.5 text-base font-bold text-slate-950 transition active:scale-[0.99] disabled:opacity-40">
      {busy ? 'Saving…' : step === 4 ? (done.size ? `Tick ${subjects.filter((s) => done.has(s.subject.id)).reduce((n, s) => n + s.units.length, 0)} subtopics and see my plan` : 'Skip, show my plan') : step === 3 && level === 'beginner' ? 'See my plan' : 'Continue'}
    </button>
    </div></div>
  </main>
}
