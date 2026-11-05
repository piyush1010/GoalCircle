'use client'

import { useEffect, useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { GUIDE_EVENT, GUIDE_HIDDEN_KEY, GUIDE_INLINE_EVENT, GUIDE_OPEN_EVENT } from '@/components/PageGuide'

/** The page-help button, placed in a page header so it never covers content. Respects "Page help" off. */
export default function HelpButton({ className = '' }: { className?: string }) {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const read = () => { try { setHidden(window.localStorage.getItem(GUIDE_HIDDEN_KEY) === '1') } catch { /* show */ } }
    const t = window.setTimeout(read, 0)
    window.addEventListener(GUIDE_EVENT, read)
    return () => { window.clearTimeout(t); window.removeEventListener(GUIDE_EVENT, read) }
  }, [])
  useEffect(() => {
    window.dispatchEvent(new Event(GUIDE_INLINE_EVENT))
    return () => { window.dispatchEvent(new Event(GUIDE_INLINE_EVENT)) }
  }, [hidden])
  if (hidden) return null
  return <button type="button" data-guide-inline="" onClick={() => window.dispatchEvent(new Event(GUIDE_OPEN_EVENT))} aria-label="How this page works" className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 ${className}`}><HelpCircle className="h-[18px] w-[18px]" /></button>
}
