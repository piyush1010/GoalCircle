'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, RotateCcw, Share2, Timer, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { examInfo } from '@/lib/prep/exam'
import { todayTasks, type Task } from '@/lib/prep/today'
import type { usePrepData } from '@/lib/prep/usePrepData'
import FocusTimer from '@/components/FocusTimer'
import ItemMenu from '@/components/ItemMenu'

type PrepData = ReturnType<typeof usePrepData>
interface Room { template_id: string; node_id: string; title: string; subject: string; done: boolean; done_count: number; people: number }
interface Todo { id: string; title: string; is_completed: boolean }
export interface TodayCounts { done: number; total: number; byTemplate: Map<string, { done: number; total: number }> }

const INTRO_KEY = 'goalyaar-today-intro-seen'
export const TODOS_CHANGED = 'goalyaar-todos-changed'

/** The label above each item: what kind of thing it is, in plain words. */
function tagFor(t: Task, exam: string | null): string {
  switch (t.kind) {
    case 'study': return exam ? `Study for ${exam}` : 'Study'
    case 'revise': return exam ? `Revise for ${exam}` : 'Revise'
    case 'room': return exam ? `Topic of the day for ${exam}` : 'Topic of the day'
    case 'mentor': return t.subtitle
    default: return 'Goal'
  }
}

/**
 * Today on Home: one list for everything due, across every goal. Study and revision from each exam
 * plan, the topic of the day, the mentor's task, personal goals and one-off to-dos.
 */
