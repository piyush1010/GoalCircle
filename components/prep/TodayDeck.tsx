'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, ListChecks, Plus, RotateCcw, Share2, Timer, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { examInfo } from '@/lib/prep/exam'
import { todayTasks, type Task } from '@/lib/prep/today'
import { usePrepData } from '@/lib/prep/usePrepData'
import FocusTimer from '@/components/FocusTimer'
import QuickLog from '@/components/prep/QuickLog'

const KIND_LABEL: Record<Task['kind'], string> = { mentor: 'Mentor task', revise: 'Revise', study: 'Study', goal: 'Goal', room: 'Topic of the day' }
/** Where a card's title leads: the topic in the syllabus, with its subtopics and revision history. */
const topicHref = (t: Task) => (t.nodeId ? `/prep?topic=${t.nodeId}` : null)
interface Room { template_id: string; node_id: string; title: string; subject: string; done: boolean; done_count: number; people: number }
const INTRO_KEY = 'goalyaar-today-intro-seen'
const FOCUS_KEY = 'goalyaar-today-exam' // which exam Today shows when there are several (empty = all)

/**
 * Today for people preparing for exams: one task per slide, one big action each.
 * Study, revisions, the mentor's task and personal goals, across every exam, in one deck.
 */
export default function TodayDeck({ goals, mentor, onGoalDone }: {
  goals: { id: string; title: string; done: boolean; detail: string }[]
  mentor: { circleId: string; name: string; task: string; done: boolean }[]
  onGoalDone: (goalId: string) => Promise<boolean>
}) {
  const data = usePrepData(true)
  const today = localDateString()
  const [busy, setBusy] = useState<string | null>(null)
  const [focus, setFocus] = useState<Task | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [toast, setToastState] = useState<{ text: string; undo?: () => Promise<boolean> } | null>(null)
  const setToast = (text: string | null, undo?: () => Promise<boolean>) => setToastState(text ? { text, undo } : null)
  // First visit: one extra slide that says what this is. Hidden for good after "Start".
  const [intro, setIntro] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => { try { setIntro(window.localStorage.getItem(INTRO_KEY) !== '1') } catch { /* show nothing */ } }, 0); return () => window.clearTimeout(t) }, [])
  const closeIntro = () => { try { window.localStorage.setItem(INTRO_KEY, '1') } catch { /* fine */ } setIntro(false) }
  const rail = useRef<HTMLDivElement>(null)

  // With several exams, Today can show all of them or just one.
  const [only, setOnly] = useState<string | null>(null)
  useEffect(() => { const t = window.setTimeout(() => { try { setOnly(window.localStorage.getItem(FOCUS_KEY) || null) } catch { /* all */ } }, 0); return () => window.clearTimeout(t) }, [])
  const pick = (id: string | null) => { setOnly(id); try { if (id) window.localStorage.setItem(FOCUS_KEY, id); else window.localStorage.removeItem(FOCUS_KEY) } catch { /* not remembered */ } }
  const focusId = only && data.plans.some((p) => p.templateId === only) ? only : null
  const shown = useMemo(() => (focusId ? data.plans.filter((p) => p.templateId === focusId) : data.plans), [focusId, data.plans])
  const planned = useMemo(() => data.status !== 'ready' ? [] : todayTasks({
    plans: shown.map((p) => ({ templateId: p.templateId, short: examInfo(p.code).short, nodes: data.nodesByTemplate.get(p.templateId) ?? [], settings: p })),
    states: data.states, today, goals: focusId ? [] : goals, mentor: focusId ? [] : mentor,
  }), [data.status, shown, focusId, data.nodesByTemplate, data.states, today, goals, mentor])

  // Topic of the day: the same topic for everyone preparing for an exam, posted automatically.
  const [rooms, setRooms] = useState<Room[]>([])
  const loadRooms = async () => { const { data: rows, error } = await supabase.rpc('prep_room_today'); if (!error && Array.isArray(rows)) setRooms(rows as Room[]); return !error }
  useEffect(() => { const t = window.setTimeout(() => { void loadRooms() }, 0); return () => window.clearTimeout(t) }, [today])
  const roomCheck = async (templateId: string, undo = false) => { const { error } = await supabase.rpc('prep_room_checkin', { target_template: templateId, undo }); if (!error) await loadRooms(); return !error }
  const tasks = useMemo(() => {
    const multi = data.plans.length > 1
    const roomTasks: Task[] = rooms.filter((r) => !focusId || r.template_id === focusId).map((r) => {
      const others = r.done_count - (r.done ? 1 : 0)
      const short = examInfo(data.plans.find((p) => p.templateId === r.template_id)?.code).short
      return { key: `room:${r.template_id}`, kind: 'room', nodeId: r.node_id, title: r.title, subtitle: `${r.subject} · ${others > 0 ? `${others} other${others === 1 ? '' : 's'} done today` : `Same topic for everyone preparing for ${short}`}`, exam: multi ? short : null, templateId: r.template_id, done: r.done }
    })
    // Open tasks first; the shared topic sits after your own study and before personal goals.
    const order = (t: Task) => (t.done ? 10 : 0) + (t.kind === 'goal' ? 2 : t.kind === 'room' ? 1 : 0)
    return [...planned, ...roomTasks].map((t, i) => ({ t, i })).sort((a, b) => order(a.t) - order(b.t) || a.i - b.i).map((x) => x.t)
  }, [planned, rooms, data.plans, focusId])
  const done = tasks.filter((t) => t.done).length
  const studied = tasks.filter((t) => t.kind === 'study' && t.done).length
  const revised = tasks.filter((t) => t.kind === 'revise' && t.done).length

  // Keep the target the reminder quotes in step with today's study slides.
  const target = tasks.filter((t) => t.kind === 'study').length
  const { saveTarget } = data
  // Only from the all-exams view, so the reminder always quotes the full day.
  useEffect(() => { if (data.status === 'ready' && target && !focusId) void saveTarget(target) }, [data.status, target, saveTarget, focusId])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToastState(null), toast.undo ? 5000 : 2600); return () => window.clearTimeout(t) }, [toast])

  if (data.status !== 'ready') return <div className="h-72 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900" aria-busy="true" />

  const act = async (t: Task, fn: () => Promise<boolean>, message: string, undo?: () => Promise<boolean>) => {
    setBusy(t.key)
    const ok = await fn()
    setBusy(null)
    setToast(ok ? message : 'Could not save. Try again.', ok ? undo : undefined)
    // Move to the next open slide.
    if (ok && rail.current) rail.current.scrollBy({ left: rail.current.clientWidth * 0.88, behavior: 'smooth' })
  }

  return <section aria-label="Today" data-guide="deck" className="mb-6">
    {data.plans.length > 1 && <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Show exam">
      {[{ id: null as string | null, label: 'All exams' }, ...data.plans.map((p) => ({ id: p.templateId as string | null, label: examInfo(p.code).short }))].map((o) => <button key={o.id ?? 'all'} type="button" onClick={() => pick(o.id)} aria-pressed={focusId === o.id} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${focusId === o.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{o.label}</button>)}
    </div>}
    <div className="mb-3 flex items-end justify-between px-1">
      <div><p className="text-sm text-slate-500">Today&apos;s plan</p><p className="text-2xl font-semibold tracking-tight tabular-nums">{tasks.length ? `${done} of ${tasks.length} done` : 'All clear'}</p></div>
      {tasks.length > 1 && <p className="pb-1 text-sm text-slate-500">Swipe for more</p>}
    </div>
    {tasks.length > 0 && <div className="mb-4 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500 transition-[width] duration-500" style={{ width: `${(done / tasks.length) * 100}%` }} /></div>}

    {tasks.length === 0
      ? <div className="rounded-3xl border border-slate-200 p-6 text-center dark:border-slate-800"><p className="font-medium">Nothing due right now.</p><p className="mt-1 text-sm text-slate-500">Pick something from your syllabus, or rest.</p><Link href="/prep" className="mt-4 inline-block rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium dark:border-slate-700">Open syllabus</Link></div>
      : <div ref={rail} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {intro && <article className="flex min-h-[15rem] w-[88%] shrink-0 snap-center flex-col rounded-3xl bg-slate-900 p-5 text-white dark:bg-white dark:text-slate-900">
            <p className="text-xs font-medium uppercase tracking-[0.14em] opacity-60">How this works</p>
            <h3 className="mt-3 text-[22px] font-semibold leading-snug tracking-tight">Your day, one card at a time.</h3>
            <ul className="mb-5 mt-3 space-y-1.5 text-sm opacity-80">
              <li>Each card is one thing from your plan: a subtopic to study, a topic to revise, or a goal. The topic of the day is shared with everyone preparing for your exam.</li>
              <li>Tap <b>Done</b> when you finish it. Tapped by mistake? <b>Undo</b>.</li>
              <li><b>Focus</b> opens the timer: 25 / 5, 50 / 10 or a stopwatch.</li>
            </ul>
            <button type="button" onClick={() => { closeIntro(); rail.current?.scrollTo({ left: 0 }) }} className="mt-auto rounded-xl bg-white py-3 text-base font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">Start</button>
          </article>}
          {tasks.map((t) => <article key={t.key} className={`flex min-h-[15rem] w-[88%] shrink-0 snap-center flex-col rounded-3xl border p-5 ${t.done ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
            <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">{KIND_LABEL[t.kind]}{t.exam ? ` · ${t.exam}` : ''}</p>{topicHref(t) && <Link href={topicHref(t)!} tabIndex={-1} aria-hidden="true" className="-m-2 p-2 text-slate-400"><ChevronRight className="h-5 w-5" /></Link>}</div>
            {topicHref(t)
              ? <Link href={topicHref(t)!} className="mt-3 block" aria-label={`Open ${t.title}`}>
                  <h3 className={`line-clamp-3 text-[22px] font-semibold leading-snug tracking-tight ${t.done ? 'text-slate-400' : ''}`}>{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.subtitle}</p>
                </Link>
              : <>
                  <h3 className={`mt-3 line-clamp-3 text-[22px] font-semibold leading-snug tracking-tight ${t.done ? 'text-slate-400' : ''}`}>{t.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{t.subtitle}</p>
                </>}
            <div className="mt-auto pt-5">
              {t.done
                ? <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" />Done</span>
                    {t.kind === 'room' && t.templateId && <button type="button" disabled={busy !== null} onClick={() => void act(t, () => roomCheck(t.templateId!, true), 'Undone.')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"><RotateCcw className="h-3.5 w-3.5" />Undo</button>}
                    {(t.kind === 'study' || t.kind === 'revise') && t.nodeId && <button type="button" disabled={busy !== null} onClick={() => void act(t, t.kind === 'study' ? () => data.tick(t.nodeId!, false) : () => data.unrevise(t.nodeId!), t.kind === 'study' ? 'Unticked.' : 'Revision undone.')} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"><RotateCcw className="h-3.5 w-3.5" />Undo</button>}</div>
                : t.kind === 'revise'
                  ? <div className="grid grid-cols-3 gap-2">{([['all', 'Got it'], ['some', 'Partly'], ['little', 'Forgot']] as const).map(([recall, label]) => <button key={recall} type="button" disabled={busy !== null} onClick={() => void act(t, () => data.revise(t.nodeId!, recall), recall === 'little' ? 'Revised. Back in 3 days.' : 'Revised.', () => data.unrevise(t.nodeId!))} className={`rounded-xl py-3 text-sm font-semibold disabled:opacity-50 ${recall === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 dark:border-slate-700'}`}>{label}</button>)}</div>
                  : t.kind === 'mentor'
                    ? <Link href={`/circles/${t.circleId}`} className="block w-full rounded-xl bg-slate-900 py-3.5 text-center text-base font-semibold text-white dark:bg-white dark:text-slate-900">Check in</Link>
                    : <div className="flex gap-2">
                        <button type="button" disabled={busy !== null} onClick={() => void act(t, t.kind === 'study' ? () => data.tick(t.nodeId!, true) : t.kind === 'room' ? () => roomCheck(t.templateId!) : () => onGoalDone(t.goalId!), t.kind === 'study' ? 'Ticked.' : 'Done.', t.kind === 'study' ? () => data.tick(t.nodeId!, false) : t.kind === 'room' ? () => roomCheck(t.templateId!, true) : undefined)} className="flex-1 rounded-xl bg-slate-900 py-3.5 text-base font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">{busy === t.key ? 'Saving…' : 'Done'}</button>
                        {t.kind === 'study' && <button type="button" onClick={() => setFocus(t)} aria-label="Focus timer, 25 minutes" className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-slate-700"><Timer className="h-4 w-4" />Focus</button>}
                      </div>}
            </div>
          </article>)}
        </div>}

    <div data-guide="deck-actions" className="mt-4 grid grid-cols-3 gap-2 text-sm">
      <button type="button" onClick={() => setLogOpen(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 font-medium dark:border-slate-800"><Plus className="h-4 w-4" />Log</button>
      <Link href="/prep/plan" className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 font-medium dark:border-slate-800"><ListChecks className="h-4 w-4" />Plan</Link>
      <button type="button" disabled={done === 0} onClick={() => setShareOpen(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 font-medium disabled:opacity-40 dark:border-slate-800"><Share2 className="h-4 w-4" />Share</button>
    </div>

    {focus && focus.nodeId && <FocusTimer title={focus.title} subtitle={focus.subtitle} doneLabel="Done with this subtopic" onClose={() => setFocus(null)} onFinish={async (minutes, markDone) => {
      const ok = markDone ? await data.tick(focus.nodeId!, true, minutes) : await data.logEvent(null, 'studied', { minutes, details: { timer: true, unit: focus.nodeId } })
      setToast(ok ? `${minutes} min saved${markDone ? ', ticked' : ''}.` : 'Could not save.', ok && markDone ? () => data.tick(focus.nodeId!, false) : undefined)
    }} />}
    {logOpen && <QuickLog nodes={data.nodes} states={data.states} examCode={data.template?.code} onClose={() => setLogOpen(false)} onLogged={setToast} logEvent={data.logEvent} />}
    {shareOpen && <ShareSheet text={[studied ? `${studied} subtopic${studied === 1 ? '' : 's'}` : '', revised ? `${revised} revision${revised === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ')} exams={data.plans.map((p) => examInfo(p.code).short).join(' and ')} onClose={() => setShareOpen(false)} onDone={setToast} />}
    {toast && <div role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
      <span className={toast.undo ? '' : 'w-full text-center'}>{toast.text}</span>
      {toast.undo && <button type="button" onClick={async () => { const undo = toast.undo!; setToastState(null); const ok = await undo(); setToast(ok ? 'Undone.' : 'Could not undo. Try again.') }} className="shrink-0 font-semibold text-amber-400 dark:text-amber-600">Undo</button>}
    </div>}
  </section>
}

/** Nothing is shared unless the student picks where: followers, everyone, or another app. */
function ShareSheet({ text, exams, onClose, onDone }: { text: string; exams: string; onClose: () => void; onDone: (m: string) => void }) {
  const [message, setMessage] = useState(`Today's preparation (${exams}): ${text || 'done for the day'}.`)
  const [busy, setBusy] = useState(false)
  const post = async (audience: 'followers' | 'public') => {
    setBusy(true)
    const { error } = await supabase.rpc('prep_share_day', { target_visibility: audience, message })
    setBusy(false)
    onDone(error ? 'Could not post. Try again.' : audience === 'public' ? 'Posted to everyone.' : 'Posted to your followers.')
    if (!error) onClose()
  }
  const outside = async () => {
    const full = `${message}\nTracking it on GoalYaar.`
    try { if (navigator.share) await navigator.share({ text: full }); else { await navigator.clipboard.writeText(full); onDone('Copied. Paste it anywhere.') } onClose() } catch { /* cancelled */ }
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Share today" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Share today</h2><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-slate-500"><X className="h-5 w-5" /></button></div>
      <p className="mt-1 text-sm text-slate-500">Private unless you choose where it goes.</p>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700" />
      <div className="mt-3 grid gap-2">
        <button type="button" disabled={busy} onClick={() => void post('followers')} className="rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-700">Post for my followers</button>
        <button type="button" disabled={busy} onClick={() => void post('public')} className="rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-700">Post for everyone</button>
        <button type="button" disabled={busy} onClick={() => void outside()} className="rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Send on WhatsApp or other apps</button>
      </div>
    </div>
  </div>
}
