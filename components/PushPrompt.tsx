'use client'

import { Bell } from 'lucide-react'
import { readReminderPreferences, saveReminderPreferences } from '@/lib/notifications/reminderPreferences'
import { saveDailyReminder } from '@/lib/notifications/dailyReminder'
import { useEffect, useState } from 'react'
import { claimNudge } from '@/lib/nudges'
import { CHEER_EVENT } from '@/lib/cheer'
import { enablePush, PUSH_ASKED_KEY, pushSupported, syncPush } from '@/lib/push'
import { supabase } from '@/utils/supabase'

const ASK_AGAIN_DAYS = 7
/** Fire with a title, e.g. after joining a batch or posting a task, to ask at a meaningful moment. */
export const PUSH_MOMENT_EVENT = 'goalcircle:push-moment'

/**
 * Asks to turn on phone notifications right after someone's check-in, when the reason is
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
      timer = window.setTimeout(() => { if (!claimNudge('push', { allowFirstDay: true })) return; setTitle(heading); setShow(true) }, delay)
    }
    const afterCheckin = () => ask('Nice work! Want a reminder tomorrow?', 4200) // after the check-in confirmation
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
      setNote('Done. We’ll remind you at 8 PM if you haven’t checked in. Change it in Settings.'); window.setTimeout(() => setShow(false), 3200)
    }
    else if (result === 'blocked') { setNote('Notifications are blocked. You can allow them in your browser’s site settings.'); window.setTimeout(() => setShow(false), 4000) }
    else setShow(false)
  }

  return (
    <div role="dialog" aria-label="Turn on notifications" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600"><Bell className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-snug">{note ? 'Notifications' : title}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{note || 'We’ll let you know when your mentor posts a task, someone nudges you, or a friend comments. Nothing else.'}</p>
        </div>
      </div>
      {!note && <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={later} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500">Not now</button>
        <button type="button" onClick={() => void allow()} disabled={busy} className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">{busy ? 'One sec…' : 'Allow'}</button>
      </div>}
    </div>
  )
}
