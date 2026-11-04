'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookX, CalendarDays, Check, ChevronRight, GraduationCap, Newspaper, PenLine, Plus } from 'lucide-react'
import RecallButton from '@/components/prep/RecallButton'
import { quickWins } from '@/lib/prep/insights'
import { supabase } from '@/utils/supabase'
import { usePrepFeature } from '@/lib/prep/feature'
import { usePrepData } from '@/lib/prep/usePrepData'
import { localDateString } from '@/lib/exams'
import { retention, daysBetween } from '@/lib/prep/revision'
import { preparation } from '@/lib/prep/scoring/v2'
import { planCandidates } from '@/lib/prep/candidates'
import { draftPlan } from '@/lib/prep/plan/v1'
import { optionalSubjects, planFor } from '@/lib/prep/pace'
import MistakeSheet from '@/components/prep/MistakeSheet'
import { examInfo } from '@/lib/prep/exam'
import { usePrepLang } from '@/lib/prep/i18n'
import { studyStreak } from '@/lib/prep/streak'
import QuickLog from '@/components/prep/QuickLog'
import PrepSetup, { EXAM_SHORT } from '@/components/prep/PrepSetup'

/**
 * The aspirant's daily command centre inside Today (beta users only):
 * one snapshot line, up to three revisions due, up to three plan suggestions, and quick log.
 */
