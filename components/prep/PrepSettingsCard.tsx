'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { announcePrepActive } from '@/lib/prep/active'

/** Settings: start exam preparation any time, pause it after the exam, or change exam/date. Nothing is deleted. */
export default function PrepSettingsCard() {
  const [state, setState] = useState<{ loaded: boolean; userId: string | null; has: boolean; active: boolean; exam: string | null }>({ loaded: false, userId: null, has: false, active: false, exam: null })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('prep_profiles').select('active, prep_exam_templates(name)').eq('user_id', session.user.id).maybeSingle()
      if (!alive) return
      const row = data as unknown as { active: boolean | null; prep_exam_templates: { name: string } | { name: string }[] | null } | null
      const t = row?.prep_exam_templates
      setState({ loaded: true, userId: session.user.id, has: Boolean(row), active: row?.active !== false, exam: (Array.isArray(t) ? t[0]?.name : t?.name) ?? null })
    })()
    return () => { alive = false }
  }, [])

  if (!state.loaded) return null
  const toggle = async () => {
    if (!state.userId) return
    setBusy(true)
    const { error } = await supabase.from('prep_profiles').update({ active: !state.active, updated_at: new Date().toISOString() }).eq('user_id', state.userId)
    setBusy(false)
    if (!error) { setState({ ...state, active: !state.active }); announcePrepActive(!state.active) }
  }

  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500"><GraduationCap className="h-3.5 w-3.5" />Exam preparation</p>
    {!state.has
      ? <div className="flex items-center gap-3"><p className="min-w-0 flex-1 text-sm text-slate-600 dark:text-slate-300">Get a daily study plan for UPSC, state PCS, SSC, banking, teaching exams or CAT.</p>
          <Link href="/prep/start" onClick={() => { try { window.localStorage.removeItem('goalyaar-prep-invite') } catch { /* nothing to clear */ } }} className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Start</Link></div>
      : <>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><h3 className="text-sm font-bold">Preparing for an exam</h3><p className="text-xs text-slate-500">{state.active ? `${state.exam ?? 'Your exam'} plan on Today, with reminders` : 'Paused. Your ticks and history are kept.'}</p></div>
          <button type="button" disabled={busy} onClick={() => void toggle()} aria-pressed={state.active} aria-label="Preparing for an exam" className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${state.active ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}><span className={`absolute top-1 block h-4 w-4 rounded-full bg-white transition-transform ${state.active ? 'left-6' : 'left-1'}`} /></button>
        </div>
        {state.active && <Link href="/prep/plan?exams=1" className="block text-sm font-bold text-amber-700 dark:text-amber-400">Your exams: add, change or remove →</Link>}
      </>}
  </div>
}
