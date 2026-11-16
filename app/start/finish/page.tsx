'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrepData } from '@/lib/prep/usePrepData'
import { examInfo } from '@/lib/prep/exam'
import { localDateString } from '@/lib/exams'
import { clearDraft, HABITS, readDraft } from '@/lib/startDraft'
import { supabase } from '@/utils/supabase'

/**
 * Straight after sign-up: turns the setup answers kept on this device into an exam plan and goals,
 * then opens Home. Students who have covered part of the syllabus first tick off what they have done.
 */
export default function StartFinishPage() {
  const router = useRouter()
  const data = usePrepData(true)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (data.status === 'error') { const t = window.setTimeout(() => setError('Your plan could not be created. Check your connection and try again.'), 0); return () => window.clearTimeout(t) }
    if (data.status !== 'ready' || started.current) return
    started.current = true
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login?next=/start/finish'); return }
      const draft = readDraft()
      if (!draft) { router.replace('/dashboard'); return }

      if (draft.exam) {
        const template = data.templates.find((t) => t.code === draft.exam!.code)
        if (template && !data.plans.some((p) => p.templateId === template.id)) {
          const info = examInfo(template.code)
          const ok = await data.saveProfile({
            templateId: template.id, examDate: draft.exam.date, targetStage: info.targetStages.includes(draft.exam.stage) ? draft.exam.stage : info.targetStages[0],
            dailyMinutes: draft.exam.hours * 60, planStartOn: localDateString(), level: draft.exam.level, active: true, reminderEnabled: true,
          })
          if (!ok) { setError('Your exam plan could not be saved. Please try again.'); started.current = false; return }
        }
      }

      for (const habit of draft.habits) {
        const title = habit.title.trim()
        if (!title) continue
        const { data: goalId, error: goalError } = await supabase.rpc('create_goal_post', { goal_title: title, goal_visibility: draft.share ? 'public' : 'private', announcement_media_url: null, announcement_type: 'text', achievement_date: habit.finishBy && habit.finishBy >= localDateString() ? habit.finishBy : null, announcement_caption: null, track_title: null, track_artist: null, track_artwork_url: null, track_preview_url: null, track_source: null })
        if (goalError || typeof goalId !== 'string') { setError('One of your goals could not be saved. Please try again.'); started.current = false; return }
        const category = HABITS.find((h) => h.id === habit.id)?.category ?? 'personal'
        const settings = { category, frequency: habit.perWeek >= 7 ? 'daily' : 'weekly', times_per_week: habit.perWeek >= 7 ? null : habit.perWeek }
        const { error: unitError } = await supabase.from('goals').update({ ...settings, ...(habit.unit ? { track_unit: habit.unit } : {}) }).eq('id', goalId).eq('user_id', session.user.id)
        // Before the goal-numbers migration runs, save the rest without the unit.
        if (unitError && habit.unit) await supabase.from('goals').update(settings).eq('id', goalId).eq('user_id', session.user.id)
      }

      clearDraft()
      router.replace(draft.exam && draft.exam.level !== 'beginner' ? '/prep/start?step=4&from=start' : '/dashboard')
    })()
  }, [data, router])

  return <main className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-6 text-center">
    {error
      ? <div><h1 className="text-xl font-bold">Something went wrong</h1><p className="mt-2 text-sm text-slate-500">{error}</p><button type="button" onClick={() => { setError(null); started.current = false; void data.reload() }} className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Try again</button></div>
      : <div aria-busy="true"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-800 dark:border-t-white" /><p className="mt-4 text-[15px] font-medium">Setting up your plan…</p></div>}
  </main>
}