export default function PrepTodayCard() {
  const enabled = usePrepFeature()
  const data = usePrepData(enabled)
  const [logOpen, setLogOpen] = useState<{ action?: 'studied' | 'revised'; topic?: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const [mistakeOpen, setMistakeOpen] = useState(false)
  const [, , t] = usePrepLang()
  const [dismissed, setDismissed] = useState(true) // "Not now" on the exam invite, remembered on this device
  useEffect(() => { const id = window.setTimeout(() => { try { setDismissed(window.localStorage.getItem('goalyaar-prep-invite') === 'dismissed') } catch { setDismissed(false) } }, 0); return () => window.clearTimeout(id) }, [])
  const today = localDateString()

  const view = useMemo(() => {
    if (data.status !== 'ready') return null
    const states = [...data.states.values()]
    const overall = preparation(data.nodes, states, today)
    const topics = data.nodes.filter((n) => n.kind === 'topic' && !n.ownerId)
    const due = topics
      .map((n) => ({ n, r: retention(data.states.get(n.id) ?? { nextRevisionOn: null, lastRevisedOn: null, touchedOn: null, intervalDays: null }, today) }))
      .filter(({ r }) => r.status === 'overdue' || r.status === 'due_today')
      .sort((a, b) => b.r.daysOverdue - a.r.daysOverdue || a.n.title.localeCompare(b.n.title))
    const plan = draftPlan(planCandidates(data.nodes, states, today), data.profile.dailyMinutes ?? 120)
      .filter((p) => p.type !== 'revision_overdue' && p.type !== 'revision_due' && p.bucket !== 'can_defer')
    const pace = planFor(data.nodes, data.states, data.profile, today)
    const wins = new Map(quickWins(data.nodes, data.states, today, 50).map((w) => [w.nodeId, w.points]))
    due.sort((a, b) => (wins.get(b.n.id) ?? 0) - (wins.get(a.n.id) ?? 0) || b.r.daysOverdue - a.r.daysOverdue)
    const subs = data.nodes.filter((n) => n.kind === 'subtopic' && !n.ownerId)
    const ticked = subs.filter((n) => data.states.get(n.id)?.touchedOn).length
    return { overall, due, plan, pace, wins, ticked, subtopics: subs.length, streak: studyStreak(data.studyDays, today), touched: overall.touchedTopics, total: topics.length }
  }, [data.status, data.nodes, data.states, data.profile, data.studyDays, today])

  // Remember today's target so the daily reminder can quote it.
  const perDay = view?.pace?.perDay
  const { saveTarget } = data
  useEffect(() => { if (perDay !== undefined) void saveTarget(perDay) }, [perDay, saveTarget])

  if (!enabled || data.status === 'denied' || data.status === 'error') return null
  if (!view) return null
  // Not preparing (yet): one small invitation, which "Not now" hides. Settings can turn it on any time.
  if (!data.profile.saved) {
    if (dismissed) return null
    return <section aria-label="Exam preparation" className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="flex items-center gap-2 text-base font-bold"><GraduationCap className="h-5 w-5 text-amber-600" />Preparing for an exam?</p>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Get a daily study plan and honest progress for UPSC, state PCS, SSC, banking, teaching exams or CAT. Takes a minute.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => { try { window.localStorage.setItem('goalyaar-prep-invite', 'dismissed') } catch { /* shown again next time */ } setDismissed(true) }} className="rounded-xl border border-slate-300 py-2.5 text-sm font-bold dark:border-slate-600">Not now</button>
        <Link href="/prep/start" className="rounded-xl bg-amber-500 py-2.5 text-center text-sm font-bold text-slate-950">Start</Link>
      </div>
    </section>
  }
  if (!data.profile.active) return null

  const { overall, due, plan, pace, streak, wins } = view
  const winBack = due.slice(0, 3).reduce((t, d) => t + (wins.get(d.n.id) ?? 0), 0)
  const weekDays = streak.week.filter((d) => d.studied).length
  const examName = data.template ? EXAM_SHORT[data.template.code] ?? data.template.name : 'UPSC'
  const paceToday = pace && pace.days[0]?.date === today ? pace.days[0].units : []
  const exam = examInfo(data.template?.code)
  const todays = data.events.filter((e) => e.occurredOn === today)
  const readPaper = todays.some((e) => e.kind === 'current_affairs' && e.habit === 'newspaper')
  const answersToday = todays.filter((e) => e.kind === 'answers').reduce((n, e) => n + e.quantity, 0)
  const openMistakes = data.mistakes.filter((m) => !m.resolvedOn)
  const habit = async (key: 'paper' | 'answer') => {
    setBusyId(key)
    let ok: boolean
    if (key === 'paper') ok = await data.logEvent(null, 'current_affairs', { details: { habit: 'newspaper' } })
    else {
      const { error } = await supabase.from('prep_answer_logs').insert({ node_id: null, count: 1, timed: false, written_on: today })
      ok = !error && (await data.logEvent(null, 'answers', { details: { habit: 'answer' } }))
    }
    setBusyId(null)
    flash(ok ? (key === 'paper' ? `${exam.readingHabit} logged.` : 'Answer logged.') : 'Could not save.')
  }
  const paceActive = pace && (pace.status === 'on_track' || pace.status === 'slightly_behind' || pace.status === 'behind')
  const daysToExam = data.profile.examDate ? daysBetween(today, data.profile.examDate) : null
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 3000) }

  return (
    <section aria-label="Preparation" className="mb-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link href="/prep/progress" className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><GraduationCap className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-base font-bold">{t('Preparation')} <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800">Beta</span>{daysToExam !== null && daysToExam >= 0 && <span className="ml-auto text-xs font-semibold text-slate-500">{daysToExam} {t('days to exam')}</span>}</span>
          {overall.value === null
            ? <span className="block text-sm text-slate-500">{view.touched === 0 ? `${examName} syllabus ready: ${view.total} topics. Tick what you have studied.` : `Start ${5 - view.touched} more topic${5 - view.touched === 1 ? '' : 's'} to see your preparation level.`}</span>
            : <span className="block text-sm"><b className="tabular-nums">{view.ticked}</b> <span className="text-slate-500">of {view.subtopics} {t('subtopics')} · {overall.band}</span></span>}
          <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500" aria-label={`Studied ${weekDays} of the last 7 days`}>{streak.week.map((d) => <span key={d.date} className={`h-1.5 w-3 rounded-full ${d.studied ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`} />)}<span className="ml-1">{weekDays}/7 days{streak.current > 1 ? ` · ${streak.current} ${t('day study streak')}` : ''}</span></span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </Link>

      {!data.profile.examDate && <button type="button" onClick={() => setSetupOpen(true)} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left dark:border-slate-800">
        <CalendarDays className="h-5 w-5 shrink-0 text-amber-600" /><span className="min-w-0 flex-1 text-sm"><b>{t('Set your exam date')}</b><span className="block text-xs text-slate-500">{t('Get a daily target and a day-by-day plan.')}</span></span><ChevronRight className="h-4 w-4 text-slate-400" />
      </button>}
      {pace && paceActive && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <Link href="/prep/plan" className="flex items-center gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("Today's target")}</span><span className="ml-auto text-xs font-bold tabular-nums">{Math.min(pace.doneToday, pace.perDay)} / {pace.perDay} {t('subtopics')}</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${pace.perDay ? Math.min(100, Math.round((pace.doneToday / pace.perDay) * 100)) : 0}%` }} /></div>
        {paceToday.length > 0 ? <ul className="mt-2 space-y-1">{paceToday.slice(0, 3).map((u) => <li key={u.id}><label className="flex cursor-pointer items-start gap-2.5 py-0.5">
          <input type="checkbox" checked={false} disabled={busyId !== null} onChange={async () => { setBusyId(u.id); const ok = await data.tick(u.id, true); setBusyId(null); flash(ok ? `Ticked: ${u.title}` : 'Could not save.') }} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />
          <span className="min-w-0 text-sm leading-snug"><span className="line-clamp-1 font-semibold">{u.title}</span><span className="block text-xs text-slate-500">{u.topicTitle}</span></span>
        </label></li>)}</ul>
          : <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("Done for today. Anything extra lowers tomorrow's target.")}</p>}
        {paceToday.length > 3 && <Link href="/prep/plan" className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-300">+{paceToday.length - 3} more in your plan →</Link>}
        {pace.status !== 'on_track' && <p className="mt-1 text-xs text-slate-500">{pace.behindBy} {t('behind schedule, so the target is a little higher.')}</p>}
      </div>}

      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <button type="button" disabled={readPaper || busyId !== null} onClick={() => void habit('paper')} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${readPaper ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-300 dark:border-slate-600'}`}>{readPaper ? <Check className="h-3.5 w-3.5" /> : <Newspaper className="h-3.5 w-3.5" />}{t(exam.readingHabit)}</button>
        {exam.answerWriting && <button type="button" disabled={busyId !== null} onClick={() => void habit('answer')} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${answersToday ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-300 dark:border-slate-600'}`}><PenLine className="h-3.5 w-3.5" />{answersToday ? `${answersToday} answer${answersToday === 1 ? '' : 's'} · +1` : t('Answer written')}</button>}
        <button type="button" onClick={() => setMistakeOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold dark:border-slate-600"><BookX className="h-3.5 w-3.5" />{t('Mistake')}</button>
        {openMistakes.length > 0 && <Link href="/prep/mistakes" className="flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{openMistakes.length} {t('to revisit')} →</Link>}
      </div>

      {due.length > 0 && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">{t('Revise today')}{winBack > 0 ? ` · win back ${winBack} point${winBack === 1 ? '' : 's'}` : ''}{due.length > 3 ? ` · ${due.length} due` : ''}</p>
        <ul className="space-y-2">{due.slice(0, 3).map(({ n, r }) => <li key={n.id} className="flex items-center gap-3">
          <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-semibold">{n.title}</span><span className="block text-xs text-slate-500">{r.status === 'due_today' ? t('Due today') : `${r.daysOverdue} ${t('days overdue')}`}{wins.get(n.id) ? <b className="text-emerald-700 dark:text-emerald-400"> · +{wins.get(n.id)}</b> : null}</span></span>
          <RecallButton disabled={busyId === n.id} label={t('Revised')} onPick={async (recall) => { setBusyId(n.id); const ok = await data.logEvent(n.id, 'revised', { details: { recall } }); setBusyId(null); flash(ok ? (recall === 'little' ? `Saved. ${n.title} comes back in 3 days.` : `Revised: ${n.title}`) : 'Could not save.') }} />
        </li>)}</ul>
        {due.length > 3 && <Link href="/prep?filter=due" className="mt-2 block text-xs font-bold text-slate-600 dark:text-slate-300">See all {due.length} →</Link>}
      </div>}

      {!paceActive && plan.length > 0 && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('Suggested next')}</p>
        <ul className="space-y-2">{plan.slice(0, 3).map((p) => <li key={p.nodeId} className="flex items-center gap-3">
          <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-semibold">{p.title}</span><span className="block text-xs text-slate-500">{p.reason} ~{p.minutes} min</span></span>
          <button type="button" onClick={() => setLogOpen({ action: 'studied', topic: p.nodeId })} className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white dark:bg-slate-50 dark:text-slate-900">Done</button>
        </li>)}</ul>
        <p className="mt-2 text-[11px] text-slate-500">Suggestions only. Nothing is added to your day until you log it.</p>
      </div>}

      {data.pending > 0 && <p className="border-t border-slate-100 px-4 py-2 text-xs font-semibold text-slate-500 dark:border-slate-800">{data.pending} saved on this phone · will sync when you are back online</p>}
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <button type="button" onClick={() => setLogOpen({})} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 shadow-sm"><Plus className="h-4 w-4" />{t('Quick log')}</button>
        <Link href={data.profile.examDate ? '/prep/plan' : '/prep'} className="flex items-center justify-center rounded-xl border border-slate-300 py-2.5 text-sm font-bold dark:border-slate-600">{data.profile.examDate ? t('My plan') : t('Syllabus')}</Link>
      </div>

      {mistakeOpen && <MistakeSheet nodes={data.nodes} onSave={async (m) => { const ok = await data.addMistake(m); if (ok) flash('Added to your mistake notebook.'); return ok }} onClose={() => setMistakeOpen(false)} />}
      {setupOpen && <PrepSetup templates={data.templates} templateId={data.templateId} profile={data.profile} optionals={optionalSubjects(data.nodes)} onSave={data.saveProfile} onClose={() => setSetupOpen(false)} />}
      {logOpen && <QuickLog nodes={data.nodes} states={data.states} examCode={data.template?.code} initialAction={logOpen.action} initialTopic={logOpen.topic} onClose={() => setLogOpen(null)} onLogged={flash} logEvent={data.logEvent} />}
      {toast && <div role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toast}</div>}
    </section>
  )
}
