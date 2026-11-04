'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { MISTAKE_LABEL } from '@/lib/prep/insights'
import type { SyllabusNode } from '@/lib/prep/types'

const ORDER = ['concept_not_studied', 'fact_forgotten', 'misread_statement', 'extreme_word', 'similar_options', 'incorrect_elimination', 'overthinking', 'current_affairs_gap', 'careless', 'blind_guess', 'other']

/** Add a mistake in about ten seconds: what kind of mistake, which topic (optional), one line on the right fact. */
export default function MistakeSheet({ nodes, onSave, onClose }: {
  nodes: SyllabusNode[]
  onSave: (m: { nodeId: string | null; category: string; note: string | null }) => Promise<boolean>
  onClose: () => void
}) {
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<SyllabusNode | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const topics = useMemo(() => nodes.filter((n) => n.kind === 'topic' && !n.ownerId), [nodes])
  const q = query.trim().toLowerCase()
  const hits = q.length >= 2 ? topics.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 6) : []

  const save = async () => {
    if (!category) { setError('Pick what kind of mistake it was.'); return }
    setBusy(true); setError(null)
    const ok = await onSave({ nodeId: topic?.id ?? null, category, note: note.trim().slice(0, 500) || null })
    setBusy(false)
    if (ok) onClose(); else setError('Could not save. Please try again.')
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Add a mistake" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><h2 className="text-lg">Add to mistake notebook</h2><p className="text-sm text-slate-500">From a mock, PYQ or answer. You will be reminded to revisit it.</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-4 text-sm font-bold">What went wrong?</p>
      <div className="mt-2 flex flex-wrap gap-1.5">{ORDER.map((c) => <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${category === c ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700'}`}>{MISTAKE_LABEL[c]}</button>)}</div>

      <p className="mt-4 text-sm font-bold">Topic <span className="font-normal text-slate-500">(optional)</span></p>
      {topic
        ? <button type="button" onClick={() => { setTopic(null); setQuery('') }} className="mt-2 flex w-full items-center gap-2 rounded-xl border border-amber-500 bg-amber-500/10 px-3 py-2.5 text-left text-sm font-semibold">{topic.title}<X className="ml-auto h-4 w-4 shrink-0" /></button>
        : <><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to find a topic" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
          {hits.length > 0 && <ul className="mt-1 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">{hits.map((t) => <li key={t.id}><button type="button" onClick={() => setTopic(t)} className="w-full px-3 py-2 text-left text-sm">{t.title}</button></li>)}</ul>}</>}

      <label className="mt-4 block text-sm font-bold" htmlFor="mistake-note">The correct fact or lesson <span className="font-normal text-slate-500">(optional)</span></label>
      <textarea id="mistake-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="e.g. Article 32 is a fundamental right; Article 226 is wider in scope" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />

      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void save()} className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-sm disabled:opacity-60">{busy ? 'Saving…' : 'Save mistake'}</button>
    </div>
  </div>
}
