'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { GoalieBot } from '@/components/GoalieBot'
import { enablePush, PUSH_ASKED_KEY, pushSupported, syncPush } from '@/lib/push'
import { supabase } from '@/utils/supabase'

const ASK_AGAIN_DAYS = 7
const ASK_ON = ['/feed', '/circles', '/dashboard', '/profile']

/** Goalie asks once (and again after a week if dismissed) to turn on phone notifications. */
export default function PushPrompt() {
  const pathname = usePathname() || '/'
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!pushSupported()) return
    let timer: number | undefined
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      if (Notification.permission === 'granted') { void syncPush(); return }
      if (Notification.permission === 'denied') return
      let askedAt = 0
      try { askedAt = Number(window.localStorage.getItem(PUSH_ASKED_KEY) || 0) } catch { /* storage unavailable */ }
      if (Date.now() - askedAt < ASK_AGAIN_DAYS * 86_400_000) return
      if (!ASK_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return
      timer = window.setTimeout(() => setShow(true), 4000)
    })()
    return () => window.clearTimeout(timer)
  }, [pathname])

  if (!show) return null

  const later = () => { try { window.localStorage.setItem(PUSH_ASKED_KEY, String(Date.now())) } catch { /* storage unavailable */ } setShow(false) }
  const allow = async () => {
    setBusy(true)
    const result = await enablePush()
    setBusy(false)
    if (result === 'on') { setNote('Done! I’ll buzz you when it matters 🔔'); window.setTimeout(() => setShow(false), 2200) }
    else if (result === 'blocked') { setNote('Notifications are blocked. You can allow them in your browser’s site settings.'); window.setTimeout(() => setShow(false), 4000) }
    else setShow(false)
  }

  return (
    <div role="dialog" aria-label="Turn on notifications" className="goalie-bubble fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-3xl border-[3px] border-slate-900 bg-white p-4 text-slate-900 shadow-[5px_5px_0_#0f172a]">
      <div className="flex items-start gap-3">
        <GoalieBot size={52} mood="wave" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-black leading-snug">{note ? 'Notifications' : 'Can I buzz you?'}</h2>
          <p className="mt-1 text-sm font-medium text-slate-700">{note || 'Only when your mentor posts a task, someone nudges you, or a friend comments. No spam, promise.'}</p>
        </div>
      </div>
      {!note && <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={later} className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-500">Not now</button>
        <button type="button" onClick={() => void allow()} disabled={busy} className="rounded-xl border-2 border-slate-900 bg-amber-400 px-5 py-2 text-sm font-black shadow-[2px_2px_0_#0f172a] disabled:opacity-60">{busy ? 'One sec…' : 'Allow'}</button>
      </div>}
    </div>
  )
}