export default function TodayList({ data, userId, goals, mentor, onGoalDone, onCounts }: {
  data: PrepData
  userId: string
  goals: { id: string; title: string; done: boolean; detail: string }[]
  mentor: { circleId: string; name: string; task: string; done: boolean }[]
  onGoalDone: (goalId: string) => Promise<boolean>
  onCounts?: (counts: TodayCounts) => void
}) {
  const today = localDateString()
  const [busy, setBusy] = useState<string | null>(null)
  const [focus, setFocus] = useState<Task | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [toast, setToastState] = useState<{ text: string; undo?: () => Promise<boolean> } | null>(null)
  const setToast = (text: string | null, undo?: () => Promise<boolean>) => setToastState(text ? { text, undo } : null)
  const [intro, setIntro] = useState(false)
  useEffect(() => { const t = window.setTimeout(() => { try { setIntro(window.localStorage.getItem(INTRO_KEY) !== '1') } catch { /* no intro */ } }, 0); return () => window.clearTimeout(t) }, [])
  const closeIntro = () => { try { window.localStorage.setItem(INTRO_KEY, '1') } catch { /* fine */ } setIntro(false) }

  const ready = data.status === 'ready'
  const planned = useMemo(() => !ready ? [] : todayTasks({
    plans: data.plans.map((p) => ({ templateId: p.templateId, short: examInfo(p.code).short, nodes: data.nodesByTemplate.get(p.templateId) ?? [], settings: p })),
    states: data.states, today, goals, mentor,
  }), [ready, data.plans, data.nodesByTemplate, data.states, today, goals, mentor])

  // Topic of the day: the same topic for everyone preparing for an exam.
  const [rooms, setRooms] = useState<Room[]>([])
  const loadRooms = useCallback(async () => { const { data: rows, error } = await supabase.rpc('prep_room_today'); if (!error && Array.isArray(rows)) setRooms(rows as Room[]); return !error }, [])
  useEffect(() => { if (!data.plans.length) return; const t = window.setTimeout(() => { void loadRooms() }, 0); return () => window.clearTimeout(t) }, [today, data.plans.length, loadRooms])
  const roomCheck = async (templateId: string, undo = false) => { const { error } = await supabase.rpc('prep_room_checkin', { target_template: templateId, undo }); if (!error) await loadRooms(); return !error }

  // One-off to-dos for today, added from the + sheet.
  const [todos, setTodos] = useState<Todo[]>([])
  const loadTodos = useCallback(async () => {
    const { data: rows, error } = await supabase.from('todo_items').select('id,title,is_completed').eq('user_id', userId).eq('due_date', today).order('created_at', { ascending: true })
    if (!error) setTodos((rows ?? []) as Todo[])
  }, [userId, today])
  useEffect(() => {
    const t = window.setTimeout(() => { void loadTodos() }, 0)
    const again = () => { void loadTodos() }
    window.addEventListener(TODOS_CHANGED, again)
    return () => { window.clearTimeout(t); window.removeEventListener(TODOS_CHANGED, again) }
  }, [loadTodos])
  const setTodo = async (todo: Todo, done: boolean) => {
    setTodos((cur) => cur.map((x) => (x.id === todo.id ? { ...x, is_completed: done } : x)))
    const { error } = await supabase.from('todo_items').update({ is_completed: done, updated_at: new Date().toISOString() }).eq('id', todo.id).eq('user_id', userId)
    if (error) { setTodos((cur) => cur.map((x) => (x.id === todo.id ? todo : x))); return false }
    return true
  }
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null)
  const saveRename = async () => {
    if (!editing) return
    const title = editing.title.trim()
    const before = todos.find((x) => x.id === editing.id)
    setEditing(null)
    if (!title || !before || title === before.title) return
    const { error } = await supabase.from('todo_items').update({ title, updated_at: new Date().toISOString() }).eq('id', before.id).eq('user_id', userId)
    if (error) setToast('Could not rename. Try again.'); else setTodos((cur) => cur.map((x) => (x.id === before.id ? { ...x, title } : x)))
  }
  const deleteTodo = async (todo: Todo) => {
    const { error } = await supabase.from('todo_items').delete().eq('id', todo.id).eq('user_id', userId)
    if (error) return false
    setTodos((cur) => cur.filter((x) => x.id !== todo.id)); return true
  }

  const tasks = useMemo(() => {
    const roomTasks: Task[] = rooms.map((r) => {
      const others = r.done_count - (r.done ? 1 : 0)
      const short = examInfo(data.plans.find((p) => p.templateId === r.template_id)?.code).short
      return { key: `room:${r.template_id}`, kind: 'room', nodeId: r.node_id, title: r.title, subtitle: others > 0 ? `${r.subject}. ${others} other${others === 1 ? ' has' : 's have'} done it today.` : `${r.subject}. The same topic for everyone preparing for ${short}.`, exam: short, templateId: r.template_id, done: r.done }
    })
    const order = (t: Task) => (t.done ? 10 : 0) + (t.kind === 'goal' ? 2 : t.kind === 'room' ? 1 : 0)
    return [...planned, ...roomTasks].map((t, i) => ({ t, i })).sort((a, b) => order(a.t) - order(b.t) || a.i - b.i).map((x) => x.t)
  }, [planned, rooms, data.plans])

  const openTodos = todos.filter((t) => !t.is_completed)
  const doneTodos = todos.filter((t) => t.is_completed)
  const done = tasks.filter((t) => t.done).length + doneTodos.length
  const total = tasks.length + todos.length

  // Tell Home how the day is going, overall and for each exam (for the rings around the circles).
  // Only when the numbers change: Home re-renders on every report, which must not start a loop.
  const reported = useRef('')
  useEffect(() => {
    if (!onCounts) return
    const byTemplate = new Map<string, { done: number; total: number }>()
    for (const t of tasks) {
      if (!t.templateId) continue
      const c = byTemplate.get(t.templateId) ?? { done: 0, total: 0 }
      c.total += 1; if (t.done) c.done += 1
      byTemplate.set(t.templateId, c)
    }
    const key = `${done}/${total}|${[...byTemplate].map(([id, c]) => `${id}:${c.done}/${c.total}`).join(',')}`
    if (key === reported.current) return
    reported.current = key
    onCounts({ done, total, byTemplate })
  }, [tasks, done, total, onCounts])

  // Keep the reminder's "N subtopics today" in step with the list.
  const target = tasks.filter((t) => t.kind === 'study').length
  const { saveTarget } = data
  useEffect(() => { if (ready && target && data.plans.length) void saveTarget(target) }, [ready, target, saveTarget, data.plans.length])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToastState(null), toast.undo ? 5000 : 2600); return () => window.clearTimeout(t) }, [toast])

  if (data.plans.length > 0 && !ready) return <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-busy="true" />

  const act = async (t: Task, fn: () => Promise<boolean>, message: string, undo?: () => Promise<boolean>) => {
    setBusy(t.key)
    const ok = await fn()
    setBusy(null)
    setToast(ok ? message : 'Could not save. Try again.', ok ? undo : undefined)
  }
  const examOf = (t: Task) => (t.templateId ? examInfo(data.plans.find((p) => p.templateId === t.templateId)?.code).short : null)
  const studied = tasks.filter((t) => t.kind === 'study' && t.done).length
  const revised = tasks.filter((t) => t.kind === 'revise' && t.done).length
  const primary = 'h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900'
  const secondary = 'h-11 rounded-xl border border-slate-300 text-sm font-semibold disabled:opacity-50 dark:border-slate-600'
  const undoButton = 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
  const row = 'px-4 py-3.5'

  return <section aria-labelledby="today-h" data-guide="deck">
    {intro && total > 0 && <div className="mb-3 rounded-2xl bg-slate-900 p-4 text-white dark:bg-white dark:text-slate-900">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold">This is your day.</p>
        <button type="button" onClick={closeIntro} aria-label="Dismiss" className="-m-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full opacity-70"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-1 text-sm leading-relaxed opacity-80">Tick each item off as you finish it. Topics you study come back for revision before you forget them, and anything you tap by mistake can be undone.</p>
    </div>}

    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h2 id="today-h" className="text-base font-semibold">Today</h2>
        {total > 0 && <span className="text-sm text-slate-500 tabular-nums">{done} of {total} done</span>}
      </div>
      {total > 0 && <div className="mx-4 mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500 transition-[width] duration-500" style={{ width: `${(done / total) * 100}%` }} /></div>}

      {total === 0
        ? <p className="px-4 pb-5 pt-3 text-sm text-slate-500">Nothing is due today. Add a goal, or take the day off.</p>
        : <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {tasks.filter((t) => !t.done).map((t) => {
              const title = t.nodeId ? <Link href={`/prep?topic=${t.nodeId}`} className="block text-[15px] font-semibold leading-snug">{t.title}</Link> : <span className="block text-[15px] font-semibold leading-snug">{t.title}</span>
              const sub = t.kind !== 'mentor' && t.subtitle ? <span className="mt-0.5 block text-sm text-slate-500">{t.subtitle}</span> : null
              if (t.kind === 'revise' || t.kind === 'mentor') return <li key={t.key} className={row}>
                <p className="text-xs font-medium text-slate-500">{tagFor(t, examOf(t))}</p>
                <div className="mt-0.5">{title}{sub}</div>
                <div className="mt-3">
                  {t.kind === 'revise'
                    ? <><p className="mb-2 text-sm text-slate-500">How much did you remember?</p><div className="grid grid-cols-3 gap-2">{([['all', 'Got it'], ['some', 'Partly'], ['little', 'Forgot']] as const).map(([recall, label], i) => <button key={recall} type="button" disabled={busy !== null} onClick={() => void act(t, () => data.revise(t.nodeId!, recall), recall === 'little' ? 'Revised. It comes back in three days.' : 'Revised.', () => data.unrevise(t.nodeId!))} className={i === 0 ? primary : secondary}>{label}</button>)}</div></>
                    : <Link href={`/circles/${t.circleId}`} className={`${primary} grid place-items-center`}>Check in</Link>}
                </div>
              </li>
              const finish = t.kind === 'study' ? () => data.tick(t.nodeId!, true) : t.kind === 'room' ? () => roomCheck(t.templateId!) : () => onGoalDone(t.goalId!)
              const undo = t.kind === 'study' ? () => data.tick(t.nodeId!, false) : t.kind === 'room' ? () => roomCheck(t.templateId!, true) : undefined
              return <li key={t.key} className={`${row} flex items-start gap-3`}>
                <button type="button" disabled={busy !== null} onClick={() => void act(t, finish, t.kind === 'study' ? 'Done. It comes back for revision in three days.' : 'Done.', undo)} aria-label={`Mark “${t.title}” done`} className="mt-4 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-slate-300 text-transparent transition hover:border-slate-900 hover:text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:hover:border-white dark:hover:text-white"><Check className="h-4 w-4" strokeWidth={3} /></button>
                <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-500">{tagFor(t, examOf(t))}</span><span className="mt-0.5 block">{title}{sub}</span></span>
                {t.kind === 'study' && <button type="button" onClick={() => setFocus(t)} aria-label={`Focus timer for ${t.title}`} className="mt-3 grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"><Timer className="h-5 w-5" /></button>}
                {t.kind === 'goal' && <Link href={`/check-in?goal=${t.goalId}`} className="mt-3 shrink-0 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800">Add a note</Link>}
              </li>
            })}

            {openTodos.map((todo) => <li key={todo.id} className={`${row} flex items-center gap-3`}>
              <button type="button" onClick={() => void setTodo(todo, true)} aria-label={`Mark “${todo.title}” done`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-slate-300 text-transparent transition hover:border-slate-900 hover:text-slate-900 dark:border-slate-600 dark:hover:border-white dark:hover:text-white"><Check className="h-4 w-4" strokeWidth={3} /></button>
              {editing?.id === todo.id
                ? <form onSubmit={(e) => { e.preventDefault(); void saveRename() }} className="flex min-w-0 flex-1 gap-2">
                    <input autoFocus value={editing.title} onChange={(e) => setEditing({ id: todo.id, title: e.target.value })} maxLength={200} aria-label="Task name" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-[15px] dark:border-slate-600" />
                    <button type="submit" className="rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Save</button>
                  </form>
                : <>
                    <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-500">To-do</span><span className="block text-[15px] font-semibold leading-snug">{todo.title}</span></span>
                    <ItemMenu label="task" onEdit={() => setEditing({ id: todo.id, title: todo.title })} onDelete={() => deleteTodo(todo)} deleteMessage={`Delete “${todo.title}”?`} />
                  </>}
            </li>)}

            {tasks.filter((t) => t.done).map((t) => <li key={t.key} className={`${row} flex items-center gap-3`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-500">{tagFor(t, examOf(t))}</span><span className="block text-[15px] font-medium leading-snug text-slate-500 line-through decoration-slate-300">{t.title}</span></span>
              {t.kind === 'room' && t.templateId && <button type="button" disabled={busy !== null} onClick={() => void act(t, () => roomCheck(t.templateId!, true), 'Undone.')} className={undoButton}><RotateCcw className="h-3.5 w-3.5" />Undo</button>}
              {(t.kind === 'study' || t.kind === 'revise') && t.nodeId && <button type="button" disabled={busy !== null} onClick={() => void act(t, t.kind === 'study' ? () => data.tick(t.nodeId!, false) : () => data.unrevise(t.nodeId!), t.kind === 'study' ? 'Unticked.' : 'Revision undone.')} className={undoButton}><RotateCcw className="h-3.5 w-3.5" />Undo</button>}
            </li>)}

            {doneTodos.map((todo) => <li key={todo.id} className={`${row} flex items-center gap-3`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>
              <span className="min-w-0 flex-1"><span className="block text-xs font-medium text-slate-500">To-do</span><span className="block text-[15px] font-medium leading-snug text-slate-500 line-through decoration-slate-300">{todo.title}</span></span>
              <button type="button" onClick={() => void setTodo(todo, false)} className={undoButton}><RotateCcw className="h-3.5 w-3.5" />Undo</button>
            </li>)}
          </ul>}
    </div>

    {studied + revised > 0 && <button type="button" onClick={() => setShareOpen(true)} className="mt-3 inline-flex items-center gap-1.5 px-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white"><Share2 className="h-4 w-4" />Share today&apos;s progress</button>}

    {focus && focus.nodeId && <FocusTimer title={focus.title} subtitle={focus.subtitle} doneLabel="Done with this subtopic" onClose={() => setFocus(null)} onFinish={async (minutes, markDone) => {
      const ok = markDone ? await data.tick(focus.nodeId!, true, minutes) : await data.logEvent(null, 'studied', { minutes, details: { timer: true, unit: focus.nodeId } })
      setToast(ok ? `${minutes} minutes saved${markDone ? ', and ticked off' : ''}.` : 'Could not save.', ok && markDone ? () => data.tick(focus.nodeId!, false) : undefined)
    }} />}
    {shareOpen && <ShareSheet text={[studied ? `${studied} subtopic${studied === 1 ? '' : 's'}` : '', revised ? `${revised} revision${revised === 1 ? '' : 's'}` : ''].filter(Boolean).join(' and ')} exams={data.plans.map((p) => examInfo(p.code).short).join(' and ')} onClose={() => setShareOpen(false)} onDone={setToast} />}
    {toast && <div role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
      <span className={toast.undo ? '' : 'w-full text-center'}>{toast.text}</span>
      {toast.undo && <button type="button" onClick={async () => { const undo = toast.undo!; setToastState(null); const ok = await undo(); setToast(ok ? 'Undone.' : 'Could not undo. Try again.') }} className="shrink-0 font-semibold text-white underline dark:text-slate-900">Undo</button>}
    </div>}
  </section>
}

/** Nothing is shared unless the student picks where: followers, everyone, or another app. */
function ShareSheet({ text, exams, onClose, onDone }: { text: string; exams: string; onClose: () => void; onDone: (m: string) => void }) {
  const [message, setMessage] = useState(`Today's preparation for ${exams}: ${text || 'done for the day'}.`)
  const [busy, setBusy] = useState(false)
  const post = async (audience: 'followers' | 'public') => {
    setBusy(true)
    const { error } = await supabase.rpc('prep_share_day', { target_visibility: audience, message })
    setBusy(false)
    onDone(error ? 'Could not post. Try again.' : audience === 'public' ? 'Posted for everyone.' : 'Posted for your followers.')
    if (!error) onClose()
  }
  const outside = async () => {
    const full = `${message}\nTracking it on GoalYaar.`
    try { if (navigator.share) await navigator.share({ text: full }); else { await navigator.clipboard.writeText(full); onDone('Copied. Paste it anywhere.') } onClose() } catch { /* cancelled */ }
  }
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Share today" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Share today</h2><button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-slate-500"><X className="h-5 w-5" /></button></div>
      <p className="mt-1 text-sm text-slate-500">Nothing is shared until you choose where it goes.</p>
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={500} rows={3} className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700" />
      <div className="mt-3 grid gap-2">
        <button type="button" disabled={busy} onClick={() => void post('followers')} className="rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-700">Post for my followers</button>
        <button type="button" disabled={busy} onClick={() => void post('public')} className="rounded-xl border border-slate-200 py-3 text-sm font-semibold dark:border-slate-700">Post for everyone</button>
        <button type="button" disabled={busy} onClick={() => void outside()} className="rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Send on WhatsApp or another app</button>
      </div>
    </div>
  </div>
}
