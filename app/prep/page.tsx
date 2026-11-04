'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronDown, HelpCircle, Plus, Search, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { localDateString } from '@/lib/exams'
import { childrenMap, rollups, stageExplanation, STAGE_LABEL, type Rollup } from '@/lib/prep/explorer'
import { studyShares, topicStage } from '@/lib/prep/scoring/v2'
import { NODE_COLS, toNode, usePrepData } from '@/lib/prep/usePrepData'
import type { Foundation, SyllabusNode, TopicStageName, TopicState } from '@/lib/prep/types'
import { examInfo } from '@/lib/prep/exam'
import { optionalSubjects } from '@/lib/prep/pace'
import RecallButton from '@/components/prep/RecallButton'
import PrepNav from '@/components/prep/PrepNav'

type TabCode = string

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
const prettyDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '')

/** Syllabus (beta): tick the subtopics you have studied; progress, revision and plans all follow from the ticks. */
export default function PrepExplorerPage() {
  const router = useRouter()
  const data = usePrepData(true)
  const { nodes, states, setNodes } = data
  const [tab, setTab] = useState<TabCode>('PRE')
  const [filter, setFilter] = useState<'all' | 'due'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [bulk, setBulk] = useState<string | null>(null)
  const [confirmBulk, setConfirmBulk] = useState<{ title: string; ids: string[] } | null>(null)
  const today = localDateString()

  // Deep links from Today and Progress: /prep?filter=due, /prep?topic=<id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = window.setTimeout(() => {
      if (params.get('filter') === 'due') setFilter('due')
      const topic = params.get('topic')
      if (topic) setSelected(topic)
    }, 0)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => { if (data.status === 'denied') { void supabase.auth.getSession().then(({ data: { session } }) => { if (!session) router.replace('/login?next=/prep') }) } }, [data.status, router])
  // Not set up yet: start with the step-by-step setup.
  useEffect(() => { if (data.status === 'ready' && !data.profile.saved) router.replace('/prep/start') }, [data.status, data.profile.saved, router])
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3200); return () => window.clearTimeout(t) }, [toast])

  const kids = useMemo(() => childrenMap(nodes), [nodes])
  const stateList = useMemo(() => [...states.values()], [states])
  const roll = useMemo(() => rollups(nodes, stateList, today), [nodes, stateList, today])
  const shares = useMemo(() => studyShares(nodes, states), [nodes, states])
  const byCode = useMemo(() => new Map(nodes.filter((n) => n.kind === 'stage').map((n) => [n.code ?? n.id, n])), [nodes])
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  if (data.status === 'loading') return <main className="mx-auto max-w-xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3, 4].map((k) => <div key={k} className="h-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (data.status === 'denied') return <Center title="Not available yet" body="The preparation tracker is in a private beta." />
  if (data.status === 'error') return <Center title="Couldn't load your syllabus" body="Check your connection and try again." action={() => void data.reload()} />

  const shareOf = (id: string) => shares.get(id) ?? (states.get(id)?.touchedOn ? 1 : 0)
  const stageOf = (id: string) => topicStage(states.get(id), shareOf(id), today)
  const officialSubs = (id: string) => (kids.get(id) ?? []).filter((c) => c.kind === 'subtopic' && !c.ownerId)
  const tabs = examInfo(data.template?.code).tabs.filter((t) => byCode.has(t.root))
  const root = byCode.get(tab) ?? byCode.get(tabs[0]?.root ?? 'PRE')
  const rootRoll = root ? roll.get(root.id) : undefined
  const allTopics = nodes.filter((n) => n.kind === 'topic' && !n.ownerId)
  const dueTotal = allTopics.filter((n) => stageOf(n.id) === 'revision_due').length
  const allSubs = nodes.filter((n) => n.kind === 'subtopic' && !n.ownerId)
  const tickedTotal = allSubs.filter((n) => states.get(n.id)?.touchedOn).length
  const q = query.trim().toLowerCase()
  const matches = (n: SyllabusNode) => (!q || n.title.toLowerCase().includes(q) || officialSubs(n.id).some((s) => s.title.toLowerCase().includes(q))) && (filter === 'all' || stageOf(n.id) === 'revision_due')
  const toggle = (id: string) => setOpen((cur) => { const next = new Set(cur); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const isOpen = (id: string) => open.has(id) || Boolean(q) || filter === 'due'

  const topicRow = (t: SyllabusNode) => {
    const s = states.get(t.id)
    const stage = stageOf(t.id)
    const subs = officialSubs(t.id)
    const ticked = subs.filter((x) => states.get(x.id)?.touchedOn).length
    return <button key={t.id} type="button" onClick={() => setSelected(t.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm font-semibold leading-snug">{t.title}</span>
        <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          {subs.length > 0 && <span className="tabular-nums">{ticked}/{subs.length} subtopics</span>}
          {s?.nextRevisionOn && stage !== 'not_started' && <span>{stage === 'revision_due' ? `Revision was due ${prettyDate(s.nextRevisionOn)}` : `Revise ${prettyDate(s.nextRevisionOn)}`}</span>}
        </span>
        {subs.length > 0 && <span className="mt-1 block h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${Math.round((ticked / subs.length) * 100)}%` }} /></span>}
      </span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STAGE_TONE[stage]}`}>{STAGE_LABEL[stage]}</span>
    </button>
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-28 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link href="/dashboard" aria-label="Back to Today" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1"><h1 className="text-2xl leading-tight">Syllabus</h1><p className="text-sm text-slate-500">{data.template?.name ?? 'Your exam'} · {tickedTotal} of {allSubs.length} subtopics ticked{dueTotal ? ` · ${dueTotal} revision due` : ''}</p></div>
      </header>
      <PrepNav active="/prep" />

      <div className={`grid gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 ${tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`} role="tablist">
        {tabs.map(({ root: code, label }) => <button key={code} type="button" role="tab" aria-selected={tab === code} onClick={() => setTab(code)} className={`rounded-lg py-2 text-sm font-bold transition ${tab === code ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Find a topic</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a topic or subtopic" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
        {tab !== 'NCERT' && <button type="button" onClick={() => setFilter(filter === 'due' ? 'all' : 'due')} aria-pressed={filter === 'due'} className={`shrink-0 rounded-xl border px-3 py-2.5 text-sm font-bold ${filter === 'due' ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400' : 'border-slate-200 dark:border-slate-700'}`}>Due{dueTotal ? ` (${dueTotal})` : ''}</button>}
      </div>

      {tab !== 'NCERT' && rootRoll && <Progress roll={rootRoll} />}
      {tab !== 'NCERT' && tickedTotal === 0 && <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-900 dark:text-amber-200">Open any topic and tick the subtopics you have already studied. Your progress, revision dates and plan are built from these ticks.</p>}

      {tab === 'MAI' && !data.profile.optionalSubjectId && optionalSubjects(nodes).length > 0 && <label className="mt-3 block rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm">
        <span className="font-bold">Pick your optional</span> <span className="text-slate-600 dark:text-slate-300">to hide the other {optionalSubjects(nodes).length - 1} and add it to your plan.</span>
        <select defaultValue="" onChange={async (e) => { if (!e.target.value) return; const ok = await data.saveProfile({ optionalSubjectId: e.target.value }); setToast(ok ? 'Optional saved.' : 'Set your exam date in My plan first.') }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="">Choose…</option>{optionalSubjects(nodes).map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
      </label>}

      <div className="mt-3 space-y-3">
        {tab === 'NCERT'
          ? <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="border-b border-slate-100 px-3 py-2.5 text-sm text-slate-500 dark:border-slate-800">Start at Class 12 and work back to Class 5. Mark a book as read when you finish it.</p>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">{(root ? kids.get(root.id) ?? [] : []).filter((b) => !q || b.title.toLowerCase().includes(q)).map(topicRow)}</div>
            </section>
          : (root ? kids.get(root.id) ?? [] : []).map((paper) => {
              const chosenOpt = (paper.code ?? '').endsWith('.OPT') ? data.profile.optionalSubjectId : null
              const subjects = (kids.get(paper.id) ?? []).filter((subject) => !chosenOpt || subject.id === chosenOpt).map((subject) => ({ subject, topics: (kids.get(subject.id) ?? []).filter((t) => t.kind === 'topic' && matches(t)) })).filter((x) => x.topics.length > 0)
              if (subjects.length === 0) return null
              const r = roll.get(chosenOpt ?? paper.id) ?? roll.get(paper.id)!
              const pct = r.subtopics ? Math.round((r.ticked / r.subtopics) * 100) : r.topics ? Math.round((r.complete / r.topics) * 100) : 0
              return <section key={paper.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <button type="button" onClick={() => toggle(paper.id)} aria-expanded={isOpen(paper.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-bold leading-snug">{paper.title}</span><span className="mt-1 block text-xs text-slate-500">{r.subtopics ? `${r.ticked} of ${r.subtopics} subtopics` : `${r.complete} of ${r.topics} topics`}{r.due ? ` · ${r.due} due` : ''}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} /></span></span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition ${isOpen(paper.id) ? 'rotate-180' : ''}`} />
                </button>
                {isOpen(paper.id) && <div className="border-t border-slate-100 dark:border-slate-800">
                  {subjects.map(({ subject, topics }) => <div key={subject.id}>
                    {(() => {
                      const left = topics.flatMap((t) => { const subs = officialSubs(t.id); return subs.length ? subs : [t] }).filter((u) => !states.get(u.id)?.touchedOn)
                      return <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 dark:bg-slate-800/60">
                        <p className="min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">{subject.title !== paper.title ? subject.title : 'Topics'}</p>
                        {left.length > 0 && filter === 'all' && !q && <button type="button" disabled={bulk !== null} onClick={() => setConfirmBulk({ title: subject.title, ids: left.map((u) => u.id) })} className="shrink-0 text-[11px] font-bold text-amber-700 disabled:opacity-50 dark:text-amber-400">{bulk === subject.title ? 'Ticking…' : 'Already done? Tick all'}</button>}
                      </div>
                    })()}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">{topics.map(topicRow)}</div>
                  </div>)}
                </div>}
              </section>
            })}
        {filter === 'due' && dueTotal === 0 && <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">Nothing is due for revision.</p>}
      </div>

      {selected && byId.get(selected) && data.templateId && <TopicSheet
        node={byId.get(selected)!} path={pathOf(selected, byId)} state={states.get(selected)} states={states} today={today}
        share={shareOf(selected)}
        subtopics={officialSubs(selected)}
        customs={(kids.get(selected) ?? []).filter((c) => c.ownerId)}
        onClose={() => setSelected(null)}
        onTick={async (id, on) => { const ok = await data.tick(id, on); if (!ok) setToast('Could not save. Please try again.') }}
        onLog={async (kind, details, message) => { const ok = await data.logEvent(selected, kind, { details }); setToast(ok ? message : 'Could not save. Please try again.') }}
        onAddSubtopic={async (title) => {
          const parent = byId.get(selected)!
          const { data: row, error } = await supabase.from('prep_syllabus_nodes').insert({ template_id: data.templateId, parent_id: selected, kind: 'subtopic', title, owner_id: data.userId, source: 'user', stages: parent.stages, papers: parent.papers }).select(NODE_COLS).single()
          if (error || !row) { setToast('Could not add the subtopic.'); return }
          setNodes((cur) => [...cur, toNode(row as unknown as Parameters<typeof toNode>[0])])
        }}
      />}

      {confirmBulk && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={() => setConfirmBulk(null)}>
        <div role="dialog" aria-modal="true" aria-label="Tick all" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
          <h2 className="text-lg">Tick all of {confirmBulk.title}?</h2>
          <p className="mt-1 text-sm text-slate-500">{confirmBulk.ids.length} subtopics will be marked as studied today, and revision dates will start. Only do this for what you have genuinely covered; you can untick any of them later.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setConfirmBulk(null)} className="rounded-xl border border-slate-300 py-3 text-sm font-bold dark:border-slate-600">Cancel</button>
            <button type="button" onClick={async () => { const job = confirmBulk; setConfirmBulk(null); setBulk(job.title); const ok = await data.tickMany(job.ids); setBulk(null); setToast(ok ? `${job.ids.length} ticked in ${job.title}.` : 'Some could not be saved. Please try again.') }} className="rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950">Tick {confirmBulk.ids.length}</button>
          </div>
        </div>
      </div>}

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

function Progress({ roll }: { roll: Rollup }) {
  return <div className="mt-3 grid grid-cols-3 gap-2 text-center">
    {[[`${roll.ticked}`, `of ${roll.subtopics} subtopics`], [`${roll.complete}`, `of ${roll.topics} topics done`], [`${roll.due}`, 'revision due']].map(([value, sub], i) => <div key={i} className="rounded-xl bg-white px-2 py-2.5 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><p className="text-xl font-extrabold tabular-nums">{value}</p><p className="text-[11px] font-semibold text-slate-500">{sub}</p></div>)}
  </div>
}

function Center({ title, body, action }: { title: string; body: string; action?: () => void }) {
  return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{body}</p>
    {action ? <button type="button" onClick={action} className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Try again</button> : <Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Back to Today</Link>}</div></main>
}

function TopicSheet({ node, path, state, states, today, share, subtopics, customs, onClose, onTick, onLog, onAddSubtopic }: {
  node: SyllabusNode; path: string; state: TopicState | undefined; states: Map<string, TopicState>; today: string; share: number
  subtopics: SyllabusNode[]; customs: SyllabusNode[]
  onClose: () => void
  onTick: (id: string, on: boolean) => Promise<void>
  onLog: (kind: 'revised' | 'foundation', details: Record<string, unknown>, message: string) => Promise<void>
  onAddSubtopic: (title: string) => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [why, setWhy] = useState(false)
  const [subtopic, setSubtopic] = useState('')
  const ticked = subtopics.filter((s) => states.get(s.id)?.touchedOn).length
  const info = stageExplanation(state, share, { ticked, total: subtopics.length }, today)
  const touched = Boolean(state?.touchedOn)
  const revisedToday = state?.lastRevisedOn === today
  const run = async (key: string, fn: () => Promise<void>) => { if (busy) return; setBusy(key); try { await fn() } finally { setBusy(null) } }
  const tickRow = (s: SyllabusNode, mine = false) => {
    const on = Boolean(states.get(s.id)?.touchedOn)
    return <li key={s.id}><label className="flex cursor-pointer items-start gap-3 py-2">
      <input type="checkbox" checked={on} disabled={busy !== null} onChange={() => void run(s.id, () => onTick(s.id, !on))} className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500" />
      <span className={`text-sm leading-snug ${on ? 'text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' : ''}`}>{s.title}{mine && <span className="ml-1 text-xs text-slate-400">(mine)</span>}</span>
    </label></li>
  }

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

      {subtopics.length > 0
        ? <div className="mt-4">
            <div className="flex items-center justify-between"><p className="text-sm font-bold">Subtopics <span className="font-normal tabular-nums text-slate-500">{ticked}/{subtopics.length}</span></p>
              {ticked < subtopics.length && <button type="button" disabled={busy !== null} onClick={() => void run('all', async () => { for (const s of subtopics) if (!states.get(s.id)?.touchedOn) await onTick(s.id, true) })} className="text-xs font-bold text-amber-700 disabled:opacity-50 dark:text-amber-400">{busy === 'all' ? 'Ticking…' : 'Tick all'}</button>}</div>
            <p className="text-xs text-slate-500">Tick a subtopic once you have studied it.</p>
            <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">{subtopics.map((s) => tickRow(s))}{customs.map((s) => tickRow(s, true))}</ul>
          </div>
        : <button type="button" disabled={busy !== null} onClick={() => void run('self', () => onTick(node.id, !touched))} className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold shadow-sm disabled:opacity-60 ${touched ? 'border border-slate-300 dark:border-slate-600' : 'bg-amber-500 text-slate-950'}`}><Check className="h-4 w-4" />{touched ? (node.kind === 'ncert_book' ? 'Read · tap to undo' : 'Studied · tap to undo') : (node.kind === 'ncert_book' ? 'Mark as read' : 'Mark as studied')}</button>}

      {node.kind !== 'ncert_book' && <>
        <div className="mt-3"><RecallButton block disabled={busy !== null || !touched || revisedToday} label={revisedToday ? 'Revised today' : 'I revised this topic'} onPick={(recall) => run('rev', () => onLog('revised', { recall }, recall === 'little' ? 'Saved. It comes back in 3 days.' : recall === 'some' ? 'Saved. Same gap as last time.' : 'Revision logged. The next gap is longer.'))} /></div>
        {!touched && <p className="mt-2 text-xs text-slate-500">Revision unlocks after you tick at least one subtopic.</p>}
      </>}

      {node.kind === 'topic' && <details className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">Add my own subtopic <span className="font-normal text-slate-500">(private)</span></summary>
        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          <p className="mb-2 text-xs text-slate-500">Your own subtopics are for your notes; progress counts the official ones.</p>
          <form onSubmit={(e) => { e.preventDefault(); const title = subtopic.trim(); if (title.length < 2) return; void run('add', async () => { await onAddSubtopic(title); setSubtopic('') }) }} className="flex gap-2">
            <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} maxLength={200} placeholder="e.g. Article 21 judgments" aria-label="New subtopic" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <button type="submit" disabled={busy !== null || subtopic.trim().length < 2} aria-label="Add subtopic" className="grid w-10 place-items-center rounded-lg bg-slate-900 text-white disabled:opacity-40 dark:bg-slate-50 dark:text-slate-900"><Plus className="h-4 w-4" /></button>
          </form>
        </div>
      </details>}

      {node.kind === 'topic' && <details className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700">
        <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-bold [&::-webkit-details-marker]:hidden">Study checklist <span className="font-normal text-slate-500">(optional)</span></summary>
        <div className="space-y-1 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {FOUNDATION_ITEMS.map(([key, label]) => <label key={key} className="flex items-center gap-2.5 py-1 text-sm">
            <input type="checkbox" disabled={busy !== null || !touched} checked={Boolean(state?.foundation[key])} onChange={(e) => void run(key, () => onLog('foundation', { foundation: { [key]: e.target.checked } }, 'Saved.'))} className="h-4 w-4 accent-amber-500" />{label}
          </label>)}
        </div>
      </details>}
    </div>
  </div>
}
