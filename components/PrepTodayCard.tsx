'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookX, CalendarDays, Check, ChevronRight, Flame, GraduationCap, Newspaper, PenLine, Plus, RotateCcw, TrendingDown } from 'lucide-react'
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
    return { overall, due, plan, pace, streak: studyStreak(data.studyDays, today), touched: overall.touchedTopics, total: topics.length }
  }, [data.status, data.nodes, data.states, data.profile, data.studyDays, today])

  // Remember today's target so the daily reminder can quote it.
  const perDay = view?.pace?.perDay
  const { saveTarget } = data
  useEffect(() => { if (perDay !== undefined) void saveTarget(perDay) }, [perDay, saveTarget])

  if (!enabled || data.status === 'denied') return null
  if (!view) return <div className="mt-3 h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" aria-busy="true" />

  const { overall, due, plan, pace, streak } = view
  const examName = data.template ? EXAM_SHORT[data.template.code] ?? data.template.name : 'UPSC'
  const paceToday = pace && pace.days[0]?.date === today ? pace.days[0].units : []
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
    flash(ok ? (key === 'paper' ? 'Newspaper logged.' : 'Answer logged.') : 'Could not save.')
  }
  const paceActive = pace && (pace.status === 'on_track' || pace.status === 'slightly_behind' || pace.status === 'behind')
  const lost = overall.value !== null && overall.peak !== null ? overall.peak - overall.value : 0
  const daysToExam = data.profile.examDate ? daysBetween(today, data.profile.examDate) : null
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 3000) }

  return (
    <section aria-label="Preparation" className="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <Link href="/prep/progress" className="flex items-center gap-3 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><GraduationCap className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-base font-bold">Preparation <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800">Beta</span>{daysToExam !== null && daysToExam >= 0 && <span className="ml-auto text-xs font-semibold text-slate-500">{daysToExam} days to exam</span>}</span>
          {overall.value === null
            ? <span className="block text-sm text-slate-500">{view.touched === 0 ? `${examName} syllabus ready: ${view.total} topics. Tick what you have studied.` : `Start ${5 - view.touched} more topic${5 - view.touched === 1 ? '' : 's'} to see your preparation level.`}</span>
            : <span className="block text-sm"><b>{overall.band}</b> <span className="text-slate-500">· index {overall.value} · {view.touched} of {view.total} topics</span></span>}
          {lost > 0 && <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400"><TrendingDown className="h-3.5 w-3.5" />{lost} point{lost === 1 ? '' : 's'} lost to {overall.overdueTopics} overdue revision{overall.overdueTopics === 1 ? '' : 's'}</span>}
          {streak.current > 0 && <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400"><Flame className="h-3.5 w-3.5" />{streak.current}-day study streak{streak.studiedToday ? '' : ' · log today to keep it'}</span>}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
      </Link>

      {!data.profile.examDate && <button type="button" onClick={() => setSetupOpen(true)} className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left dark:border-slate-800">
        <CalendarDays className="h-5 w-5 shrink-0 text-amber-600" /><span className="min-w-0 flex-1 text-sm"><b>Set your exam date</b><span className="block text-xs text-slate-500">Get a daily target and a day-by-day plan.</span></span><ChevronRight className="h-4 w-4 text-slate-400" />
      </button>}
      {pace && paceActive && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <Link href="/prep/plan" className="flex items-center gap-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s target</span><span className="ml-auto text-xs font-bold tabular-nums">{Math.min(pace.doneToday, pace.perDay)} / {pace.perDay} subtopics</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${pace.perDay ? Math.min(100, Math.round((pace.doneToday / pace.perDay) * 100)) : 0}%` }} /></div>
        {paceToday.length > 0 ? <ul className="mt-2 space-y-1">{paceToday.slice(0, 3).map((u) => <li key={u.id}><label className="flex cursor-pointer items-start gap-2.5 py-0.5">
          <input type="checkbox" checked={false} disabled={busyId !== null} onChange={async () => { setBusyId(u.id); const ok = await data.tick(u.id, true); setBusyId(null); flash(ok ? `Ticked: ${u.title}` : 'Could not save.') }} className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500" />
          <span className="min-w-0 text-sm leading-snug"><span className="line-clamp-1 font-semibold">{u.title}</span><span className="block text-xs text-slate-500">{u.topicTitle}</span></span>
        </label></li>)}</ul>
          : <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Done for today. Anything extra lowers tomorrow&apos;s target.</p>}
        {paceToday.length > 3 && <Link href="/prep/plan" className="mt-1 block text-xs font-bold text-slate-600 dark:text-slate-300">+{paceToday.length - 3} more in your plan →</Link>}
        {pace.status !== 'on_track' && <p className="mt-1 text-xs text-slate-500">{pace.behindBy} behind schedule, so the target is a little higher.</p>}
      </div>}

      <div className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <button type="button" disabled={readPaper || busyId !== null} onClick={() => void habit('paper')} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${readPaper ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-300 dark:border-slate-600'}`}>{readPaper ? <Check className="h-3.5 w-3.5" /> : <Newspaper className="h-3.5 w-3.5" />}Newspaper</button>
        <button type="button" disabled={busyId !== null} onClick={() => void habit('answer')} className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${answersToday ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-slate-300 dark:border-slate-600'}`}><PenLine className="h-3.5 w-3.5" />{answersToday ? `${answersToday} answer${answersToday === 1 ? '' : 's'} · +1` : 'Answer written'}</button>
        <button type="button" onClick={() => setMistakeOpen(true)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-bold dark:border-slate-600"><BookX className="h-3.5 w-3.5" />Mistake</button>
        {openMistakes.length > 0 && <Link href="/prep/mistakes" className="flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{openMistakes.length} to revisit →</Link>}
      </div>

      {due.length > 0 && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400">Revise today{due.length > 3 ? ` · ${due.length} due` : ''}</p>
        <ul className="space-y-2">{due.slice(0, 3).map(({ n, r }) => <li key={n.id} className="flex items-center gap-3">
          <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-semibold">{n.title}</span><span className="block text-xs text-slate-500">{r.status === 'due_today' ? 'Due today' : `${r.daysOverdue} day${r.daysOverdue === 1 ? '' : 's'} overdue`}</span></span>
          <button type="button" disabled={busyId === n.id} onClick={async () => { setBusyId(n.id); const ok = await data.logEvent(n.id, 'revised'); setBusyId(null); flash(ok ? `Revised: ${n.title}` : 'Could not save.') }} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold disabled:opacity-50 dark:border-slate-600"><RotateCcw className="h-3.5 w-3.5" />Revised</button>
        </li>)}</ul>
        {due.length > 3 && <Link href="/prep?filter=due" className="mt-2 block text-xs font-bold text-slate-600 dark:text-slate-300">See all {due.length} →</Link>}
      </div>}

      {!paceActive && plan.length > 0 && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Suggested next</p>
        <ul className="space-y-2">{plan.slice(0, 3).map((p) => <li key={p.nodeId} className="flex items-center gap-3">
          <span className="min-w-0 flex-1"><span className="line-clamp-1 text-sm font-semibold">{p.title}</span><span className="block text-xs text-slate-500">{p.reason} ~{p.minutes} min</span></span>
          <button type="button" onClick={() => setLogOpen({ action: 'studied', topic: p.nodeId })} className="shrink-0 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white dark:bg-slate-50 dark:text-slate-900">Done</button>
        </li>)}</ul>
        <p className="mt-2 text-[11px] text-slate-500">Suggestions only. Nothing is added to your day until you log it.</p>
      </div>}

      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 dark:border-slate-800">
        <button type="button" onClick={() => setLogOpen({})} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 shadow-sm"><Plus className="h-4 w-4" />Quick log</button>
        <Link href={data.profile.examDate ? '/prep/plan' : '/prep'} className="flex items-center justify-center rounded-xl border border-slate-300 py-2.5 text-sm font-bold dark:border-slate-600">{data.profile.examDate ? 'My plan' : 'Syllabus'}</Link>
      </div>

      {mistakeOpen && <MistakeSheet nodes={data.nodes} onSave={async (m) => { const ok = await data.addMistake(m); if (ok) flash('Added to your mistake notebook.'); return ok }} onClose={() => setMistakeOpen(false)} />}
      {setupOpen && <PrepSetup templates={data.templates} templateId={data.templateId} profile={data.profile} optionals={optionalSubjects(data.nodes)} onSave={data.saveProfile} onClose={() => setSetupOpen(false)} />}
      {logOpen && <QuickLog nodes={data.nodes} states={data.states} initialAction={logOpen.action} initialTopic={logOpen.topic} onClose={() => setLogOpen(null)} onLogged={flash} logEvent={data.logEvent} />}
      {toast && <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toast}</div>}
    </section>
  )
}
