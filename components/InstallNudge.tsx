'use client'

import { useEffect, useState } from 'react'
import { Smartphone, X } from 'lucide-react'
import { getInstallPrompt, setInstallPrompt, subscribeToInstallPrompt } from '@/lib/pwa'

const DISMISS_KEY = 'goalcircle-install-dismissed'

/** A small "put GoalYaar on your home screen" card for Today, until installed or dismissed. */
export default function InstallNudge() {
  const [show, setShow] = useState(false)
  const [canPrompt, setCanPrompt] = useState(false)
  const [ios, setIos] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
    let dismissedAt = 0
    try { dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0) } catch { /* storage unavailable */ }
    const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent)
    const timer = window.setTimeout(() => {
      setIos(/iPhone|iPad|iPod/.test(navigator.userAgent))
      setCanPrompt(Boolean(getInstallPrompt()))
      setShow(mobile && !standalone && Date.now() - dismissedAt > 7 * 86_400_000)
    }, 0)
    const unsubscribe = subscribeToInstallPrompt(() => setCanPrompt(Boolean(getInstallPrompt())))
    return () => { window.clearTimeout(timer); unsubscribe() }
  }, [])

  if (!show) return null
  const dismiss = () => { try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* storage unavailable */ } setShow(false) }
  const install = async () => {
    const prompt = getInstallPrompt()
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    setInstallPrompt(null)
    if (choice.outcome === 'accepted') setShow(false)
  }

  return (
    <div className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-500/40 dark:bg-amber-500/10">
      <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">Keep GoalYaar on your home screen</p>
        <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{canPrompt ? 'One tap, and it opens like an app.' : ios ? 'In Safari: tap Share, then “Add to Home Screen”. Needed for reminders on iPhone.' : 'In Chrome: tap ⋮ (top right), then “Add to Home screen”.'}</p>
        {canPrompt && <button type="button" onClick={() => void install()} className="mt-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950">Install</button>}
      </div>
      <button type="button" onClick={dismiss} aria-label="Hide" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500"><X className="h-4 w-4" /></button>
    </div>
  )
}
