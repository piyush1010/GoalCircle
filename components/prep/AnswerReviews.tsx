'use client'

import { useEffect, useState } from 'react'
import { Camera, MessageSquareText } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { PROOF_PREFIX, useProofUrl } from '@/lib/proof'
import { mediaLimitError, shrinkImage, toLocalFile, UNREADABLE_FILE } from '@/lib/media'

interface Review { id: string; circle_id: string; question: string | null; image_path: string; submitted_at: string; marks: number | null; max_marks: number; feedback: string | null; reviewed_at: string | null; seen_at: string | null }

/** Student side of answer review: photograph a written answer, send it to a batch mentor, read the marks and feedback. */
export default function AnswerReviews({ userId }: { userId: string | null }) {
  const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [batch, setBatch] = useState('')
  const [question, setQuestion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let alive = true
    void (async () => {
      const [{ data: rows }, { data: r }] = await Promise.all([
        supabase.from('circle_memberships').select('circle_id, circles(name)').eq('user_id', userId).eq('role', 'member'),
        supabase.from('prep_answer_reviews').select('id,circle_id,question,image_path,submitted_at,marks,max_marks,feedback,reviewed_at,seen_at').eq('user_id', userId).order('submitted_at', { ascending: false }).limit(30),
      ])
      if (!alive) return
      const list = ((rows ?? []) as unknown as { circle_id: string; circles: { name: string } | { name: string }[] | null }[]).map((x) => ({ id: x.circle_id, name: (Array.isArray(x.circles) ? x.circles[0]?.name : x.circles?.name) ?? 'Your batch' }))
      setBatches(list); setBatch((b) => b || list[0]?.id || '')
      setReviews((r ?? []) as Review[])
      if ((r ?? []).some((x: Review) => x.reviewed_at && !x.seen_at)) void supabase.rpc('prep_mark_reviews_seen')
    })()
    return () => { alive = false }
  }, [userId])

  if (!userId || batches.length === 0) return null

  const send = async () => {
    if (!file || !batch) return
    setBusy(true); setMsg(null)
    try {
      const local = await toLocalFile(file)
      const limit = mediaLimitError(local)
      if (limit) { setMsg(limit); return }
      const photo = await shrinkImage(local)
      const path = `${userId}/circle-${batch}/answer-${crypto.randomUUID()}.jpg`
      const { error: up } = await supabase.storage.from('batch-proof').upload(path, photo, { contentType: photo.type || 'image/jpeg' })
      if (up) { setMsg('The photo could not be uploaded. Please try again.'); return }
      const { data, error } = await supabase.from('prep_answer_reviews').insert({ circle_id: batch, question: question.trim() || null, image_path: path }).select('id,circle_id,question,image_path,submitted_at,marks,max_marks,feedback,reviewed_at,seen_at').single()
      if (error || !data) { setMsg('Could not send. Please try again.'); return }
      setReviews((cur) => [data as Review, ...(cur ?? [])]); setFile(null); setQuestion(''); setMsg('Sent to your mentor.')
    } catch { setMsg(UNREADABLE_FILE) } finally { setBusy(false) }
  }

  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="flex items-center gap-2 text-base"><MessageSquareText className="h-4 w-4 text-amber-600" />Answer review</h2>
    <p className="text-xs text-slate-500">Photograph a written answer and your batch mentor marks it. Only you and the mentor can see it.</p>
    <div className="mt-3 space-y-2">
      {batches.length > 1 && <select value={batch} onChange={(e) => setBatch(e.target.value)} aria-label="Batch" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">{batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
      <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={500} placeholder="Question (optional), e.g. GS2: Role of the Governor" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
      <div className="flex gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-bold dark:border-slate-600"><Camera className="h-4 w-4" />{file ? 'Photo ready' : 'Add photo'}<input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <button type="button" disabled={!file || busy} onClick={() => void send()} className="shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? 'Sending…' : 'Send'}</button>
      </div>
      {msg && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{msg}</p>}
    </div>
    {reviews && reviews.length > 0 && <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">{reviews.map((r) => <li key={r.id} className="py-2.5">
      <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-start gap-3 text-left">
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{r.question ?? 'Answer'}</span><span className="block text-xs text-slate-500">{new Date(r.submitted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}{r.reviewed_at ? '' : ' · waiting for review'}</span></span>
        {r.reviewed_at && <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{r.marks !== null ? `${r.marks}/${r.max_marks}` : 'Reviewed'}</span>}
      </button>
      {open === r.id && <ReviewDetail review={r} />}
    </li>)}</ul>}
  </section>
}

function ReviewDetail({ review }: { review: Review }) {
  const url = useProofUrl(PROOF_PREFIX + review.image_path)
  return <div className="mt-2 space-y-2">
    {review.feedback && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">{review.feedback}</p>}
    {url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt="Your answer" className="max-h-72 w-full rounded-xl object-contain" /></a> : <div className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />}
  </div>
}
