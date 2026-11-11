'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { localDateString } from '@/lib/exams'
import { addDays } from '@/lib/prep/revision'
import { enablePush, pushIsOn, pushSupported } from '@/lib/push'
import type { ExamTemplate, PrepProfile } from '@/lib/prep/usePrepData'
import type { SyllabusNode } from '@/lib/prep/types'
import { examInfo } from '@/lib/prep/exam'
import { usePrepLang } from '@/lib/prep/i18n'

export const EXAM_SHORT: Record<string, string> = { upsc_cse_v1: 'UPSC CSE', uppcs_v1: 'UPPCS', bpsc_v1: 'BPSC', jkpsc_cce_v1: 'JKPSC CCE', hpsc_hcs_v1: 'HCS (Haryana)', ssc_cgl_v1: 'SSC CGL', bank_po_v1: 'Bank PO', ctet_v1: 'CTET', uptet_v1: 'UPTET', up_pcsj_v1: 'UP PCS-J', mp_civil_judge_v1: 'MP Civil Judge', mpsc_rajyaseva_v1: 'MPSC Rajyaseva', cds_v1: 'UPSC CDS', cat_v1: 'CAT (MBA)' }
const HOURS = [2, 4, 6, 8, 10]
const QUICK = [['3 months', 91], ['5 months', 152], ['1 year', 365]] as const
const hourLabel = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`
/** For exams held in shifts: the date the student confirmed as their own shift (kept on this device). */
export const shiftKey = (templateId: string) => `goalyaar-shift-date-${templateId}`
export const readShiftDate = (templateId: string | null) => { if (!templateId) return null; try { return window.localStorage.getItem(shiftKey(templateId)) } catch { return null } }

/** One screen of setup: which exam, which stage, by when, how many hours, and a reminder. Everything can be changed later. */
export default function PrepSetup({ templates, templateId, profile, optionals = [], onSave, onClose, onRemove }: {
  templates: ExamTemplate[]; templateId: string | null; profile: PrepProfile
  optionals?: SyllabusNode[] // optional subjects of the current exam, if it has any
  onSave: (next: Partial<PrepProfile> & { templateId?: string }) => Promise<boolean>
  onClose: () => void
  onRemove?: () => Promise<boolean> // stop preparing for this exam (only when there is more than one)
}) {
  const today = localDateString()
  const [exam] = useState(templateId ?? templates[0]?.id ?? '')
  const [stage, setStage] = useState<PrepProfile['targetStage']>(profile.targetStage)
  const [date, setDate] = useState(profile.examDate ?? '')
  const [hours, setHours] = useState(profile.dailyMinutes ? Math.round(profile.dailyMinutes / 60) : 6)
  const [reminder, setReminder] = useState(profile.reminderEnabled)
  const [hour, setHour] = useState(profile.reminderHour)
  const [optional, setOptional] = useState(profile.optionalSubjectId ?? '')
  const [busy, setBusy] = useState(false)
  const [lang, setLang, t] = usePrepLang()
  const [error, setError] = useState<string | null>(null)
  const [ownShift, setOwnShift] = useState(() => typeof window !== 'undefined' && Boolean(profile.examDate) && readShiftDate(templateId) === profile.examDate)

  const stagesFor = examInfo(templates.find((t) => t.id === exam)?.code).targetStages
  const presets = examInfo(templates.find((t) => t.id === exam)?.code).presets.filter((p) => p.date > today)
  const shifts = examInfo(templates.find((t) => t.id === exam)?.code).shifts
  const inShifts = Boolean(shifts?.stages.includes(stagesFor.includes(stage) ? stage : stagesFor[0]))
  const save = async () => {
    if (!date || date <= today) { setError('Pick a target date in the future.'); return }
    setBusy(true); setError(null)
    // A new goal (exam, stage or date) starts a fresh plan from today; ticks are always kept.
    const finalStage = stagesFor.includes(stage) ? stage : stagesFor[0]
    const restart = exam !== templateId || stage !== profile.targetStage || date !== profile.examDate || !profile.planStartOn
    if (reminder && pushSupported() && !(await pushIsOn())) await enablePush()
    const ok = await onSave({ templateId: exam, targetStage: finalStage, examDate: date, dailyMinutes: Math.min(960, Math.max(15, hours * 60)), planStartOn: restart ? today : profile.planStartOn, reminderEnabled: reminder, reminderHour: hour, optionalSubjectId: exam === templateId ? optional || null : null })
    setBusy(false)
    if (ok) { try { if (inShifts && ownShift) window.localStorage.setItem(shiftKey(exam), date); else window.localStorage.removeItem(shiftKey(exam)) } catch { /* only hides a reminder */ } }
    if (ok) onClose(); else setError('Could not save. Please try again.')
  }

  const chip = (active: boolean) => `rounded-xl border px-3 py-2.5 text-sm font-bold transition ${active ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700'}`

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label="Plan your preparation" onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-slate-900 sm:rounded-3xl">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1"><h2 className="text-lg">{t('Plan your preparation')}</h2><p className="text-sm text-slate-500">Takes 30 seconds. You can change it any time.</p></div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-4 w-4" /></button>
      </div>

      {!profile.saved && <ol className="mt-4 space-y-2 rounded-2xl bg-amber-500/10 p-3 text-sm">
        <li><b>1. Tell us your exam and date.</b> We work out how many subtopics a day you need.</li>
        <li><b>2. Tick what you study.</b> One tap per subtopic; tick whole subjects you have already finished.</li>
        <li><b>3. Revise when reminded.</b> Your progress stays honest: it dips when revision is overdue and comes straight back when you revise.</li>
      </ol>}

      <p className="mt-5 text-sm font-bold">{t('Exam')}</p>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm dark:border-slate-700"><span className="font-semibold">{EXAM_SHORT[templates.find((x) => x.id === exam)?.code ?? ''] ?? templates.find((x) => x.id === exam)?.name ?? 'Your exam'}</span><a href="/prep/start?add=1" className="text-xs font-bold text-amber-700 dark:text-amber-400">Add another exam</a></div>

      {stagesFor.length > 1 && <>
        <p className="mt-5 text-sm font-bold">{t('Preparing for')}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">{stagesFor.map((s) => <button key={s} type="button" onClick={() => setStage(s)} aria-pressed={stage === s} className={chip(stage === s)}>{s === 'prelims' ? 'Prelims' : 'Mains'}</button>)}</div>
      </>}

      {exam === templateId && optionals.length > 0 && <>
        <label className="mt-5 block text-sm font-bold" htmlFor="prep-optional">Optional subject</label>
        <select id="prep-optional" value={optional} onChange={(e) => setOptional(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900">
          <option value="">Not decided yet</option>
          {optionals.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
        <p className="mt-1 text-xs text-slate-500">Included in your Mains plan; the other optionals are hidden from your syllabus.</p>
      </>}

      <label className="mt-5 block text-sm font-bold" htmlFor="prep-date">{inShifts && !ownShift ? 'First day of the exam window' : t('Finish by (exam date)')}</label>
      <input id="prep-date" type="date" min={addDays(today, 7)} value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
      {presets.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{presets.map((p) => <button key={p.date} type="button" onClick={() => { setDate(p.date); setStage(p.stage) }} title={p.source} className={`rounded-full border px-3 py-1 text-xs font-bold ${date === p.date ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300' : 'border-amber-500/40 text-amber-800 dark:text-amber-300'}`}>{p.label}</button>)}</div>}
      {presets.length > 0 && <p className="mt-1 text-[11px] text-slate-500">Official dates as announced. Check the commission’s site before relying on them.</p>}
      {inShifts && shifts && <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        <p>{shifts.window} {shifts.admitCard}</p>
        <p className="mt-1">Until then, plan to the first day so you are ready whichever shift you get. Your plan stretches to fit once you set your own date.</p>
        <label className="mt-2 flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><input type="checkbox" checked={ownShift} onChange={(e) => setOwnShift(e.target.checked)} className="h-4 w-4 accent-amber-500" />This is my own shift date</label>
      </div>}
      <div className="mt-2 flex flex-wrap gap-2">{QUICK.map(([label, days]) => <button key={label} type="button" onClick={() => setDate(addDays(today, days))} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold dark:border-slate-700">In {label}</button>)}</div>

      <p className="mt-5 text-sm font-bold">{t('Study hours a day')}</p>
      <div className="mt-2 grid grid-cols-5 gap-2">{HOURS.map((h) => <button key={h} type="button" onClick={() => setHours(h)} aria-pressed={hours === h} className={chip(hours === h)}>{h}h</button>)}</div>

      <div className="mt-5 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <label className="flex items-center gap-3"><Bell className="h-5 w-5 shrink-0 text-amber-600" /><span className="min-w-0 flex-1 text-sm"><b>{t('Daily study reminder')}</b><span className="block text-xs text-slate-500">Today&apos;s target and revisions due. Skipped on days you have already logged.</span></span>
          <input type="checkbox" checked={reminder} onChange={(e) => setReminder(e.target.checked)} className="h-5 w-5 accent-amber-500" /></label>
        {reminder && <label className="mt-3 flex items-center justify-between gap-3 text-sm">At<select value={hour} onChange={(e) => setHour(Number(e.target.value))} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">{Array.from({ length: 19 }, (_, i) => i + 5).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}</select></label>}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3"><span className="text-sm font-bold">{t('Language')}</span>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">{([['en', 'English'], ['hi', 'हिंदी']] as const).map(([id, l]) => <button key={id} type="button" onClick={() => setLang(id)} aria-pressed={lang === id} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${lang === id ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>{l}</button>)}</div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
      <button type="button" disabled={busy || !exam} onClick={() => void save()} className="mt-5 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 shadow-sm disabled:opacity-60">{busy ? '…' : t('Make my plan')}</button>
      {onRemove && <button type="button" disabled={busy} onClick={async () => { setBusy(true); const ok = await onRemove(); setBusy(false); if (ok) onClose() }} className="mt-3 w-full py-2 text-center text-sm font-semibold text-rose-600">Stop preparing for this exam</button>}
      <p className="mt-2 text-center text-xs text-slate-500">Ticks are saved per exam, so switching back later loses nothing.</p>
    </div>
  </div>
}
