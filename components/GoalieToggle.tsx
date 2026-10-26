'use client'

import { useEffect, useState } from 'react'
import { GoalieBot } from '@/components/GoalieBot'
import { BUDDY_EVENT, BUDDY_OFF_KEY } from '@/components/GoalieBuddy'

/** Settings switch: show or hide the floating Goalie. */
export default function GoalieToggle() {
  const [on, setOn] = useState(true)
  useEffect(() => { try { setOn(window.localStorage.getItem(BUDDY_OFF_KEY) !== '1') } catch { /* keep default */ } }, [])
  const toggle = () => {
    const next = !on
    setOn(next)
    try { if (next) window.localStorage.removeItem(BUDDY_OFF_KEY); else window.localStorage.setItem(BUDDY_OFF_KEY, '1') } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event(BUDDY_EVENT))
  }
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <GoalieBot size={36} mood={on ? 'happy' : 'sleepy'} />
      <span className="flex-1"><span className="block text-sm font-bold">Goalie on every page</span><span className="block text-xs text-slate-500">{on ? 'Goalie floats in the corner and says hi.' : 'Goalie is napping. Turn on to bring him back.'}</span></span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[1.375rem]' : 'left-0.5'}`} /></span>
    </button>
  )
}
