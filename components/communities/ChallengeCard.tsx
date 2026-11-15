'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { challengeLine, describe, endsLine, type CommunityRow } from '@/lib/communities'

/**
 * This week's challenge in one community. Progress fills in by itself from what you log,
 * so the only buttons are Join and, once joined, Leave.
 */
export default function ChallengeCard({ row, onChange, showWhere = true }: { row: CommunityRow; onChange: (next: CommunityRow) => void; showWhere?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const d = describe(row.key)
  const done = Math.min(row.my_progress, row.target)
  const finished = row.my_progress >= row.target

  const set = async (takePart: boolean) => {
    setBusy(true); setError(null)
    const { error: e } = await supabase.rpc('community_challenge_set', { target_community: row.key, take_part: takePart })
    setBusy(false)
    if (e) { setError('That didn’t save. Please try again.'); return }
    const counted = finished ? 1 : 0
    onChange({ ...row, in_challenge: takePart, challenge_joined: Math.max(0, row.challenge_joined + (takePart ? 1 : -1)), challenge_finished: Math.max(0, row.challenge_finished + (takePart ? counted : -counted)) })
  }

  return <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-medium text-slate-500">{showWhere ? `${d.name}, ${endsLine()}` : `This week, ${endsLine()}`}</p>
    <div className="mt-1 flex items-start gap-3">
      <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{d.challenge(row.target)}</h3>
      {!row.in_challenge && <button type="button" disabled={busy} onClick={() => void set(true)} className="h-9 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Join</button>}
    </div>
    {row.in_challenge && <>
      <div className="mt-3 flex items-center gap-3">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className={`block h-full rounded-full ${finished ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.round((done / row.target) * 100)}%` }} /></span>
        {finished
          ? <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />Done</span>
          : <span className="shrink-0 text-sm font-semibold tabular-nums">{done} of {row.target}</span>}
      </div>
      {!finished && done === 0 && <p className="mt-2 text-sm text-slate-500">It counts by itself as you {row.key.startsWith('exam:') ? 'study and revise' : 'check in on your goal'}.</p>}
    </>}
    <div className="mt-2 flex items-center justify-between gap-3">
      <p className="text-sm text-slate-500">{challengeLine(row)}</p>
      {row.in_challenge && <button type="button" disabled={busy} onClick={() => void set(false)} className="shrink-0 text-sm font-medium text-slate-500 underline-offset-2 hover:underline disabled:opacity-50">Leave</button>}
    </div>
    {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
  </article>
}
