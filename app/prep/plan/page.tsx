'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, ChevronDown, HelpCircle, RotateCcw, Settings2 } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { optionalSubjects, planFor, type PacePlan, type Unit } from '@/lib/prep/pace'
import { retention } from '@/lib/prep/revision'
import { usePrepData } from '@/lib/prep/usePrepData'
import PrepSetup, { EXAM_SHORT } from '@/components/prep/PrepSetup'
import PrepNav from '@/components/prep/PrepNav'
import HelpButton from '@/components/HelpButton'
import ExamSwitcher from '@/components/prep/ExamSwitcher'
import StudyTimer from '@/components/prep/StudyTimer'
import { examInfo } from '@/lib/prep/exam'
import { usePrepLang } from '@/lib/prep/i18n'

const MIN_PER_SUBTOPIC = 40 // rough time for one study sitting; used only for the "is this realistic?" check
const STATUS: Record<PacePlan['status'], [string, string]> = {
  on_track: ['On track', 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'],
  slightly_behind: ['Slightly behind', 'bg-amber-500/15 text-amber-800 dark:text-amber-300'],
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

/** The time-bound plan: how many subtopics a day to finish by the exam date, and exactly which ones. */
export default function PrepPlanPage() {
  const data = usePrepData(true)
  const router = useRouter()
  const [setup, setSetup] = useState(false)
  const [why, setWhy] = useState(false)
  const [ahead, setAhead] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [, , t] = usePrepLang()
  const today = localDateString()

  const plan = useMemo(() => (data.status === 'ready' ? planFor(data.nodes, data.states, data.profile, today) : null), [data.status, data.nodes, data.states, data.profile, today])
  const dueCount = useMemo(() => data.nodes.filter((n) => n.kind === 'topic' && !n.ownerId).filter((n) => { const s = data.states.get(n.id); const r = s ? retention(s, today) : null; return r?.status === 'overdue' || r?.status === 'due_today' }).length, [data.nodes, data.states, today])

  // Remember today's target for the reminder.
  const { saveTarget } = data
  const perDay = plan?.perDay
  useEffect(() => { if (perDay !== undefined) void saveTarget(perDay) }, [perDay, saveTarget])
  // First visit: open setup straight away.
  const needsSetup = data.status === 'ready' && !data.profile.saved
  // First visit: the step-by-step setup instead of a sheet.
  useEffect(() => { if (needsSetup) router.replace('/prep/start') }, [needsSetup, router])
  // Arriving from setup: a one-line welcome that explains the screen.
  const [welcome, setWelcome] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => setWelcome(new URLSearchParams(window.location.search).get('welcome') === '1'), 0); return () => window.clearTimeout(t) }, [])

  if (data.status === 'loading') return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3].map((k) => <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (data.status !== 'ready') return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">{data.status === 'denied' ? 'Not available yet' : "Couldn't load your plan"}</h1><Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Back to Today</Link></div></main>

  const examName = data.template ? EXAM_SHORT[data.template.code] ?? data.template.name : 'Your exam'
  const stageName = examInfo(data.template?.code).stageName[data.profile.targetStage]
  const tick = async (u: Unit, on: boolean) => { if (busy) return; setBusy(u.id); await data.tick(u.id, on); setBusy(null) }
  const unitRow = (u: Unit) => {
    const on = Boolean(data.states.get(u.id)?.touchedOn)
    return <li key={u.id}><label className="flex cursor-pointer items-start gap-3 px-4 py-2.5">
      <input type="checkbox" checked={on} disabled={busy !== null} onChange={() => void tick(u, !on)} className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" />
      <span className="min-w-0"><span className={`block text-sm font-semibold leading-snug ${on ? 'text-slate-500 line-through decoration-slate-300' : ''}`}>{u.title}</span><span className="block text-xs text-slate-500">{u.topicTitle === u.title ? u.paperTitle : u.topicTitle}</span></span>
    </label></li>
  }

  const todayUnits = plan?.days[0]?.date === today ? plan.days[0].units : []
  const doneTodayUnits = plan ? plan.units.filter((u) => data.states.get(u.id)?.touchedOn === today) : []
  const targetMet = plan ? plan.doneToday >= plan.perDay && plan.perDay > 0 : false
  const hoursNeeded = plan ? (plan.perDay * MIN_PER_SUBTOPIC) / 60 : 0
  const hoursAvailable = (data.profile.dailyMinutes ?? 0) / 60

  return <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center gap-3">
      <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
      <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">{t('My plan')}</h1><p className="text-sm text-slate-500">{examName} {stageName}{data.profile.examDate ? ` · by ${new Date(`${data.profile.examDate}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p></div>
      <HelpButton />
      <button type="button" onClick={() => setSetup(true)} aria-label="Change plan" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Settings2 className="h-4 w-4" /></button>
    </header>
    <PrepNav active="/prep/plan" />
      <ExamSwitcher plans={data.plans} current={data.templateId} onPick={data.setView} />
    {welcome && plan && <section className="mb-3 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200">
      <p className="font-bold">Your plan is ready.</p>
      <p className="mt-1">Each day, tick the subtopics below as you study them. Revise when reminded. That is all you need to do; everything else updates itself.</p>
      <button type="button" onClick={() => setWelcome(false)} className="mt-2 text-xs font-bold underline">Got it</button>
    </section>}

    {!plan
      ? <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CalendarDays className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="mt-2 text-lg">How long do you have?</h2>
          <p className="mt-1 text-sm text-slate-500">Tell us your exam date and we will work out how many subtopics to finish each day, and which ones.</p>
          <button type="button" onClick={() => setSetup(true)} className="mt-4 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950">Set my target</button>
        </section>
      : <>
        <section data-guide="plan-target" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {plan.status === 'complete' ? <p className="text-2xl font-extrabold">All {plan.total} covered</p>
                : plan.status === 'revision_window' || plan.status === 'past' ? <p className="text-2xl font-extrabold">{plan.remaining} left</p>
                : <p className="text-3xl font-extrabold tabular-nums">{plan.perDay} <span className="text-base font-bold text-slate-500">{t('subtopics a day')}</span></p>}
              <p className="mt-1 text-sm text-slate-500">{plan.daysLeft >= 0 ? `${plan.daysLeft} ${t('days left')}` : 'Exam date has passed'}{plan.remaining > 0 ? ` · about ${Math.round((plan.remaining * MIN_PER_SUBTOPIC) / 60)} h of study` : ''}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[plan.status][1]}`}>{t(STATUS[plan.status][0])}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${plan.total ? Math.round((plan.done / plan.total) * 100) : 0}%` }} /></div>
          <p className="mt-1.5 text-xs text-slate-500"><b className="tabular-nums text-slate-700 dark:text-slate-200">{plan.done}</b> of {plan.total} {stageName} subtopics ticked{plan.behindBy > 0 && plan.status !== 'complete' ? ` · ${plan.behindBy} behind schedule` : ''}</p>
          <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="mt-2 flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"><HelpCircle className="h-4 w-4" />{t('How is this worked out?')}</button>
          {why && <ul className="mt-2 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">{plan.reasons.map((r) => <li key={r}>{r}</li>)}<li><Link href="/prep/how" className="font-bold underline">How every number is worked out</Link></li><li>The target is recalculated every day: miss a day and it rises a little, get ahead and it falls.</li>{plan.revisionDays > 0 && <li>The last {plan.revisionDays} days before the exam are kept for revision.</li>}<li>Hours assume about {MIN_PER_SUBTOPIC} minutes a subtopic; treat them as a rough guide.</li><li>{data.profile.optionalSubjectId ? 'Your optional subject is included in the Mains plan.' : 'Optional papers are left out until you pick your optional in settings.'}</li></ul>}
          {(plan.status === 'behind' || plan.status === 'slightly_behind') && <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
            <p className="text-sm">{t('Fell behind? It happens to everyone. Start fresh and spread what is left evenly over the days remaining.')}</p>
            <button type="button" disabled={busy !== null} onClick={async () => { setBusy('fresh'); await data.saveProfile({ planStartOn: today }); setBusy(null) }} className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 dark:bg-slate-50 dark:text-slate-900">{t('Start fresh from today')}</button>
          </div>}
          {plan.perDay > 0 && hoursAvailable > 0 && hoursNeeded > hoursAvailable * 0.8 && plan.status !== 'complete' && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-300">At about {MIN_PER_SUBTOPIC} minutes a subtopic, this needs roughly {hoursNeeded.toFixed(1)} hours of new study a day plus revision, against your {hoursAvailable} hours. A later date or a few more hours would make it realistic.</p>}
        </section>

        {plan.status !== 'complete' && plan.status !== 'past' && plan.status !== 'revision_window' && <section data-guide="plan-today" className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between px-4 pt-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('Today')}</p><p className="text-xs font-bold tabular-nums text-slate-600 dark:text-slate-300">{Math.min(plan.doneToday, plan.perDay)} / {plan.perDay} {t('done')}</p></div>
          {targetMet && <p className="mx-4 mt-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Today&apos;s target is done. Anything extra lowers tomorrow&apos;s.</p>}
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">{doneTodayUnits.map(unitRow)}{todayUnits.map(unitRow)}</ul>
          {targetMet && plan.days[1] && <button type="button" onClick={() => setAhead(!ahead)} className="mx-4 mb-3 mt-1 text-xs font-bold text-amber-700 dark:text-amber-400">{ahead ? 'Hide' : 'Get ahead: show tomorrow’s'}</button>}
          {ahead && plan.days[1] && <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">{plan.days[1].units.map(unitRow)}</ul>}
          {dueCount > 0 && <Link href="/prep?filter=due" className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-slate-800 dark:text-rose-400"><RotateCcw className="h-4 w-4" />Plus {dueCount} revision{dueCount === 1 ? '' : 's'} due →</Link>}
        </section>}

        {plan.status !== 'complete' && <StudyTimer units={[...todayUnits, ...(plan.days[1]?.units ?? [])].slice(0, 8)} onFinish={async (u, minutes, tickIt) => {
          const ok = tickIt ? await data.tick(u.id, true, minutes) : await data.logEvent(null, 'studied', { minutes, details: { timer: true, unit: u.id } })
          setToastMsg(ok ? `${minutes} min saved${tickIt ? ' and ticked' : ''}.` : 'Could not save.')
        }} />}

        {plan.status === 'revision_window' && <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">You are in your revision window. Focus on revising what you have covered and on mocks; {plan.remaining} subtopics are still unticked. <Link href="/prep?filter=due" className="font-bold text-amber-700 dark:text-amber-400">Revisions due →</Link></section>}

        {plan.days.length > 1 && plan.status !== 'complete' && <details className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold [&::-webkit-details-marker]:hidden"><CalendarDays className="h-4 w-4 text-slate-400" />{t('Next few days')}<ChevronDown className="ml-auto h-4 w-4 text-slate-400" /></summary>
          <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">{plan.days.slice(1).map((d) => <div key={d.date} className="px-4 py-2.5">
            <p className="text-xs font-bold text-slate-500">{dayLabel(d.date, today)} · {d.units.length}</p>
            <p className="mt-0.5 text-sm leading-snug">{d.units.map((u) => u.title).join(' · ')}</p>
          </div>)}</div>
          <p className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800">Follows the syllabus order. Tick subtopics out of order any time; the plan adjusts.</p>
        </details>}
      </>}

    <button type="button" onClick={() => setSetup(true)} className="mt-4 w-full text-center text-sm text-slate-500">{data.profile.reminderEnabled ? `Reminder at ${((data.profile.reminderHour + 11) % 12) + 1}:00 ${data.profile.reminderHour < 12 ? 'AM' : 'PM'}` : 'Reminder off'} · Change</button>

    {toastMsg && <button type="button" onClick={() => setToastMsg(null)} role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toastMsg}</button>}
    {setup && <PrepSetup templates={data.templates} templateId={data.templateId} profile={data.profile} optionals={optionalSubjects(data.nodes)} onSave={data.saveProfile} onRemove={data.plans.length > 1 && data.templateId ? () => data.removePlan(data.templateId!) : undefined} onClose={() => setSetup(false)} />}
  </main>
}
