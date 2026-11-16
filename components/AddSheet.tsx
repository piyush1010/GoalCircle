'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CircleAlert, ListPlus, MessageCircleQuestion, NotebookPen, SquareCheckBig, Target, Timer, UsersRound, X, type LucideIcon } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { usePrepActive } from '@/lib/prep/active'
import { TODOS_CHANGED } from '@/components/home/TodayList'

interface Option { href?: string; onPick?: () => void; icon: LucideIcon; title: string; line: string }

/**
 * The + button: one place for every "add". Log a goal, start the timer, note a mistake, add a
 * one-off task, ask your community, set a new goal, or join or start a batch.
 */
export default function AddSheet({ onClose }: { onClose: () => void }) {
  const preparing = usePrepActive()
  const [view, setView] = useState<'list' | 'task'>('list')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    setBusy(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); setError('Please sign in again.'); return }
    const { error: insertError } = await supabase.from('todo_items').insert({ user_id: session.user.id, title: clean, due_date: localDateString(), position: 0 })
    setBusy(false)
    if (insertError) { setError('Could not add the task. Please try again.'); return }
    window.dispatchEvent(new Event(TODOS_CHANGED))
    onClose()
  }

  const options: Option[] = [
    { href: '/create', icon: SquareCheckBig, title: 'Log today', line: 'A workout, pages read, or your batch task' },
    ...(preparing ? [{ href: '/prep/progress?log=1', icon: NotebookPen, title: 'Log study or a mock test', line: 'Hours studied, a mock score or answers written' }] : []),
    { href: '/focus', icon: Timer, title: 'Start focus', line: 'A timer for focused study or practice' },
    ...(preparing ? [{ href: '/prep/mistakes?add=1', icon: CircleAlert, title: 'Add a mistake', line: 'Something that tripped you up in a test' }] : []),
    { onPick: () => setView('task'), icon: ListPlus, title: 'Add a task', line: 'A one-off thing for today, like filling in a form' },
    { href: '/discuss/new', icon: MessageCircleQuestion, title: 'Ask a question', line: 'Ask your community about a doubt, a plan or anything else' },
    { href: '/start', icon: Target, title: 'New goal', line: 'An exam, a habit or something of your own' },
    { href: '/circles/join', icon: UsersRound, title: 'Join or start a batch', line: 'Use your mentor’s code, or coach your own students' },
  ]
  const row = 'flex w-full items-center gap-3.5 py-3 text-left'

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Add" onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 dark:bg-slate-900 sm:rounded-3xl">
      <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{view === 'task' ? 'Add a task' : 'Add'}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>

      {view === 'list'
        ? <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {options.map((o) => {
              const inner = <>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><o.icon className="h-5 w-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{o.title}</span><span className="block text-sm text-slate-500">{o.line}</span></span>
              </>
              return <li key={o.title}>{o.href ? <Link href={o.href} onClick={onClose} className={row}>{inner}</Link> : <button type="button" onClick={o.onPick} className={row}>{inner}</button>}</li>
            })}
          </ul>
        : <form onSubmit={(e) => void addTask(e)} className="mt-2">
            <label htmlFor="new-task" className="text-sm font-medium text-slate-700 dark:text-slate-300">What do you need to do today?</label>
            <input id="new-task" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="For example, buy the Laxmikanth book" className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-3 text-base dark:border-slate-600" />
            <p className="mt-2 text-sm text-slate-500">It appears at the end of today&apos;s list.</p>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setView('list')} className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-semibold dark:border-slate-600">Back</button>
              <button type="submit" disabled={busy || !title.trim()} className="h-12 flex-1 rounded-xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Adding…' : 'Add to today'}</button>
            </div>
          </form>}
    </div>
  </div>
}
