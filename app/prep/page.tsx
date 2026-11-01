'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronDown, HelpCircle, Plus, RotateCcw, Search, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { childrenMap, rollups, stageExplanation, STAGE_LABEL, type Rollup } from '@/lib/prep/explorer'
import { topicStage } from '@/lib/prep/scoring/v1'
import type { Foundation, SyllabusNode, TopicStageName, TopicState } from '@/lib/prep/types'

const TEMPLATE = 'upsc_cse_v1'
const TABS = [['PRE', 'Prelims'], ['MAI', 'Mains'], ['NCERT', 'NCERT']] as const
type TabCode = (typeof TABS)[number][0]

const STAGE_TONE: Record<TopicStageName, string> = {
  not_started: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  touched: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  foundation_complete: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  practised: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  revision_current: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  exam_ready: 'bg-emerald-600 text-white',
  revision_due: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
}
const FOUNDATION_ITEMS: [keyof Foundation, string][] = [['read', 'Core source read'], ['highlighted', 'Important parts highlighted'], ['notes', 'Concise notes made'], ['open_notes', 'Notes leave room for additions'], ['limited_sources', 'Sources kept limited']]

interface Row { id: string; parent_id: string | null; kind: SyllabusNode['kind']; code: string | null; title: string; stages: string[]; papers: string[]; weight: number; pyq_frequency: number | null; sort: number; owner_id: string | null }
interface StateRow { node_id: string; touched_on: string | null; foundation: Foundation | null; revision_count: number; last_revised_on: string | null; interval_days: number | null; next_revision_on: string | null; pyq_attempted: number; pyq_correct: number; answers_written: number }

const toNode = (r: Row): SyllabusNode => ({ id: r.id, parentId: r.parent_id, kind: r.kind, code: r.code, title: r.title, stages: r.stages as SyllabusNode['stages'], papers: r.papers, weight: Number(r.weight), pyqFrequency: r.pyq_frequency, sort: r.sort, ownerId: r.owner_id })
const toState = (r: StateRow): TopicState => ({ nodeId: r.node_id, touchedOn: r.touched_on, foundation: r.foundation ?? {}, revisionCount: r.revision_count, lastRevisedOn: r.last_revised_on, intervalDays: r.interval_days, nextRevisionOn: r.next_revision_on, pyqAttempted: r.pyq_attempted, pyqCorrect: r.pyq_correct, answersWritten: r.answers_written })
const STATE_COLS = 'node_id,touched_on,foundation,revision_count,last_revised_on,interval_days,next_revision_on,pyq_attempted,pyq_correct,answers_written'
const prettyDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '')

