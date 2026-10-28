'use client'

import { useEffect, useState } from 'react'
import { Check, Download, Smartphone } from 'lucide-react'
import { getInstallPrompt, setInstallPrompt, subscribeToInstallPrompt } from '@/lib/pwa'

export default function InstallAppCard() {
  const [installAvailable, setInstallAvailable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const refresh = () => setInstallAvailable(Boolean(getInstallPrompt()))
    const unsubscribe = subscribeToInstallPrompt(refresh)
    const installed = () => { setIsInstalled(true); setMessage('GoalYaar is installed.') }
    const loadDeviceState = window.setTimeout(() => {
      setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)
      setIsIos(/iPad|iPhone|iPod/.test(navigator.userAgent))
      refresh()
    }, 0)
    window.addEventListener('appinstalled', installed)
    return () => { window.clearTimeout(loadDeviceState); unsubscribe(); window.removeEventListener('appinstalled', installed) }
  }, [])

  const install = async () => {
    const prompt = getInstallPrompt()
    if (!prompt) return
    await prompt.prompt()
    const choice = await prompt.userChoice
    if (choice.outcome === 'accepted') setMessage('Installing GoalYaar…')
    else setMessage('Installation cancelled. You can try again later.')
    setInstallPrompt(null)
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#101B2D]">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Smartphone className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-bold">Install GoalYaar</h3>
          <p className="mt-1 text-xs leading-4 text-slate-500">Open GoalYaar from your home screen with an app-like layout.</p>
        </div>
      </div>

      {isInstalled ? (
        <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"><Check className="h-4 w-4" />Installed on this device</p>
      ) : installAvailable ? (
        <button type="button" onClick={() => void install()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-50 py-2.5 text-xs font-bold text-white dark:text-slate-900"><Download className="h-4 w-4" />Install app</button>
      ) : isIos ? (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-4 text-slate-600 dark:bg-slate-950 dark:text-slate-300">In Safari, tap Share and choose <strong>Add to Home Screen</strong>.</p>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-4 text-slate-500 dark:bg-slate-950">Your browser will show an install option when GoalYaar is eligible.</p>
      )}
      {message && <p role="status" className="mt-2 text-xs font-semibold text-slate-500">{message}</p>}
    </section>
  )
}
