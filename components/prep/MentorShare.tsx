'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '@/utils/supabase'

type Scope = 'nothing' | 'summary' | 'full'
const SCOPES: [Scope, string, string][] = [
  ['nothing', 'Private', 'Your mentor sees nothing.'],
  ['summary', 'Summary', 'Exam, subtopics ticked, revisions overdue, study days this week.'],
  ['full', 'Full', 'Summary plus your last 3 mocks and open mistakes count.'],
]

/** Per-batch consent: the student decides what, if anything, the batch mentor can see. Private by default. */
export default function MentorShare({ userId }: { userId: string | null }) {
  const [batches, setBatches] = useState<{ id: string; name: string; scope: Scope }[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let alive = true
    void (async () => {
      const [{ data: rows }, { data: shares }] = await Promise.all([
        supabase.from('circle_memberships').select('circle_id, circles(name)').eq('user_id', userId).eq('role', 'member'),
        supabase.from('prep_mentor_shares').select('circle_id, scope'),
      ])
      if (!alive) return
      const scopeOf = new Map(((shares ?? []) as { circle_id: string; scope: string }[]).map((r) => [r.circle_id, (r.scope === 'summary' || r.scope === 'full' ? r.scope : 'nothing') as Scope]))
      setBatches(((rows ?? []) as unknown as { circle_id: string; circles: { name: string } | { name: string }[] | null }[]).map((r) => ({
        id: r.circle_id, name: (Array.isArray(r.circles) ? r.circles[0]?.name : r.circles?.name) ?? 'Your batch', scope: scopeOf.get(r.circle_id) ?? 'nothing',
      })))
    })()
    return () => { alive = false }
  }, [userId])

  if (!batches || batches.length === 0) return null

  const choose = async (id: string, scope: Scope) => {
    setBusy(id); setError(null)
    const { error: e } = await supabase.from('prep_mentor_shares').upsert({ student_id: userId, circle_id: id, scope }, { onConflict: 'student_id,circle_id' })
    setBusy(null)
    if (e) { setError('Could not save. Please try again.'); return }
    setBatches((cur) => cur?.map((b) => (b.id === id ? { ...b, scope } : b)) ?? null)
  }

  return <section className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <h2 className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-emerald-600" />Share with your mentor</h2>
    <p className="text-xs text-slate-500">Off unless you turn it on. Change it any time; your notes and individual ticks are never shared.</p>
    <div className="mt-3 space-y-3">{batches.map((b) => <div key={b.id}>
      <p className="text-sm font-semibold">{b.name}</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{SCOPES.map(([id, label]) => <button key={id} type="button" disabled={busy !== null} onClick={() => void choose(b.id, id)} aria-pressed={b.scope === id} className={`rounded-lg py-2 text-xs font-bold ${b.scope === id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{label}</button>)}</div>
      <p className="mt-1 text-xs text-slate-500">{SCOPES.find(([id]) => id === b.scope)![2]}</p>
    </div>)}</div>
    {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
  </section>
}