/** Syllabus explorer (beta): browse the official syllabus, see each topic's stage, and log in three taps. */
export default function PrepExplorerPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [nodes, setNodes] = useState<SyllabusNode[]>([])
  const [states, setStates] = useState<Map<string, TopicState>>(new Map())
  const [tab, setTab] = useState<TabCode>('PRE')
  const [filter, setFilter] = useState<'all' | 'due'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const today = localDateString()

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login?next=/prep'); return }
    const { data: allowed } = await supabase.rpc('has_feature', { feature: 'prep' })
    if (allowed !== true) { setStatus('denied'); return }
    const { data: template, error: tError } = await supabase.from('prep_exam_templates').select('id').eq('code', TEMPLATE).maybeSingle()
    if (tError || !template) { setStatus('error'); return }
    const [{ data: rows, error: nError }, { data: stateRows, error: sError }] = await Promise.all([
      supabase.from('prep_syllabus_nodes').select('id,parent_id,kind,code,title,stages,papers,weight,pyq_frequency,sort,owner_id').eq('template_id', template.id),
      supabase.from('prep_topic_state').select(STATE_COLS),
    ])
    if (nError || sError) { setStatus('error'); return }
    setTemplateId(template.id)
    setNodes(((rows ?? []) as Row[]).map(toNode))
    setStates(new Map(((stateRows ?? []) as StateRow[]).map((r) => [r.node_id, toState(r)])))
    setStatus('ready')
  }, [router])

  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(t) }, [toast])

  const kids = useMemo(() => childrenMap(nodes), [nodes])
  const roll = useMemo(() => rollups(nodes, [...states.values()], today), [nodes, states, today])
  const byCode = useMemo(() => new Map(nodes.map((n) => [n.code ?? n.id, n])), [nodes])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const refreshState = useCallback(async (nodeId: string) => {
    const { data } = await supabase.from('prep_topic_state').select(STATE_COLS).eq('node_id', nodeId).maybeSingle()
    setStates((current) => { const next = new Map(current); if (data) next.set(nodeId, toState(data as StateRow)); return next })
  }, [])

  const log = useCallback(async (nodeId: string, kind: 'studied' | 'revised' | 'foundation', details: Record<string, unknown> = {}) => {
    const { error } = await supabase.from('prep_events').insert({ node_id: nodeId, kind, details, occurred_on: today })
    if (error) { setToast('Could not save. Please try again.'); return }
    await refreshState(nodeId)
  }, [refreshState, today])

  if (status === 'loading') return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3, 4].map((k) => <div key={k} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (status === 'denied') return <Center title="Not available yet" body="The preparation tracker is in a private beta." />
  if (status === 'error') return <Center title="Couldn't load your syllabus" body="Check your connection and try again." action={() => { setStatus('loading'); void load() }} />

  const root = byCode.get(tab)
  const rootRoll = root ? roll.get(root.id) : undefined
  const allTopics = nodes.filter((n) => n.kind === 'topic')
  const dueTotal = allTopics.filter((n) => topicStage(states.get(n.id), today) === 'revision_due').length
  const touchedTotal = allTopics.filter((n) => states.get(n.id)?.touchedOn).length
  const q = query.trim().toLowerCase()
  const matches = (n: SyllabusNode) => (!q || n.title.toLowerCase().includes(q)) && (filter === 'all' || topicStage(states.get(n.id), today) === 'revision_due')
  const toggle = (id: string) => setOpen((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const isOpen = (id: string) => open.has(id) || Boolean(q) || filter === 'due'

  const topicRow = (t: SyllabusNode) => {
    const s = states.get(t.id)
    const stage = topicStage(s, today)
    return <button key={t.id} type="button" onClick={() => setSelected(t.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <span className="min-w-0 flex-1"><span className="line-clamp-2 text-sm font-semibold leading-snug">{t.title}</span>{s?.nextRevisionOn && stage !== 'not_started' && <span className="block text-xs text-slate-500">{stage === 'revision_due' ? `Revision was due ${prettyDate(s.nextRevisionOn)}` : `Next revision ${prettyDate(s.nextRevisionOn)}`}</span>}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STAGE_TONE[stage]}`}>{STAGE_LABEL[stage]}</span>
    </button>
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Syllabus</h1><p className="text-sm text-slate-500">UPSC Civil Services · {touchedTotal} of {allTopics.length} topics touched{dueTotal ? ` · ${dueTotal} revision due` : ''}</p></div>
      </header>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {TABS.map(([code, label]) => <button key={code} type="button" role="tab" aria-selected={tab === code} onClick={() => setTab(code)} className={`rounded-lg py-2 text-sm font-bold transition ${tab === code ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Find a topic</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a topic" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
        {tab !== 'NCERT' && <button type="button" onClick={() => setFilter(filter === 'due' ? 'all' : 'due')} aria-pressed={filter === 'due'} className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-bold ${filter === 'due' ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700'}`}>Due{dueTotal ? ` (${dueTotal})` : ''}</button>}
      </div>

      {tab !== 'NCERT' && rootRoll && <Progress roll={rootRoll} label={`${TABS.find(([c]) => c === tab)![1]} topics`} />}

      <div className="mt-3 space-y-3">
        {tab === 'NCERT'
          ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="border-b border-slate-100 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-800">Start at Class 12 and work back to Class 5. Log a book as studied when you finish reading it.</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">{(root ? kids.get(root.id) ?? [] : []).filter((b) => !q || b.title.toLowerCase().includes(q)).map(topicRow)}</div>
            </section>
          : (root ? kids.get(root.id) ?? [] : []).map((paper) => {
              const subjects = (kids.get(paper.id) ?? []).map((subject) => ({ subject, topics: (kids.get(subject.id) ?? []).filter((t) => t.kind === 'topic' && matches(t)) })).filter((x) => x.topics.length > 0)
              if (subjects.length === 0) return null
              const r = roll.get(paper.id)!
              return <section key={paper.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <button type="button" onClick={() => toggle(paper.id)} aria-expanded={isOpen(paper.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-snug">{paper.title}</span><span className="mt-1 block text-xs text-slate-500">{r.touched} of {r.topics} touched{r.due ? ` · ${r.due} due` : ''}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${r.topics ? Math.round((r.touched / r.topics) * 100) : 0}%` }} /></span></span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isOpen(paper.id) ? 'rotate-180' : ''}`} />
                </button>
                {isOpen(paper.id) && <div className="border-t border-slate-100 dark:border-slate-800">
                  {subjects.map(({ subject, topics }) => <div key={subject.id}>
                    {subject.title !== paper.title && <p className="bg-slate-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">{subject.title}</p>}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">{topics.map(topicRow)}</div>
                  </div>)}
                </div>}
              </section>
            })}
        {filter === 'due' && dueTotal === 0 && <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">Nothing is due for revision.</p>}
      </div>

      {selected && byId.get(selected) && templateId && <TopicSheet
        node={byId.get(selected)!} path={pathOf(selected, byId)} state={states.get(selected)} today={today}
        customs={(kids.get(selected) ?? []).filter((c) => c.ownerId)}
        onClose={() => setSelected(null)}
        onLog={async (kind, details, message) => { await log(selected, kind, details); if (message) setToast(message) }}
        onAddSubtopic={async (title) => {
          const { data: { session } } = await supabase.auth.getSession()
          const { data, error } = await supabase.from('prep_syllabus_nodes').insert({ template_id: templateId, parent_id: selected, kind: 'subtopic', title, owner_id: session?.user.id, source: 'user', stages: byId.get(selected)!.stages, papers: byId.get(selected)!.papers }).select('id,parent_id,kind,code,title,stages,papers,weight,pyq_frequency,sort,owner_id').single()
          if (error || !data) { setToast('Could not add the subtopic.'); return }
          setNodes((cur) => [...cur, toNode(data as Row)])
        }}
      />}

      {toast && <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg dark:bg-slate-50 dark:text-slate-900">{toast}</div>}
    </main>
  )
}

function pathOf(id: string, byId: Map<string, SyllabusNode>): string {
  const parts: string[] = []
  let cur = byId.get(id)?.parentId
  while (cur) { const n = byId.get(cur); if (!n || n.kind === 'stage') break; parts.unshift(n.title.replace(/^Paper [IVX]+: /, '').split(' (')[0]); cur = n.parentId }
  return [...new Set(parts)].join(' · ')
}

function Progress({ roll, label }: { roll: Rollup; label: string }) {
  return <div className="mt-3 grid grid-cols-3 gap-2 text-center">
    {[[roll.touched, `of ${roll.topics} touched`], [roll.foundation, 'foundation done'], [roll.due, 'revision due']].map(([value, sub], i) => <div key={i} className="rounded-xl bg-white px-2 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><p className="text-xl font-extrabold tabular-nums">{value}</p><p className="text-[11px] font-semibold text-slate-500">{sub}</p></div>)}
    <p className="sr-only">{label}</p>
  </div>
}

function Center({ title, body, action }: { title: string; body: string; action?: () => void }) {
  return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{body}</p>
    {action ? <button type="button" onClick={action} className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Try again</button> : <Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Back to Today</Link>}</div></main>
}

function TopicSheet({ node, path, state, today, customs, onClose, onLog, onAddSubtopic }: {
  node: SyllabusNode; path: string; state: TopicState | undefined; today: string; customs: SyllabusNode[]
  onClose: () => void
  onLog: (kind: 'studied' | 'revised' | 'foundation', details: Record<string, unknown>, message: string | null) => Promise<void>
  onAddSubtopic: (title: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [why, setWhy] = useState(false)
  const [subtopic, setSubtopic] = useState('')
  const info = stageExplanation(state, today)
  const touched = Boolean(state?.touchedOn)
  const revisedToday = state?.lastRevisedOn === today
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn() } finally { setBusy(false) } }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={node.title} onClick={(e) => e.stopPropagation()} className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{path && <p className="text-xs font-semibold text-slate-500">{path}</p>}<h2 className="mt-0.5 text-lg leading-snug">{node.title}</h2></div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STAGE_TONE[info.stage]}`}>{STAGE_LABEL[info.stage]}</span>
        {state?.nextRevisionOn && <span className="text-xs text-slate-500">{info.stage === 'revision_due' ? 'Was due' : 'Next revision'} {prettyDate(state.nextRevisionOn)}</span>}
        <button type="button" onClick={() => setWhy(!why)} aria-expanded={why} className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300"><HelpCircle className="h-4 w-4" />Why?</button>
      </div>
      {why && <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><ul className="space-y-1">{info.reasons.map((r) => <li key={r}>{r}</li>)}</ul>{info.next && <p className="mt-2 font-semibold text-slate-900 dark:text-white">Next step: {info.next}</p>}</div>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => run(() => onLog('studied', {}, touched ? 'Logged study time.' : 'Logged. First revision in 3 days.'))} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-sm disabled:opacity-60"><Check className="h-4 w-4" />{touched ? 'Studied again' : 'Studied'}</button>
        <button type="button" disabled={busy || !touched || revisedToday} onClick={() => run(() => onLog('revised', {}, 'Revision logged.'))} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 py-3 text-sm font-bold disabled:opacity-40 dark:border-slate-600"><RotateCcw className="h-4 w-4" />{revisedToday ? 'Revised today' : 'Revised'}</button>
      </div>
      {!touched && <p className="mt-2 text-xs text-slate-500">Revision unlocks after you log this topic as studied.</p>}

      <details className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">Foundation checklist <span className="font-normal text-slate-500">(optional)</span></summary>
        <div className="space-y-1 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {FOUNDATION_ITEMS.map(([key, label]) => <label key={key} className="flex items-center gap-2.5 py-1 text-sm">
            <input type="checkbox" disabled={busy} checked={Boolean(state?.foundation[key])} onChange={(e) => run(() => onLog('foundation', { foundation: { [key]: e.target.checked } }, null))} className="h-4 w-4 accent-amber-500" />{label}
          </label>)}
        </div>
      </details>

      <details className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">My subtopics <span className="font-normal text-slate-500">(private)</span></summary>
        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {customs.length > 0 && <ul className="mb-2 space-y-1 text-sm">{customs.map((c) => <li key={c.id}>· {c.title}</li>)}</ul>}
          <form onSubmit={(e) => { e.preventDefault(); const title = subtopic.trim(); if (title.length < 2) return; void run(async () => { await onAddSubtopic(title); setSubtopic('') }) }} className="flex gap-2">
            <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} maxLength={200} placeholder="e.g. Article 21 judgments" aria-label="New subtopic" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <button type="submit" disabled={busy || subtopic.trim().length < 2} aria-label="Add subtopic" className="grid w-10 place-items-center rounded-lg bg-slate-900 text-white disabled:opacity-40 dark:bg-slate-50 dark:text-slate-900"><Plus className="h-4 w-4" /></button>
          </form>
        </div>
      </details>
    </div>
  </div>
}
