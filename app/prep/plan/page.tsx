'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowDownToLine, ArrowLeft, ArrowUpToLine, CalendarDays, ChevronRight, CircleAlert, FileText, HelpCircle, ListTree, NotebookPen, Play, RotateCcw, Settings2, Timer, TrendingUp, Undo2 } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { optionalSubjects, planFor, type PacePlan, type Unit } from '@/lib/prep/pace'
import { retention } from '@/lib/prep/revision'
import { noExamsLeft, usePrepData } from '@/lib/prep/usePrepData'
import PrepSetup, { EXAM_SHORT, readShiftDate } from '@/components/prep/PrepSetup'
import ExamBatch from '@/components/prep/ExamBatch'
import { childrenMap } from '@/lib/prep/explorer'
import HelpButton from '@/components/HelpButton'
import ExamSwitcher from '@/components/prep/ExamSwitcher'
import FocusTimer, { savedFocusTitle } from '@/components/FocusTimer'
import { examInfo } from '@/lib/prep/exam'
import { usePrepLang } from '@/lib/prep/i18n'
import { moveUnit, orderLine, planSubjects, unmoveUnit } from '@/lib/prep/order'
import StudyOrderSheet from '@/components/prep/StudyOrderSheet'
import ItemMenu, { type MenuAction } from '@/components/ItemMenu'

