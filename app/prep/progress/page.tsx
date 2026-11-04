'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, TrendingDown } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { usePrepData } from '@/lib/prep/usePrepData'
import { coverage, preparation, SCORING_VERSION, type Readiness } from '@/lib/prep/scoring/v2'
import { csatSafety } from '@/lib/prep/scoring/v1'
import { addDays, daysBetween } from '@/lib/prep/revision'
import type { Indicator } from '@/lib/prep/types'
import QuickLog from '@/components/prep/QuickLog'
import { weakTopics, weekReview, mistakeSummary, type WeekStats } from '@/lib/prep/insights'
import { studyStreak } from '@/lib/prep/streak'
import { examInfo, mockTrend } from '@/lib/prep/exam'
import MentorShare from '@/components/prep/MentorShare'
import AnswerReviews from '@/components/prep/AnswerReviews'
import PrepNav from '@/components/prep/PrepNav'
import PrepSetup from '@/components/prep/PrepSetup'
import { optionalSubjects } from '@/lib/prep/pace'

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'
const COVERAGE_LABEL: Record<string, string> = { syllabus_touched: 'Subtopics studied', foundation_completed: 'Topics completed', evidence_backed: 'Evidence-backed', revision_current: 'Revision current' }
const STAGE_NAME: Record<string, string> = { prelims_gs: 'Prelims GS', csat: 'CSAT', mains: 'Mains', optional: 'Optional', other: 'Other' }

interface Snapshot { computed_on: string; metrics: { overall: number | null } }

