'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { blockPerson } from '@/components/communities/ReportSheet'

const PERSON_REASONS: [string, string][] = [
  ['spam', 'Spam or an advert'],
  ['rude', 'Rude, hurtful or hateful'],
  ['unsafe', 'Sexual, violent or puts someone at risk'],
  ['fake', 'Fake account or pretending to be someone'],
  ['other', 'Something else'],
]

/**
 * Report a person, or something they wrote that isn't a community post (a check-in, a comment,
 * their profile). Reports go to the app's moderators; afterwards you can also block them.
 */
export default function ReportBlockModal({ targetUserId, isOpen, onClose, name = 'this member', what = 'profile', context, onBlocked }: {
  targetUserId: string; isOpen: boolean; onClose: () => void
  name?: string; what?: 'profile' | 'post' | 'comment'; context?: string; onBlocked?: () => void
}) {
  const [reason, setReason] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const send = async () => {
    if (!reason) return
    setBusy(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }
    const label = PERSON_REASONS.find(([key]) => key === reason)?.[1] ?? reason
    const detail = context ? `${label}. ${what === 'profile' ? 'Profile' : what === 'post' ? 'Post' : 'Comment'}: ${context.slice(0, 300)}` : label
    const { error: e } = await supabase.from('reports').insert({ reporter_id: session.user.id, target_user_id: targetUserId, reason: detail })
    setBusy(false)
    if (e) { setError('The report was not sent. Check your connection and try again.'); return }
    setSent(true)
  }

  const block = async () => {
    setBusy(true)
    const ok = await blockPerson(targetUserId, name)
    setBusy(false)
    if (!ok) return
    onBlocked?.()
    onClose()
  }

  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`Report this ${what}`} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 dark:bg-slate-900 sm:rounded-3xl sm:pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{sent ? 'Thanks for telling us' : `Report this ${what}`}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      {!sent ? <>
        <p className="mt-1 text-sm text-slate-500">What&apos;s wrong? {name === 'this member' ? 'They' : name} won&apos;t know who reported it.</p>
        <div role="radiogroup" aria-label="Reason" className="mt-4 space-y-2">
          {PERSON_REASONS.map(([key, label]) => <button key={key} type="button" role="radio" aria-checked={reason === key} onClick={() => setReason(key)}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] ${reason === key ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-700'}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${reason === key ? 'border-slate-900 dark:border-white' : 'border-slate-300 dark:border-slate-600'}`}>{reason === key && <span className="h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-white" />}</span>{label}
          </button>)}
        </div>
        <button type="button" disabled={!reason || busy} onClick={() => void send()} className="mt-4 h-12 w-full rounded-2xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Sending…' : 'Report'}</button>
        <button type="button" disabled={busy} onClick={() => void block()} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 text-[15px] font-semibold text-rose-600 disabled:opacity-50 dark:border-slate-700 dark:text-rose-400">Block {name}</button>
      </> : <>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">We look at every report, usually within a day, and remove anything that breaks the rules.</p>
        <button type="button" disabled={busy} onClick={() => void block()} className="mt-4 h-12 w-full rounded-2xl border border-slate-200 text-[15px] font-semibold text-rose-600 disabled:opacity-50 dark:border-slate-700 dark:text-rose-400">Block {name}</button>
        <button type="button" onClick={onClose} className="mt-2 h-12 w-full rounded-2xl bg-slate-900 text-[15px] font-semibold text-white dark:bg-white dark:text-slate-900">Done</button>
      </>}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
    </div>
  </div>
}
