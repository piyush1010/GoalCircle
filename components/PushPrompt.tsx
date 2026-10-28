'use client'

import { readReminderPreferences, saveReminderPreferences } from '@/lib/notifications/reminderPreferences'
import { saveDailyReminder } from '@/lib/notifications/dailyReminder'
import { useEffect, useState } from 'react'
import { GoalieBot } from '@/components/GoalieBot'
import { CHEER_EVENT } from '@/lib/goalie'
import { enablePush, PUSH_ASKED_KEY, pushSupported, syncPush } from '@/lib/push'
import { supabase } from '@/utils/supabase'

const ASK_AGAIN_DAYS = 7
/** Fire with a title, e.g. after joining a batch or posting a task, to ask at a meaningful moment. */
export const PUSH_MOMENT_EVENT = 'goalcircle:push-moment'

/**
 * Goalie asks to turn on phone notifications right after someone's check-in, when the reason is
 * obvious ("Want me to remind you tomorrow?"), instead of on first open. Asks again after a week
 * if dismissed.
 */
export default function PushPrompt() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [title, setTitle] = useState('Nice work! Want a reminder tomorrow?')

  useEffect(() => {
    if (!pushSupported()) return
    void supabase.auth.getSession().then(({ data: { session } }) => { if (session?.user && Notification.permission === 'granted') void syncPush() })
    let timer: number | undefined
    const ask = (heading: string, delay: number) => {
      if (Notification.permission !== 'default') return
      let askedAt = 0
      try { askedAt = Number(window.localStorage.getItem(PUSH_ASKED_KEY) || 0) } catch { /* storage unavailable */ }
      if (Date.now() - askedAt < ASK_AGAIN_DAYS * 86_400_000) return
      timer = window.setTimeout(() => { setTitle(heading); setShow(true) }, delay)
    }
    const afterCheckin = () => ask('Nice work! Want a reminder tomorrow?', 4200) // after Goalie's cheer
    const atMoment = (event: Event) => ask(String((event as CustomEvent<string>).detail || 'Want a buzz when it matters?'), 1500)
    window.addEventListener(CHEER_EVENT, afterCheckin)
    window.addEventListener(PUSH_MOMENT_EVENT, atMoment)
    // The cheer can fire just before a page change; catch it on the next page too.
    try { if (window.sessionStorage.getItem('goalcircle-cheer') === '1') afterCheckin() } catch { /* storage unavailable */ }
    return () => { window.removeEventListener(CHEER_EVENT, afterCheckin); window.removeEventListener(PUSH_MOMENT_EVENT, atMoment); window.clearTimeout(timer) }
  }, [])

  if (!show) return null

  const later = () => { try { window.localStorage.setItem(PUSH_ASKED_KEY, String(Date.now())) } catch { /* storage unavailable */ } setShow(false) }
  const allow = async () => {
    setBusy(true)
    const result = await enablePush()
    setBusy(false)
    if (result === 'on') {
      // Saying yes here also turns on the one daily reminder (8 PM, only if you haven't checked in).
      if (!readReminderPreferences().enabled) {
        const prefs = readReminderPreferences()
        saveReminderPreferences({ ...prefs, enabled: true, time: '20:00' })
        void saveDailyReminder(true, '20:00')
      }
      setNote('Done! I’ll remind you at 8 PM if you haven’t checked in. Change it in Settings.'); window.setTimeout(() => setShow(false), 3200)
    }
    else if (result === 'blocked') { setNote('Notifications are blocked. You can allow them in your browser’s site settings.'); window.setTimeout(() => setShow(false), 4000) }
    else setShow(false)
  }

  return (
    <div role="dialog" aria-label="Turn on notifications" className="goalie-bubble fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border-[3px] border-slate-900 bg-white p-4 text-slate-900 shadow-[5px_5px_0_#0f172a]">
      <div className="flex items-start gap-3">
        <GoalieBot size={52} mood="wave" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-snug">{note ? 'Notifications' : title}</h2>
          <p className="mt-1 text-sm font-medium text-slate-700">{note || 'I’ll buzz you when your mentor posts a task, someone nudges you, or a friend comments. No spam, promise.'}</p>
        </div>
      </div>
      {!note && <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={later} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500">Not now</button>
        <button type="button" onClick={() => void allow()} disabled={busy} className="rounded-xl border-2 border-slate-900 bg-amber-400 px-5 py-2 text-sm font-bold shadow-[2px_2px_0_#0f172a] disabled:opacity-60">{busy ? 'One sec…' : 'Allow'}</button>
      </div>}
    </div>
  )
}