const MIN_PER_SUBTOPIC = 40 // rough time for one study sitting; used only for the "is this realistic?" check
const STATUS: Record<PacePlan['status'], [string, string]> = {
  on_track: ['On track', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'],
  slightly_behind: ['Slightly behind', 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'],
  behind: ['Behind', 'bg-rose-500/10 text-rose-700 dark:text-rose-400'],
  revision_window: ['Revision window', 'bg-sky-500/10 text-sky-700 dark:text-sky-400'],
  complete: ['Syllabus covered', 'bg-emerald-600 text-white'],
  past: ['Date passed', 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'],
}
const dayLabel = (iso: string, today: string) => {
  const d = new Date(`${iso}T00:00:00`)
  const diff = Math.round((d.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
const hoursFor = (units: number) => { const min = units * MIN_PER_SUBTOPIC; return min < 60 ? `about ${min} minutes` : `about ${Math.round(min / 30) / 2} hours`.replace('.5 hours', ' and a half hours').replace('about 1 and a half hours', 'about an hour and a half').replace('about 1 hours', 'about an hour') }

/**
 * One exam's space. My Plan: the daily target, today's subtopics, the week ahead, the syllabus by
 * subject, and practice and review. Batch: your batches, your mentor's requests and what you share.
 */
export default function PrepPlanPage() {
  const data = usePrepData(true)
  const router = useRouter()
  const [setup, setSetup] = useState(false)
  const [why, setWhy] = useState(false)
  const [ahead, setAhead] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  useEffect(() => { if (!toastMsg) return; const x = window.setTimeout(() => setToastMsg(null), 4000); return () => window.clearTimeout(x) }, [toastMsg])
  const [, , t] = usePrepLang()
  const today = localDateString()
  const [tab, setTab] = useState<'plan' | 'batch'>('plan')
  const [day, setDay] = useState(0)
  const [orderOpen, setOrderOpen] = useState(false)
  useEffect(() => { const x = window.setTimeout(() => { if (new URLSearchParams(window.location.search).get('tab') === 'batch') setTab('batch') }, 0); return () => window.clearTimeout(x) }, [])

  const plan = useMemo(() => (data.status === 'ready' ? planFor(data.nodes, data.states, data.profile, today) : null), [data.status, data.nodes, data.states, data.profile, today])
  const dueCount = useMemo(() => data.nodes.filter((n) => n.kind === 'topic' && !n.ownerId).filter((n) => { const s = data.states.get(n.id); const r = s ? retention(s, today) : null; return r?.status === 'overdue' || r?.status === 'due_today' }).length, [data.nodes, data.states, today])

  // Coverage by subject, for the syllabus list: each official subtopic (or a topic without any) counts once.
  const subjects = useMemo(() => {
    if (data.status !== 'ready') return []
    const kids = childrenMap(data.nodes)
    const stage = data.profile.targetStage
    const roots = (kids.get('') ?? []).filter((r) => r.kind === 'stage' && r.stages.length === 1 && r.stages[0] === stage)
    const out: { id: string; name: string; done: number; total: number }[] = []
    for (const root of roots) for (const paper of kids.get(root.id) ?? []) {
      if ((paper.code ?? '').endsWith('.OPT')) continue
      for (const subject of kids.get(paper.id) ?? []) {
        const units = (kids.get(subject.id) ?? []).filter((n) => n.kind === 'topic' && !n.ownerId).flatMap((topic) => { const subs = (kids.get(topic.id) ?? []).filter((x) => x.kind === 'subtopic' && !x.ownerId); return subs.length ? subs : [topic] })
        if (units.length) out.push({ id: subject.id, name: subject.title, done: units.filter((u) => data.states.get(u.id)?.touchedOn).length, total: units.length })
      }
    }
    return out
  }, [data.status, data.nodes, data.states, data.profile.targetStage])

  // Subjects for "Your study order", in syllabus order, with how many subtopics are left in each.
  const orderSubjects = useMemo(() => {
    if (!plan) return []
    const rank = new Map(subjects.map((s, i) => [s.id, i]))
    const left = new Map<string, number>()
    for (const u of plan.units) if (!data.states.get(u.id)?.touchedOn) left.set(u.subjectId ?? u.paperTitle, (left.get(u.subjectId ?? u.paperTitle) ?? 0) + 1)
    return planSubjects(plan.units).sort((a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6)).map((s) => ({ id: s.id, title: s.title, left: left.get(s.id) ?? 0 }))
  }, [plan, subjects, data.states])

  // Remember today's target for the reminder.
  const { saveTarget } = data
  const perDay = plan?.perDay
  useEffect(() => { if (perDay !== undefined) void saveTarget(perDay) }, [perDay, saveTarget])
  // First visit: open setup straight away.
  const needsSetup = data.status === 'ready' && !data.profile.saved
  // First visit: the step-by-step setup instead of a sheet.
  const leaveTo = noExamsLeft(data) ? '/dashboard' : '/prep/start'
  useEffect(() => { if (needsSetup) router.replace(leaveTo) }, [needsSetup, leaveTo, router])
  // Arriving from setup: a one-line welcome that explains the screen.
  const [welcome, setWelcome] = useState(false)
  // Exams held in shifts: until the student sets their own date, remind them near the window.
  const [shiftDate, setShiftDate] = useState<string | null>(null)
  useEffect(() => { const t = window.setTimeout(() => setShiftDate(readShiftDate(data.templateId)), 0); return () => window.clearTimeout(t) }, [data.templateId, setup])
  // The focus timer: which subtopic, and a session left running from before.
  const [timerPick, setTimerPick] = useState<string | null>(null)
  const [timerOpen, setTimerOpen] = useState(false)
  const [runningTitle, setRunningTitle] = useState<string | null>(null)
  useEffect(() => { const t = window.setTimeout(() => setRunningTitle(savedFocusTitle()), 0); return () => window.clearTimeout(t) }, [timerOpen])
  useEffect(() => { const t = window.setTimeout(() => setWelcome(new URLSearchParams(window.location.search).get('welcome') === '1'), 0); return () => window.clearTimeout(t) }, [])

  if (data.status === 'loading') return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3].map((k) => <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (data.status !== 'ready') return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">{data.status === 'denied' ? 'Not available yet' : "Couldn't load your plan"}</h1><Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Back to Today</Link></div></main>

  const shifts = examInfo(data.template?.code).shifts
  const shiftNote = Boolean(shifts?.stages.includes(data.profile.targetStage)) && Boolean(data.profile.examDate) && shiftDate !== data.profile.examDate
  const examName = data.template ? EXAM_SHORT[data.template.code] ?? data.template.name : 'Your exam'
  const stageName = examInfo(data.template?.code).stageName[data.profile.targetStage]
  const tick = async (u: Unit, on: boolean) => { if (busy) return; setBusy(u.id); await data.tick(u.id, on); setBusy(null) }
  const order = data.profile.studyOrder
  // Move one subtopic to the front or the end of the plan, or put it back.
  const move = async (u: Unit, where: 'next' | 'later' | 'back') => {
    const ok = await data.saveOrder(where === 'back' ? unmoveUnit(order, u.id) : moveUnit(order, u.id, where))
    setToastMsg(!ok ? 'That didn’t save. Please try again.' : where === 'next' ? `${u.title} is next.` : where === 'later' ? `${u.title} moved to the end of your plan.` : `${u.title} is back in its usual place.`)
  }
  const moveActions = (u: Unit, isToday: boolean): MenuAction[] => {
    const moved = Boolean(order?.next.includes(u.id) || order?.later.includes(u.id))
    return [
      ...(!isToday ? [{ label: 'Do this next', icon: ArrowUpToLine, onPick: () => void move(u, 'next') }] : []),
      ...(!order?.later.includes(u.id) ? [{ label: 'Move to the end', icon: ArrowDownToLine, onPick: () => void move(u, 'later') }] : []),
      ...(moved ? [{ label: 'Put back in order', icon: Undo2, onPick: () => void move(u, 'back') }] : []),
    ]
  }
  const unitRow = (u: Unit) => {
    const on = Boolean(data.states.get(u.id)?.touchedOn)
    return <li key={u.id}><label className="flex cursor-pointer items-start gap-3 px-4 py-2.5">
      <input type="checkbox" checked={on} disabled={busy !== null} onChange={() => void tick(u, !on)} className="mt-0.5 h-5 w-5 shrink-0 accent-slate-900" />
      <span className="min-w-0 flex-1"><span className={`block text-sm font-semibold leading-snug ${on ? 'text-slate-500 line-through decoration-slate-300' : ''}`}>{u.title}</span><span className="block text-xs text-slate-500">{u.topicTitle === u.title ? u.paperTitle : u.topicTitle}</span></span>
    {!on && <ItemMenu label="subtopic" actions={moveActions(u, true)} />}
    <Link href={`/prep?topic=${u.topicId}`} aria-label={`Open ${u.topicTitle}`} className="-my-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400"><ChevronRight className="h-4 w-4" /></Link></label></li>
  }

  const todayUnits = plan?.days[0]?.date === today ? plan.days[0].units : []
  const timerUnits = plan ? [...todayUnits, ...(plan.days[1]?.units ?? [])].slice(0, 8) : []
  const runningUnit = runningTitle ? timerUnits.find((u) => u.title === runningTitle) : undefined
  const timerUnit = timerUnits.find((u) => u.id === (timerOpen && runningUnit && !timerPick ? runningUnit.id : timerPick)) ?? runningUnit ?? timerUnits[0]
  const resumable = Boolean(runningUnit && timerUnit && runningUnit.id === timerUnit.id)
  const doneTodayUnits = plan ? plan.units.filter((u) => data.states.get(u.id)?.touchedOn === today) : []
  const targetMet = plan ? plan.doneToday >= plan.perDay && plan.perDay > 0 : false
  const hoursNeeded = plan ? (plan.perDay * MIN_PER_SUBTOPIC) / 60 : 0
  const hoursAvailable = (data.profile.dailyMinutes ?? 0) / 60

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl font-bold leading-tight tracking-tight">{examName}</h1><p className="text-sm text-slate-500">{data.profile.examDate ? `${stageName} on ${longDate(data.profile.examDate)}${plan && plan.daysLeft >= 0 ? `, in ${plan.daysLeft} ${plan.daysLeft === 1 ? 'day' : 'days'}` : ''}` : `${stageName}: set your exam date`}</p></div>
      <HelpButton />
      <button type="button" onClick={() => setSetup(true)} aria-label="Change plan" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Settings2 className="h-4 w-4" /></button>
    </header>
    <div role="tablist" aria-label="Exam" className="mb-4 grid grid-cols-2 border-b border-slate-200 dark:border-slate-800">
      {([['plan', 'My Plan'], ['batch', 'Batch']] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`-mb-px h-11 border-b-2 text-sm font-semibold ${tab === id ? 'border-amber-500 text-slate-900 dark:text-white' : 'border-transparent text-slate-500'}`}>{label}</button>)}
    </div>
    {tab === 'batch' && data.userId && data.templateId && <ExamBatch userId={data.userId} templateId={data.templateId} examName={examName} />}
    {tab === 'plan' && <>
      <ExamSwitcher plans={data.plans} current={data.templateId} onPick={data.setView} manage={{ removed: data.removedPlans, onRemove: data.removePlan, onRemoveAll: data.removeAllPlans, onRestore: data.restorePlan }} />
    {welcome && plan && <section className="mb-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
      <p className="font-bold">Your plan is ready.</p>
      <p className="mt-1">Each day, tick the subtopics below as you study them. Revise when reminded. That is all you need to do; everything else updates itself.</p>
      <button type="button" onClick={() => setWelcome(false)} className="mt-2 text-xs font-bold underline">Got it</button>
    </section>}

    {shiftNote && plan && plan.daysLeft >= 0 && <section className="mb-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="min-w-0 flex-1 text-slate-600 dark:text-slate-300"><span className="font-semibold text-slate-900 dark:text-white">Held in shifts.</span> Your plan aims at the first day of the window. {plan.daysLeft <= 30 ? 'Got your admit card? Set your own date.' : 'Set your own date when the admit card is out.'}</p>
      {plan.daysLeft <= 30 && <button type="button" onClick={() => setSetup(true)} className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold dark:border-slate-600">Set date</button>}
    </section>}

    {!plan
      ? <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CalendarDays className="mx-auto h-8 w-8 text-slate-500" />
          <h2 className="mt-2 text-lg">How long do you have?</h2>
          <p className="mt-1 text-sm text-slate-500">Tell us your exam date and we will work out how many subtopics to finish each day, and which ones.</p>
          <button type="button" onClick={() => setSetup(true)} className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-slate-900">Set my target</button>
        </section>
      : <>
        <section data-guide="plan-target" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {plan.status === 'complete' ? <p className="text-2xl font-extrabold">All {plan.total} covered</p>
                : plan.status === 'revision_window' || plan.status === 'past' ? <p className="text-2xl font-extrabold">{plan.remaining} left</p>
                : <p className="text-3xl font-extrabold tabular-nums">{plan.perDay} <span className="text-base font-bold text-slate-500">{t('subtopics a day')}</span></p>}
              <p className="mt-1 text-sm text-slate-500">{plan.daysLeft >= 0 ? `${plan.daysLeft} ${t('days left')}` : 'Exam date has passed'}{plan.remaining > 0 ? `, about ${Math.round((plan.remaining * MIN_PER_SUBTOPIC) / 60)} hours of study to go` : ''}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[plan.status][1]}`}>{t(STATUS[plan.status][0])}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${plan.total ? Math.round((plan.done / plan.total) * 100) : 0}%` }} /></div>
          <p className="mt-1.5 text-xs text-slate-500"><b className="tabular-nums text-slate-700 dark:text-slate-200">{plan.done}</b> of {plan.total} {stageName} subtopics ticked{plan.behindBy > 0 && plan.status !== 'complete' ? `, ${plan.behindBy} behind schedule` : ''}</p>
          <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"><HelpCircle className="h-4 w-4" />{t('How is this worked out?')}</button>
          {why && <ul className="mt-2 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{plan.reasons.map((r) => <li key={r}>{r}</li>)}<li><Link href="/prep/how" className="font-bold underline">How every number is worked out</Link></li><li>The target is recalculated every day: miss a day and it rises a little, get ahead and it falls.</li>{plan.revisionDays > 0 && <li>The last {plan.revisionDays} days before the exam are kept for revision.</li>}<li>Hours assume about {MIN_PER_SUBTOPIC} minutes a subtopic; treat them as a rough guide.</li><li>{data.profile.optionalSubjectId ? 'Your optional subject is included in the Mains plan.' : 'Optional papers are left out until you pick your optional in settings.'}</li></ul>}
          {(plan.status === 'behind' || plan.status === 'slightly_behind') && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
            <p className="text-sm">{t('Fell behind? It happens to everyone. Start fresh and spread what is left evenly over the days remaining.')}</p>
            <button type="button" disabled={busy !== null} onClick={async () => { setBusy('fresh'); await data.saveProfile({ planStartOn: today }); setBusy(null) }} className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900">{t('Start fresh from today')}</button>
          </div>}
          {plan.perDay > 0 && hoursAvailable > 0 && hoursNeeded > hoursAvailable * 0.8 && plan.status !== 'complete' && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-300">At about {MIN_PER_SUBTOPIC} minutes a subtopic, this needs roughly {hoursNeeded.toFixed(1)} hours of new study a day plus revision, against your {hoursAvailable} hours. A later date or a few more hours would make it realistic.</p>}
        </section>

        {plan.status !== 'complete' && plan.status !== 'past' && plan.status !== 'revision_window' && <section data-guide="plan-today" className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between px-4 pt-3"><p className="text-sm font-medium text-slate-500">{t('Today')}</p><p className="text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">{Math.min(plan.doneToday, plan.perDay)} / {plan.perDay} {t('done')}</p></div>
          {targetMet && <p className="mx-4 mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Today&apos;s target is done. Anything extra lowers tomorrow&apos;s.</p>}
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">{doneTodayUnits.map(unitRow)}{todayUnits.map(unitRow)}</ul>
          {targetMet && plan.days[1] && <button type="button" onClick={() => setAhead(!ahead)} className="mx-4 mb-3 mt-1 text-xs font-bold text-slate-900 dark:text-white">{ahead ? 'Hide' : 'Get ahead: show tomorrow’s'}</button>}
          {ahead && plan.days[1] && <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">{plan.days[1].units.map(unitRow)}</ul>}
          {dueCount > 0 && <Link href="/prep?filter=due" className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-slate-800 dark:text-rose-400"><RotateCcw className="h-4 w-4" />Plus {dueCount} revision{dueCount === 1 ? '' : 's'} due →</Link>}
        </section>}

        {plan.status !== 'complete' && timerUnits.length > 0 && <section data-guide="plan-timer" className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Timer className="h-5 w-5 shrink-0 text-slate-500" />
          <select aria-label="What are you studying?" value={timerUnit?.id ?? ''} onChange={(e) => setTimerPick(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">{timerUnits.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}</select>
          <button type="button" onClick={() => setTimerOpen(true)} className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"><Play className="h-4 w-4" />{resumable ? 'Resume' : 'Focus'}</button>
        </section>}
        {timerOpen && timerUnit && <FocusTimer title={timerUnit.title} subtitle={timerUnit.topicTitle} doneLabel="Done with this subtopic" onClose={() => setTimerOpen(false)} onFinish={async (minutes, tickIt) => {
          const ok = tickIt ? await data.tick(timerUnit.id, true, minutes) : await data.logEvent(null, 'studied', { minutes, details: { timer: true, unit: timerUnit.id } })
          setToastMsg(ok ? `${minutes} min saved${tickIt ? ' and ticked' : ''}.` : 'Could not save.')
        }} />}

        {plan.status === 'revision_window' && <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">You are in your revision window. Focus on revising what you have covered and on mocks; {plan.remaining} subtopics are still unticked. <Link href="/prep?filter=due" className="font-bold text-slate-900 dark:text-white">Revisions due →</Link></section>}

        {plan.days.length > 1 && plan.status !== 'complete' && (() => {
          const coming = plan.days.slice(1, 8)
          const pick = coming[Math.min(day, coming.length - 1)]
          return <section aria-labelledby="week-h" className="mt-6">
            <div className="flex items-baseline justify-between"><h2 id="week-h" className="text-base font-semibold">Coming up</h2><button type="button" onClick={() => setOrderOpen(true)} className="text-sm font-medium text-slate-900 dark:text-white">Change the order</button></div>
            <div className="mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${coming.length}, minmax(0, 1fr))` }}>
              {coming.map((d, i) => { const on = i === day; const date = new Date(`${d.date}T00:00:00`); return <button key={d.date} type="button" onClick={() => setDay(i)} aria-pressed={on} className={`flex h-16 flex-col items-center justify-center rounded-2xl border text-center ${on ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
                <span className="text-[11px] font-medium opacity-80">{date.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                <span className="text-base font-bold">{date.getDate()}</span>
              </button> })}
            </div>
            {pick && <div className="mt-2 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <p className="px-4 pt-3 text-sm text-slate-500">{dayLabel(pick.date, today)}: {pick.units.length} {pick.units.length === 1 ? 'subtopic' : 'subtopics'}, {hoursFor(pick.units.length)}</p>
              <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">{pick.units.map((u) => <li key={u.id} className="flex items-center gap-1 pr-3"><Link href={`/prep?topic=${u.topicId}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-4"><span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-snug">{u.title}</span><span className="block text-xs text-slate-500">{u.topicTitle === u.title ? u.paperTitle : u.topicTitle}</span></span></Link><ItemMenu label="subtopic" actions={moveActions(u, false)} /></li>)}</ul>
              <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800">{orderLine(order)} Tick subtopics in any order; the plan adjusts.</p>
            </div>}
          </section>
        })()}
      </>}

    {subjects.length > 0 && <section aria-labelledby="syllabus-h" className="mt-6">
      <div className="flex items-baseline justify-between"><h2 id="syllabus-h" className="text-base font-semibold">Syllabus</h2><Link href="/prep" className="text-sm font-medium text-slate-900 dark:text-white">Open all</Link></div>
      <div className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {subjects.map((sub) => { const pct = Math.round((sub.done / sub.total) * 100); return <Link key={sub.id} href={`/prep?open=${sub.id}`} className="flex items-center gap-3 px-4 py-3">
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{sub.name}</span><span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} /></span></span>
          <span className="w-10 text-right text-sm font-semibold tabular-nums text-slate-600 dark:text-slate-300">{pct}%</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Link> })}
      </div>
    </section>}

    <section aria-labelledby="practice-h" className="mt-6">
      <h2 id="practice-h" className="text-base font-semibold">Practice and review</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { href: '/prep/progress', icon: TrendingUp, title: 'Mock tests', line: data.mocks[0] ? `Last: ${data.mocks[0].score} out of ${data.mocks[0].maxScore}` : 'Scores and weak areas' },
          { href: '/prep/mistakes', icon: CircleAlert, title: 'Mistakes', line: data.mistakes.filter((m) => !m.resolvedOn).length ? `${data.mistakes.filter((m) => !m.resolvedOn).length} to go over` : 'What tripped you up' },
          { href: '/prep/pyq', icon: FileText, title: 'Past papers', line: 'Year by year' },
          { href: '/prep/notes', icon: NotebookPen, title: 'Notes', line: 'Current affairs' },
          { href: '/prep', icon: ListTree, title: 'Full syllabus', line: 'Every topic, with revision' },
        ].map((o) => <Link key={o.href + o.title} href={o.href} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
          <o.icon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="min-w-0"><span className="block text-sm font-semibold">{o.title}</span><span className="block text-xs text-slate-500">{o.line}</span></span>
        </Link>)}
      </div>
    </section>

    <button type="button" onClick={() => setSetup(true)} className="mt-4 w-full text-center text-sm text-slate-500">{data.profile.reminderEnabled ? `Reminder at ${((data.profile.reminderHour + 11) % 12) + 1}:00 ${data.profile.reminderHour < 12 ? 'AM' : 'PM'}` : 'Reminder off'}. Change</button>

    </>}

    {toastMsg && <button type="button" onClick={() => setToastMsg(null)} role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toastMsg}</button>}
    {orderOpen && <StudyOrderSheet subjects={orderSubjects} order={data.profile.studyOrder} onSave={async (o) => { const ok = await data.saveOrder(o); if (ok) { setDay(0); setToastMsg(o ? 'Your order is saved. Coming up shows the new days.' : 'Back to the syllabus order.') } return ok }} onClose={() => setOrderOpen(false)} />}
    {setup && <PrepSetup templates={data.templates} templateId={data.templateId} profile={data.profile} optionals={optionalSubjects(data.nodes)} onSave={data.saveProfile} onRemove={data.plans.length > 1 && data.templateId ? () => data.removePlan(data.templateId!) : undefined} onClose={() => setSetup(false)} />}
  </main>
}
