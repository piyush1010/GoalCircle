'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { confirmAction } from '@/lib/confirm'
import { REPORT_REASONS, saveError } from '@/lib/discussions'

/** Block someone after asking. Returns true when they're blocked. */
export async function blockPerson(authorId: string, authorName: string) {
  if (!(await confirmAction(`Block ${authorName}? You won't see each other's posts or answers any more. You can unblock them in Settings.`, { confirmLabel: 'Block', danger: true }))) return false
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  const { error } = await supabase.from('blocks').upsert({ blocker_id: session.user.id, blocked_id: authorId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })
  return !error
}

/**
 * Report a post or an answer: pick a reason, send. Afterwards you can also block the person.
 * Three reports from different people hide it straight away.
 */
export default function ReportSheet({ postId, commentId, authorId, authorName, onClose, onHidden, onBlocked }: {
  postId?: string; commentId?: string; authorId: string; authorName: string
  onClose: () => void; onHidden?: () => void; onBlocked?: () => void
}) {
  const [reason, setReason] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const what = commentId ? 'answer' : 'post'

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])

  const send = async () => {
    if (!reason) return
    setBusy(true); setError(null)
    const { data, error: e } = await supabase.rpc('community_report', { target_post: postId ?? null, target_comment: commentId ?? null, why: reason })
    setBusy(false)
    if (e) { setError(saveError(e.message)); return }
    setSent(true)
    if (data === true) onHidden?.()
  }

  const block = async () => {
    setBusy(true); setError(null)
    const ok = await blockPerson(authorId, authorName)
    setBusy(false)
    if (!ok) return
    onBlocked?.()
    onClose()
  }

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Report this ${what}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{sent ? 'Thanks for telling us' : `Report this ${what}`}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      {!sent ? <>
        <p className="mt-1 text-sm text-slate-500">What’s wrong with it? {authorName} won’t know who reported it.</p>
        <div role="radiogroup" aria-label="Reason" className="mt-4 space-y-2">
          {REPORT_REASONS.map(([key, label]) => <button key={key} type="button" role="radio" aria-checked={reason === key} onClick={() => setReason(key)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] ${reason === key ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-700'}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${reason === key ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'}`}>{reason === key && <span className="h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-white" />}</span>{label}
          </button>)}
        </div>
        <button type="button" disabled={!reason || busy} onClick={() => void send()} className="mt-4 h-12 w-full rounded-2xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Sending…' : 'Report'}</button>
      </> : <>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">If a few people report the same {what}, it’s hidden straight away, and we look at every report.</p>
        <button type="button" disabled={busy} onClick={() => void block()} className="mt-4 h-12 w-full rounded-2xl border border-slate-200 text-[15px] font-semibold text-rose-600 disabled:opacity-50 dark:border-slate-700 dark:text-rose-400">Block {authorName}</button>
        <button type="button" onClick={onClose} className="mt-2 h-12 w-full rounded-2xl bg-slate-900 text-[15px] font-semibold text-white dark:bg-white dark:text-slate-900">Done</button>
      </>}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  </div>
}
