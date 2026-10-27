'use client'

import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { disablePush, enablePush, pushIsOn, pushSupported } from '@/lib/push'

/** Settings switch for phone notifications on this device. */
export default function PushToggle() {
  const [supported, setSupported] = useState(true)
  const [on, setOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    const ok = pushSupported()
    setSupported(ok)
    if (ok) void pushIsOn().then(setOn)
  }, [])

  const toggle = async () => {
    setBusy(true); setNote('')
    if (on) { await disablePush(); setOn(false) }
    else {
      const result = await enablePush()
      setOn(result === 'on')
      if (result === 'blocked') setNote('Blocked in your browser. Allow notifications for this site in its settings, then try again.')
      if (result === 'error') setNote('Couldn’t turn on. Please try again.')
    }
    setBusy(false)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <BellRing className="h-5 w-5 shrink-0 text-amber-500" />
        <span className="flex-1"><span className="block text-sm font-bold">Phone notifications</span>
          <span className="block text-xs text-slate-500">{supported ? 'Tasks, notices, nudges and comments, even when the app is closed.' : 'On iPhone: add GoalCircle to your Home Screen from Safari first.'}</span></span>
        {supported && <button type="button" role="switch" aria-checked={on} aria-label="Phone notifications" onClick={() => void toggle()} disabled={busy} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${on ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`} /></button>}
      </div>
      {note && <p role="status" className="mt-2 text-xs font-semibold text-rose-600">{note}</p>}
    </div>
  )
}