/** Preparation progress: every measure separately, each with "Why?". Nothing here is a guarantee. */
export default function PrepProgressPage() {
  const router = useRouter()
  const data = usePrepData(true)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [setupOpen, setSetupOpen] = useState(false)
  const today = localDateString()

  // Not set up yet: start with the step-by-step setup.
  useEffect(() => { if (data.status === 'ready' && !data.profile.saved) router.replace('/prep/start') }, [data.status, data.profile.saved, router])
  useEffect(() => { if (data.status === 'denied') router.replace('/dashboard') }, [data.status, router])

  const view = useMemo(() => {
    if (data.status !== 'ready') return null
    const states = [...data.states.values()]
    const official = data.nodes.filter((n) => !n.ownerId)
    const chosen = data.profile.optionalSubjectId
    const optionalNodes = official.filter((n) => n.papers.some((p) => p === 'OPT1' || p === 'OPT2')).filter((n) => !chosen || n.id === chosen || n.parentId === chosen)
    const withSubs = new Set(official.filter((n) => n.kind === 'subtopic').map((n) => n.parentId))
    const units = new Set(official.filter((n) => n.kind === 'subtopic' || n.kind === 'ncert_book' || (n.kind === 'topic' && !withSubs.has(n.id))).map((n) => n.id))
    const optionalTouched = optionalNodes.some((n) => data.states.get(n.id)?.touchedOn)
    const weekStart = addDays(today, -6), lastWeekStart = addDays(today, -13)
    const answersThisWeek = data.answers.filter((a) => a.writtenOn >= weekStart).reduce((s, a) => s + a.count, 0)
    const answersLastWeek = data.answers.filter((a) => a.writtenOn >= lastWeekStart && a.writtenOn < weekStart).reduce((s, a) => s + a.count, 0)
    const byPaper = new Map<string, number>()
    for (const a of data.answers) byPaper.set(a.paper ?? 'Unlinked', (byPaper.get(a.paper ?? 'Unlinked') ?? 0) + a.count)
    return {
      overall: preparation(official, states, today),
      prelims: preparation(official, states, today, 'prelims'),
      mains: preparation(official.filter((n) => !optionalNodes.includes(n)), states, today, 'mains'),
      optional: optionalTouched ? preparation(optionalNodes, states, today, 'mains') : null,
      coverage: coverage(official, states, today),
      csat: data.mocks.some((m) => m.stage === 'csat') ? csatSafety(data.mocks, today) : null,
      week: weekReview(data.events, units, today),
      weak: weakTopics(data.nodes, data.states, data.mistakes),
      mistakes: mistakeSummary(data.mistakes),
      streak: studyStreak(data.studyDays, today),
      interview: preparation(official, states, today, 'interview'),
      trend: mockTrend(data.mocks),
      answers: { total: data.answers.reduce((s, a) => s + a.count, 0), thisWeek: answersThisWeek, lastWeek: answersLastWeek, timed: data.answers.filter((a) => a.timed).reduce((s, a) => s + a.count, 0), reviewed: data.answers.filter((a) => a.mentorReviewed).reduce((s, a) => s + a.count, 0), byPaper: [...byPaper.entries()].sort((a, b) => b[1] - a[1]) },
    }
  }, [data.status, data.nodes, data.states, data.mocks, data.answers, data.events, data.mistakes, data.studyDays, data.profile.optionalSubjectId, today])

  // Keep one snapshot per day so the trend line builds up over time.
  useEffect(() => {
    if (!view || !data.userId) return
    const metrics = { overall: view.overall.value, prelims: view.prelims.value, mains: view.mains.value, touched: view.coverage[0].value, overdue: view.overall.overdueTopics }
    void supabase.from('prep_score_snapshots').upsert({ user_id: data.userId, computed_on: today, algorithm_version: SCORING_VERSION, metrics, explanations: { overall: view.overall.reasons } }, { onConflict: 'user_id,computed_on,algorithm_version' })
      .then(() => supabase.from('prep_score_snapshots').select('computed_on,metrics').eq('algorithm_version', SCORING_VERSION).gte('computed_on', addDays(today, -29)).order('computed_on'))
      .then(({ data: rows }) => setHistory((rows ?? []) as Snapshot[]), () => undefined)
  }, [view, data.userId, today])

  if (data.status === 'loading' || !view) return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3].map((k) => <div key={k} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (data.status === 'error') return <main className="mx-auto grid min-h-[60vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">Couldn&apos;t load your progress</h1><button onClick={() => void data.reload()} className="mt-4 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Try again</button></div></main>

  const { overall } = view
  const exam = examInfo(data.template?.code)
  const lost = overall.value !== null && overall.peak !== null ? overall.peak - overall.value : 0
  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 3000); void data.reload() }
  const maxHistory = Math.max(1, ...history.map((h) => h.metrics.overall ?? 0))
  const daysToExam = data.profile.examDate ? daysBetween(today, data.profile.examDate) : null

  return (
    <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Preparation</h1><p className="text-sm text-slate-500">{data.template?.name ?? 'Your exam'}{daysToExam !== null && daysToExam >= 0 ? ` · ${daysToExam} days to exam` : ''}</p></div>
      </header>
      <PrepNav active="/prep/progress" />

      {/* Headline: band first, number second, with what overdue revision is costing */}
      <section className={card}>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Current preparation</p>
        {overall.value === null
          ? <><p className="mt-1 text-2xl font-extrabold">Not enough evidence yet</p><p className="mt-1 text-sm text-slate-500">{overall.reasons[0].replace('Not enough evidence: ', '')} Log topics as you study them.</p></>
          : <>
            <p className="mt-1 text-3xl font-extrabold tracking-tight">{overall.band}</p>
            <p className="text-sm text-slate-500">Index {overall.value} of 95 · {overall.touchedTopics} of {overall.totalTopics} topics touched</p>
            {lost > 0 && <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2.5 text-sm text-rose-800 dark:text-rose-300"><TrendingDown className="mt-0.5 h-4 w-4 shrink-0" /><span>{overall.overdueTopics} overdue revision{overall.overdueTopics === 1 ? ' is' : 's are'} costing you <b>{lost} point{lost === 1 ? '' : 's'}</b>. Revise to get back to {overall.peak}. <Link href="/prep?filter=due" className="font-bold underline">See them</Link></span></div>}
          </>}
        <Why reasons={overall.reasons} />
        <Link href="/prep/how" className="mt-1 inline-block text-xs font-bold text-slate-600 underline dark:text-slate-300">How every number is worked out</Link>
        {history.length > 1 && <div className="mt-3">
          <p className="text-xs font-semibold text-slate-500">Last {history.length} days</p>
          <div className="mt-1 flex h-14 items-end gap-[2px]" role="img" aria-label={`Preparation index over ${history.length} days`}>
            {history.map((h) => <span key={h.computed_on} title={`${h.computed_on}: ${h.metrics.overall ?? 'not enough evidence'}`} className="flex h-full flex-1 items-end"><span className="block w-full rounded-t-[3px] bg-amber-500" style={{ height: `${h.metrics.overall === null ? 0 : Math.max(4, (h.metrics.overall / maxHistory) * 100)}%` }} /></span>)}
          </div>
        </div>}
      </section>

      {/* This week vs last week */}
      <section className={`${card} mt-3`}>
        <div className="flex items-center justify-between"><h2 className="text-base">This week</h2><span className="text-xs font-semibold text-slate-500">{view.streak.current > 0 ? `${view.streak.current}-day streak` : 'No streak yet'}</span></div>
        <div className="mt-2 flex gap-1" aria-label="Study days this week">{view.streak.week.map((d) => <span key={d.date} title={d.date} className={`h-2 flex-1 rounded-full ${d.studied ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`} />)}</div>
        <div className="mt-3 grid grid-cols-3 gap-2">{WEEK_ROWS.map(([key, label]) => <WeekCell key={key} label={label} now={view.week.thisWeek[key]} before={view.week.lastWeek[key]} />)}</div>
        <p className="mt-2 text-[11px] text-slate-500">Compared with the 7 days before. One rest day a week does not break your streak.</p>
      </section>

      {/* Stage readiness, each separate */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {exam.targetStages.length === 1
          ? <><Stage title={exam.stageName.prelims} r={view.prelims} /><Stage title="WAT · GD · PI" r={view.interview} /></>
          : <><Stage title={exam.stageName.prelims} r={view.prelims} /><Stage title={exam.stageName.mains} r={view.mains} /></>}
        {view.optional && exam.targetStages.length > 1 && <Stage title="Optional" r={view.optional} />}
        {view.csat && <section className={card}>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">CSAT safety</p>
          <p className="mt-1 text-lg font-extrabold">{view.csat.status === 'safe' ? 'Safe' : view.csat.status === 'borderline' ? 'Borderline' : view.csat.status === 'at_risk' ? 'At risk' : 'Not enough evidence'}</p>
          <Why reasons={view.csat.reasons} />
        </section>}
      </div>

      {/* Coverage is separate from preparation and never goes down */}
      <section className={`${card} mt-3`}>
        <h2 className="text-base">Syllabus coverage</h2>
        <p className="text-xs text-slate-500">From the subtopics you tick. Coverage never goes down; only preparation fades when revision is overdue.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">{view.coverage.map((c) => <Metric key={c.key} label={COVERAGE_LABEL[c.key]} ind={c} />)}</div>
      </section>

      {/* What needs attention */}
      {(view.weak.length > 0 || view.mistakes.topTypes.length > 0) && <section className={`${card} mt-3`}>
        <h2 className="text-base">Needs attention</h2>
        {view.weak.length > 0 && <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{view.weak.map((w) => <li key={w.nodeId}><Link href={`/prep?topic=${w.nodeId}`} className="block py-2"><span className="block text-sm font-semibold">{w.title}</span><span className="block text-xs text-slate-500">{w.reasons.join(' ')}</span></Link></li>)}</ul>}
        {view.mistakes.topTypes.length > 0 && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Commonest mistake: <b>{view.mistakes.topTypes[0].label}</b> ({view.mistakes.topTypes[0].count}). <Link href="/prep/mistakes" className="font-bold underline">{view.mistakes.open.length} to revisit</Link></p>}
      </section>}

      {/* Answer writing */}
      <section className={`${card} mt-3`}>
        <h2 className="text-base">Answer writing</h2>
        {view.answers.total === 0
          ? <p className="mt-1 text-sm text-slate-500">No answers logged yet. Log them with Quick log → Answers written.</p>
          : <>
            <p className="mt-1 text-sm">{view.answers.total} answers in total · <b>{view.answers.thisWeek}</b> this week{view.answers.lastWeek ? ` (last week ${view.answers.lastWeek})` : ''}.</p>
            <p className="text-sm text-slate-500">{view.answers.timed} timed · {view.answers.reviewed} mentor-reviewed</p>
            <div className="mt-2 flex flex-wrap gap-1.5">{view.answers.byPaper.map(([paper, n]) => <span key={paper} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold dark:bg-slate-800">{paper.replace('ESSAY', 'Essay')}: {n}</span>)}</div>
            {view.answers.thisWeek < view.answers.lastWeek && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{view.answers.lastWeek - view.answers.thisWeek} more this week matches last week&apos;s rhythm.</p>}
          </>}
      </section>

      {/* Mocks */}
      <section className={`${card} mt-3`}>
        <h2 className="text-base">Mock tests</h2>
        {data.mocks.length === 0
          ? <p className="mt-1 text-sm text-slate-500">No mocks logged yet. Add one with Quick log → Mock test.</p>
          : <>
            {view.trend.points.length >= 2 && <div className="mt-2">
              <div className="flex items-end justify-between"><p className="text-xs font-semibold text-slate-500">Score % over your last {Math.min(12, view.trend.points.length)} mocks</p>{view.trend.change !== null && <p className={`text-xs font-bold ${view.trend.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : view.trend.change < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{view.trend.change > 0 ? '+' : ''}{view.trend.change} pts vs your first mocks</p>}</div>
              <div className="mt-1 flex h-16 items-end gap-1" role="img" aria-label="Mock score trend">{view.trend.points.slice(-12).map((p, i) => <span key={i} title={`${p.takenOn}: ${p.pct}%`} className="flex h-full flex-1 flex-col justify-end"><span className="block w-full rounded-t-[3px] bg-sky-500" style={{ height: `${Math.max(4, p.pct)}%` }} /></span>)}</div>
            </div>}
            {view.trend.sections.length > 0 && <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500">Section average (last 5 mocks), weakest first</p>
              <ul className="mt-1 space-y-1.5">{view.trend.sections.map((x) => <li key={x.name} className="flex items-center gap-2 text-sm"><span className="w-12 shrink-0 font-bold">{x.name}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.max(2, Math.min(100, x.avgPct))}%` }} /></span><span className="w-10 shrink-0 text-right tabular-nums">{x.avgPct}%</span></li>)}</ul>
            </div>}
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{data.mocks.slice(0, 6).map((m) => <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{m.name}</span><span className="text-xs text-slate-500">{exam.mockStages.find(([id]) => id === m.stage)?.[1] ?? STAGE_NAME[m.stage]} · {m.takenOn}{m.sections.length ? ` · ${m.sections.map((x) => `${x.name} ${x.score}`).join(', ')}` : ''}{m.totalQuestions ? ` · ${m.correct} right, ${m.incorrect} wrong, ${m.unattempted} left` : ''}</span></span>
              <span className="shrink-0 font-bold tabular-nums">{m.score ?? '–'}{m.maxScore ? <span className="font-normal text-slate-500">/{m.maxScore}</span> : null}</span>
            </li>)}</ul>
          </>}
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Link href="/prep/notes" className={`${card} block`}><p className="text-sm font-bold">Current affairs</p><p className="text-xs text-slate-500">Monthly notes</p></Link>
        <Link href="/prep/pyq" className={`${card} block`}><p className="text-sm font-bold">Past papers</p><p className="text-xs text-slate-500">Year by year</p></Link>
        <Link href="/prep/mistakes" className={`${card} block`}><p className="text-sm font-bold">Mistake notebook</p><p className="text-xs text-slate-500">{view.mistakes.open.length} to revisit</p></Link>
      </div>

      <AnswerReviews userId={data.userId} />
      <MentorShare userId={data.userId} />

      {/* Exam, date, hours, reminder and language all live in one setup sheet */}
      <button type="button" onClick={() => setSetupOpen(true)} className={`${card} mt-3 block w-full text-left`}>
        <p className="text-sm font-bold">Exam, date and reminders</p>
        <p className="text-xs text-slate-500">{data.template?.name ?? 'Your exam'}{data.profile.examDate ? ` · ${data.profile.examDate}` : ' · no date set'} · tap to change</p>
      </button>
      {setupOpen && <PrepSetup templates={data.templates} templateId={data.templateId} profile={data.profile} optionals={optionalSubjects(data.nodes)} onSave={data.saveProfile} onClose={() => setSetupOpen(false)} />}

      <p className="mt-4 px-1 text-xs text-slate-500">These measures come only from what you log, using fixed, published rules (scoring {SCORING_VERSION}). They are not a prediction of selection or rank.</p>

      <button type="button" onClick={() => setLogOpen(true)} aria-label="Quick log" className="fixed bottom-24 right-4 z-40 flex items-center gap-1.5 rounded-full bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg"><Plus className="h-4 w-4" />Quick log</button>
      {logOpen && <QuickLog nodes={data.nodes} states={data.states} examCode={data.template?.code} onClose={() => setLogOpen(false)} onLogged={flash} logEvent={data.logEvent} />}
      {toast && <div role="status" className="fixed inset-x-4 bottom-40 z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toast}</div>}
    </main>
  )
}

function Why({ reasons }: { reasons: string[] }) {
  return <details className="mt-2"><summary className="cursor-pointer list-none text-xs font-bold text-slate-600 [&::-webkit-details-marker]:hidden dark:text-slate-300">Why?</summary><ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">{reasons.map((r) => <li key={r}>{r}</li>)}</ul></details>
}

function Stage({ title, r }: { title: string; r: Readiness }) {
  const lost = r.value !== null && r.peak !== null ? r.peak - r.value : 0
  return <section className={card}>
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
    {r.value === null ? <p className="mt-1 text-sm font-semibold text-slate-500">Not enough evidence</p>
      : <><p className="mt-1 text-lg font-extrabold leading-tight">{r.band}</p><p className="text-xs text-slate-500">Index {r.value}{lost > 0 ? <span className="text-rose-600 dark:text-rose-400"> · −{lost} overdue</span> : null}</p></>}
    <Why reasons={r.reasons} />
  </section>
}

function Metric({ label, ind }: { label: string; ind: Indicator }) {
  return <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="text-xl font-extrabold tabular-nums">{ind.value === null ? '—' : `${ind.value}%`}</p>
    <Why reasons={ind.reasons} />
  </div>
}

const WEEK_ROWS: [keyof WeekStats, string][] = [['studyDays', 'study days'], ['minutes', 'min timed'], ['ticks', 'subtopics'], ['revisions', 'revisions'], ['pyqs', 'PYQs'], ['answers', 'answers'], ['newspaperDays', 'newspaper days']]

function WeekCell({ label, now, before }: { label: string; now: number; before: number }) {
  const diff = now - before
  return <div className="rounded-xl bg-slate-50 px-2 py-2 text-center dark:bg-slate-800/60">
    <p className="text-lg font-extrabold tabular-nums">{now}</p>
    <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    {(now > 0 || before > 0) && <p className={`text-[11px] font-bold ${diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : diff < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>{diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'same'}</p>}
  </div>
}
