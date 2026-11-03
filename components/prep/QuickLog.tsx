'use client'

import { useMemo, useState } from 'react'
import { BookOpen, ClipboardCheck, FileText, Minus, Newspaper, PenLine, Plus, RotateCcw, Search, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { retention } from '@/lib/prep/revision'
import type { SyllabusNode, TopicState } from '@/lib/prep/types'
import type { LogKind } from '@/lib/prep/usePrepData'

type Action = 'studied' | 'revised' | 'pyq' | 'answers' | 'mock' | 'current_affairs'
const ACTIONS: { id: Action; label: string; icon: typeof BookOpen; needsTopic: boolean }[] = [
  { id: 'studied', label: 'Studied', icon: BookOpen, needsTopic: true },
  { id: 'revised', label: 'Revised', icon: RotateCcw, needsTopic: true },
  { id: 'pyq', label: 'PYQs', icon: ClipboardCheck, needsTopic: true },
  { id: 'answers', label: 'Answers written', icon: PenLine, needsTopic: false },
  { id: 'mock', label: 'Mock test', icon: FileText, needsTopic: false },
  { id: 'current_affairs', label: 'Current affairs', icon: Newspaper, needsTopic: false },
]
const MOCK_STAGES = [['prelims_gs', 'Prelims GS', 200], ['csat', 'CSAT', 200], ['mains', 'Mains', 250], ['optional', 'Optional', 250]] as const
const CA_KINDS = [['scheme', 'Scheme'], ['judgment', 'Judgment'], ['report', 'Report'], ['committee', 'Committee'], ['budget', 'Budget data'], ['economic_survey', 'Economic Survey'], ['state_example', 'State example'], ['other', 'Other']] as const

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900'
const label = 'block text-xs font-bold uppercase tracking-wide text-slate-500'

/**
 * Quick log: action -> topic -> (count) -> save. Defaults everywhere so a log takes a few seconds.
 * Topic list opens on revision-due and recent topics, with search for the rest.
 */
export default function QuickLog({ nodes, states, initialAction, initialTopic, onClose, onLogged, logEvent }: {
  nodes: SyllabusNode[]; states: Map<string, TopicState>
  initialAction?: Action; initialTopic?: string
  onClose: () => void
  onLogged: (message: string) => void
  logEvent: (nodeId: string | null, kind: LogKind, opts?: { quantity?: number; details?: Record<string, unknown>; minutes?: number }) => Promise<boolean>
}) {
  const [action, setAction] = useState<Action | null>(initialAction ?? null)
  const [topicId, setTopicId] = useState<string | null>(initialTopic ?? null)
  const [query, setQuery] = useState('')
  const [count, setCount] = useState(1)
  const [correct, setCorrect] = useState(0)
  const [timed, setTimed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mock, setMock] = useState({ stage: 'prelims_gs' as (typeof MOCK_STAGES)[number][0], name: '', score: '', max: '200', correct: '', incorrect: '', unattempted: '' })
  const [ca, setCa] = useState({ title: '', kind: 'scheme' as (typeof CA_KINDS)[number][0] })
  const today = localDateString()

  const topics = useMemo(() => nodes.filter((n) => n.kind === 'topic' || n.kind === 'ncert_book'), [nodes])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const due = useMemo(() => topics.filter((n) => { const s = states.get(n.id); return s && ['overdue', 'due_today'].includes(retention(s, today).status) }), [topics, states, today])
  const recent = useMemo(() => topics.filter((n) => states.get(n.id)?.touchedOn && !due.includes(n)).sort((a, b) => (states.get(b.id)!.touchedOn! > states.get(a.id)!.touchedOn! ? 1 : -1)).slice(0, 6), [topics, states, due])
  const q = query.trim().toLowerCase()
  const results = q ? topics.filter((n) => n.title.toLowerCase().includes(q)).slice(0, 25) : []
  const def = ACTIONS.find((a) => a.id === action)
  const topic = topicId ? byId.get(topicId) : undefined
  const touched = Boolean(topicId && states.get(topicId)?.touchedOn)

  const save = async () => {
    if (!action || busy) return
    setBusy(true); setError(null)
    try {
      let ok = true, message = ''
      if (action === 'studied') { ok = await logEvent(topicId, 'studied'); message = `Logged ${topic?.title}. ${touched ? '' : 'First revision in 3 days.'}`.trim() }
      else if (action === 'revised') { ok = await logEvent(topicId, 'revised'); message = `Revision logged for ${topic?.title}.` }
      else if (action === 'pyq') {
        ok = await logEvent(topicId, 'pyq', { quantity: count, details: { correct: Math.min(correct, count) } })
        if (ok) await supabase.from('prep_pyq_attempts').insert({ node_id: topicId, attempted: count, correct: Math.min(correct, count), attempted_on: today })
        message = `${count} PYQ${count === 1 ? '' : 's'} logged (${Math.min(correct, count)} correct).`
      } else if (action === 'answers') {
        const paper = topic?.papers[0] ?? null
        const { error: e } = await supabase.from('prep_answer_logs').insert({ node_id: topicId, paper, count, timed, written_on: today })
        ok = !e
        if (ok && topicId) ok = await logEvent(topicId, 'answers', { quantity: count })
        message = `${count} answer${count === 1 ? '' : 's'} logged.`
      } else if (action === 'mock') {
        const num = (v: string) => (v.trim() === '' ? null : Number(v))
        const row = { stage: mock.stage, name: mock.name.trim() || 'Mock test', taken_on: today, score: num(mock.score), max_score: num(mock.max), correct: num(mock.correct), incorrect: num(mock.incorrect), unattempted: num(mock.unattempted), total_questions: null as number | null }
        if (row.score !== null && row.max_score !== null && row.score > row.max_score) { setError('Score cannot be more than the maximum.'); return }
        if (row.correct !== null && row.incorrect !== null && row.unattempted !== null) row.total_questions = row.correct + row.incorrect + row.unattempted
        const { error: e } = await supabase.from('prep_mock_tests').insert(row)
        ok = !e; message = 'Mock test saved.'
      } else if (action === 'current_affairs') {
        if (ca.title.trim().length < 3) { setError('Add a short title.'); return }
        const { data, error: e } = await supabase.from('prep_current_affairs').insert({ title: ca.title.trim(), kind: ca.kind, occurred_on: today }).select('id').single()
        ok = !e
        if (ok && data && topicId) await supabase.from('prep_current_affairs_links').insert({ item_id: data.id, node_id: topicId })
        message = 'Current-affairs note saved.'
      }
      if (!ok) { setError('Could not save. Please try again.'); return }
      onLogged(message)
      onClose()
    } finally { setBusy(false) }
  }

  const topicButton = (n: SyllabusNode, hint?: string) => <button key={n.id} type="button" onClick={() => { setTopicId(n.id); setQuery('') }} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm ${topicId === n.id ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}>
    <span className="min-w-0 flex-1 line-clamp-2 font-semibold">{n.title}</span>{hint && <span className="shrink-0 text-[11px] font-bold text-rose-600 dark:text-rose-400">{hint}</span>}
  </button>
  const stepper = (value: number, set: (v: number) => void, min = 0) => <div className="flex items-center gap-2">
    <button type="button" aria-label="Less" onClick={() => set(Math.max(min, value - 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Minus className="h-4 w-4" /></button>
    <input inputMode="numeric" value={value} onChange={(e) => set(Math.max(min, Math.min(500, Number(e.target.value.replace(/\D/g, '')) || 0)))} className="h-10 w-16 rounded-xl border border-slate-200 bg-white text-center text-base font-bold tabular-nums dark:border-slate-700 dark:bg-slate-900" aria-label="Count" />
    <button type="button" aria-label="More" onClick={() => set(value + 1)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><Plus className="h-4 w-4" /></button>
  </div>

  const canSave = action && (!def?.needsTopic || topicId) && (action !== 'revised' || touched)

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Quick log" onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-center gap-3 px-5 pt-5">
        <h2 className="flex-1 text-lg">{def ? def.label : 'What did you do?'}</h2>
        {action && !initialAction && <button type="button" onClick={() => { setAction(null); setError(null) }} className="text-sm font-bold text-slate-500">Change</button>}
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3">
        {!action && <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map(({ id, label: l, icon: Icon }) => <button key={id} type="button" onClick={() => setAction(id)} className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-bold transition hover:border-amber-500 dark:border-slate-700"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"><Icon className="h-4 w-4" /></span>{l}</button>)}
        </div>}

        {action && action !== 'mock' && <div className="space-y-2">
          <p className={label}>Topic{def?.needsTopic ? '' : ' (optional)'}</p>
          {topic && !q
            ? <div className="flex items-center gap-2 rounded-xl border border-amber-500 bg-amber-500/10 px-3 py-2.5 text-sm"><span className="min-w-0 flex-1 font-semibold">{topic.title}</span><button type="button" onClick={() => setTopicId(null)} className="text-xs font-bold text-slate-500">Change</button></div>
            : <>
              <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Find a topic</span><input autoFocus={!due.length && !recent.length} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a topic" className={`${input} pl-9`} /></label>
              {q ? <div className="space-y-1.5">{results.length ? results.map((n) => topicButton(n)) : <p className="text-sm text-slate-500">No topic matches.</p>}</div>
                : <>
                  {due.length > 0 && <><p className="pt-1 text-xs font-semibold text-slate-500">Due for revision</p><div className="space-y-1.5">{due.slice(0, 5).map((n) => topicButton(n, 'Due'))}</div></>}
                  {recent.length > 0 && <><p className="pt-1 text-xs font-semibold text-slate-500">Recent</p><div className="space-y-1.5">{recent.map((n) => topicButton(n))}</div></>}
                  {!due.length && !recent.length && <p className="text-sm text-slate-500">Search for the topic you worked on.</p>}
                </>}
            </>}
          {action === 'revised' && topicId && !touched && <p className="text-xs text-rose-600">Log this topic as Studied first; revision starts after that.</p>}

          {action === 'pyq' && <div className="grid grid-cols-2 gap-3 pt-2"><div><p className={`${label} mb-1`}>Attempted</p>{stepper(count, setCount, 1)}</div><div><p className={`${label} mb-1`}>Correct</p>{stepper(Math.min(correct, count), setCorrect)}</div></div>}
          {action === 'answers' && <div className="flex items-end justify-between gap-3 pt-2"><div><p className={`${label} mb-1`}>Answers</p>{stepper(count, setCount, 1)}</div>
            <label className="flex items-center gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="h-4 w-4 accent-amber-500" />Timed</label></div>}
          {action === 'current_affairs' && <div className="space-y-2 pt-2">
            <label className={label}>What<input value={ca.title} onChange={(e) => setCa({ ...ca, title: e.target.value })} maxLength={200} placeholder="e.g. SC ruling on electoral bonds" className={`${input} mt-1 normal-case tracking-normal`} /></label>
            <div className="flex flex-wrap gap-1.5">{CA_KINDS.map(([k, l]) => <button key={k} type="button" onClick={() => setCa({ ...ca, kind: k })} className={`rounded-full border px-3 py-1 text-xs font-bold ${ca.kind === k ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-50 dark:bg-slate-50 dark:text-slate-900' : 'border-slate-200 dark:border-slate-700'}`}>{l}</button>)}</div>
          </div>}
        </div>}

        {action === 'mock' && <div className="space-y-3">
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{MOCK_STAGES.map(([id, l, max]) => <button key={id} type="button" onClick={() => setMock({ ...mock, stage: id, max: String(max) })} className={`rounded-lg py-2 text-xs font-bold ${mock.stage === id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{l}</button>)}</div>
          <label className={label}>Test name (optional)<input value={mock.name} onChange={(e) => setMock({ ...mock, name: e.target.value })} maxLength={160} placeholder="e.g. Vision Test 12" className={`${input} mt-1 normal-case tracking-normal`} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className={label}>Score<input inputMode="decimal" value={mock.score} onChange={(e) => setMock({ ...mock, score: e.target.value.replace(/[^\d.-]/g, '') })} className={`${input} mt-1`} /></label>
            <label className={label}>Out of<input inputMode="decimal" value={mock.max} onChange={(e) => setMock({ ...mock, max: e.target.value.replace(/[^\d.]/g, '') })} className={`${input} mt-1`} /></label>
          </div>
          <details><summary className="cursor-pointer text-sm font-bold text-slate-600 dark:text-slate-300">Add question counts (optional)</summary>
            <div className="mt-2 grid grid-cols-3 gap-2">{(['correct', 'incorrect', 'unattempted'] as const).map((k) => <label key={k} className={label}>{k}<input inputMode="numeric" value={mock[k]} onChange={(e) => setMock({ ...mock, [k]: e.target.value.replace(/\D/g, '') })} className={`${input} mt-1`} /></label>)}</div>
          </details>
        </div>}

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      </div>

      {action && <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        <button type="button" disabled={!canSave || busy} onClick={() => void save()} className="w-full rounded-xl bg-amber-500 py-3 text-base font-bold text-slate-950 shadow-sm disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-800">{busy ? 'Saving…' : 'Save'}</button>
      </div>}
    </div>
  </div>
}
