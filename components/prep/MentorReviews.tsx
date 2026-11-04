'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { PROOF_PREFIX, useProofUrl } from '@/lib/proof'

interface Item { id: string; user_id: string; question: string | null; image_path: string; submitted_at: string; marks: number | null; max_marks: number; feedback: string | null; reviewed_at: string | null }

/** Mentor side of answer review: answers students sent to this batch, newest unreviewed first. */
export default function MentorReviews({ circleId }: { circleId: string }) {
  const [items, setItems] = useState<Item[] | null>(null)
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [showDone, setShowDone] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('prep_answer_reviews').select('id,user_id,question,image_path,submitted_at,marks,max_marks,feedback,reviewed_at').eq('circle_id', circleId).order('submitted_at', { ascending: false }).limit(100)
    const list = (data ?? []) as Item[]
    setItems(list)
    const ids = [...new Set(list.map((x) => x.user_id))]
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id,full_name,username').in('id', ids)
      setNames(new Map(((p ?? []) as { id: string; full_name: string | null; username: string | null }[]).map((x) => [x.id, x.full_name || x.username || 'Student'])))
    }
  }, [circleId])
  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t) }, [load])

  if (!items || items.length === 0) return null
  const waiting = items.filter((x) => !x.reviewed_at)
  const done = items.filter((x) => x.reviewed_at)

  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-base">Answers to review <span className="text-sm font-normal text-slate-500">· {waiting.length} waiting</span></h2>
    <div className="mt-2 space-y-4">{waiting.map((x) => <ReviewForm key={x.id} item={x} name={names.get(x.user_id) ?? 'Student'} onDone={() => void load()} />)}</div>
    {waiting.length === 0 && <p className="mt-1 text-sm text-slate-500">All caught up.</p>}
    {done.length > 0 && <button type="button" onClick={() => setShowDone(!showDone)} className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-300">{showDone ? 'Hide' : 'Show'} {done.length} reviewed</button>}
    {showDone && <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">{done.map((x) => <li key={x.id} className="py-2"><b>{names.get(x.user_id) ?? 'Student'}</b> · {x.question ?? 'Answer'} · {x.marks ?? '–'}/{x.max_marks}</li>)}</ul>}
  </section>
}

function ReviewForm({ item, name, onDone }: { item: Item; name: string; onDone: () => void }) {
  const url = useProofUrl(PROOF_PREFIX + item.image_path)
  const [marks, setMarks] = useState('')
  const max = String(item.max_marks)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async () => {
    const m = marks === '' ? null : Number(marks)
    if (m !== null && (!Number.isFinite(m) || m < 0 || m > Number(max))) { setError(`Marks must be between 0 and ${max}.`); return }
    setBusy(true); setError(null)
    const { error: e } = await supabase.rpc('prep_review_answer', { target: item.id, given_marks: m, given_feedback: feedback })
    setBusy(false)
    if (e) setError('Could not save. Please try again.'); else onDone()
  }
  return <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
    <p className="text-sm"><b>{name}</b> · {item.question ?? 'Answer'} <span className="text-xs text-slate-500">· {new Date(item.submitted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span></p>
    {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Answer by ${name}`} className="mt-2 max-h-80 w-full rounded-lg object-contain" /></a> : <div className="mt-2 h-32 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />}
    <div className="mt-2 flex items-center gap-2 text-sm">Marks<input inputMode="decimal" value={marks} onChange={(e) => setMarks(e.target.value.replace(/[^\d.]/g, ''))} aria-label="Marks" className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900" />out of<span className="font-bold">{max}</span></div>
    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1500} rows={2} placeholder="What to keep, what to improve" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    <button type="button" disabled={busy || (marks === '' && !feedback.trim())} onClick={() => void save()} className="mt-2 w-full rounded-lg bg-slate-900 py-2 text-sm font-bold text-white disabled:opacity-40 dark:bg-slate-50 dark:text-slate-900">{busy ? 'Saving…' : 'Send review'}</button>
  </div>
}
