'use client'

import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { GUIDE_EVENT, GUIDE_HIDDEN_KEY } from '@/components/PageGuide'

/** Settings switch: show or hide the "How this page works" button on every screen. */
export default function PageGuideToggle() {
  const [on, setOn] = useState(true)
  useEffect(() => { const t = window.setTimeout(() => { try { setOn(window.localStorage.getItem(GUIDE_HIDDEN_KEY) !== '1') } catch { /* keep default */ } }, 0); return () => window.clearTimeout(t) }, [])
  const toggle = () => {
    const next = !on
    setOn(next)
    try { window.localStorage.setItem(GUIDE_HIDDEN_KEY, next ? '0' : '1'); if (next) window.localStorage.setItem('goalyaar-guide-tucked', '0') } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event(GUIDE_EVENT))
  }
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <HelpCircle className="h-5 w-5 shrink-0 text-slate-500" />
      <span className="flex-1"><span className="block text-sm font-bold">Page help</span><span className="block text-xs text-slate-500">{on ? 'A small help button explains each screen with examples.' : 'Off. Turn on to see how each screen works.'}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`} /></span>
    </button>
  )
}
