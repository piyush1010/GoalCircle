'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ChevronRight, HelpCircle, Minus, X } from 'lucide-react'
import { guideFor, type Guide } from '@/lib/guides'

export const GUIDE_HIDDEN_KEY = 'goalyaar-guide-hidden'
export const GUIDE_EVENT = 'goalyaar-guide-changed'
export const GUIDE_OPEN_EVENT = 'goalyaar-guide-open'
const TUCK_KEY = 'goalyaar-guide-tucked'
const SEEN_KEY = 'goalyaar-guide-seen'

/**
 * "How this page works": a small help button on each main screen. It opens a short, example-led guide;
 * tapping a step scrolls to that section and highlights it. The button can be tucked into a slim tab at
 * the screen edge, or turned off entirely (Settings → Page help brings it back).
 */
export default function PageGuide() {
  const pathname = usePathname() || '/'
  const [guide, setGuide] = useState<Guide | null>(null)
  const [hidden, setHidden] = useState(true)
  const [tucked, setTucked] = useState(false)
  const [open, setOpen] = useState(false)
  const [fresh, setFresh] = useState(false) // first visit to this page: a quiet hint next to the button
  const [inline, setInline] = useState(false) // the page has its own help button in the header
  useEffect(() => { const open = () => setOpen(true); window.addEventListener(GUIDE_OPEN_EVENT, open); return () => window.removeEventListener(GUIDE_OPEN_EVENT, open) }, [])

  useEffect(() => {
    const read = () => { try { setHidden(window.localStorage.getItem(GUIDE_HIDDEN_KEY) === '1'); setTucked(window.localStorage.getItem(TUCK_KEY) === '1') } catch { setHidden(false) } }
    const t = window.setTimeout(read, 0)
    window.addEventListener(GUIDE_EVENT, read)
    return () => { window.clearTimeout(t); window.removeEventListener(GUIDE_EVENT, read) }
  }, [])

  // Pick the guide once the page has rendered (some pages have two versions, e.g. Today with or without exam prep).
  useEffect(() => {
    const t = window.setTimeout(() => {
      setOpen(false)
      const g = guideFor(pathname)
      setGuide(g)
      setInline(Boolean(document.querySelector('[data-guide-inline]')))
      if (!g) return
      try { const seen: string[] = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]'); setFresh(!seen.includes(pathname)) } catch { setFresh(false) }
      // The first-visit hint steps aside after a few seconds so it never covers the page for long.
      window.setTimeout(() => setFresh(false), 5000)
    }, 600)
    return () => window.clearTimeout(t)
  }, [pathname])

  if (!guide || hidden) return null

  const markSeen = () => { try { const seen: string[] = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]'); if (!seen.includes(pathname)) window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, pathname].slice(-40))) } catch { /* fine */ } setFresh(false) }
  const tuck = (on: boolean) => { try { window.localStorage.setItem(TUCK_KEY, on ? '1' : '0') } catch { /* fine */ } setTucked(on); markSeen() }
  const hideAll = () => { try { window.localStorage.setItem(GUIDE_HIDDEN_KEY, '1') } catch { /* fine */ } setOpen(false); setHidden(true) }
  const show = (target?: string) => {
    if (!target) return
    const el = document.querySelector<HTMLElement>(target)
    if (!el) return
    setOpen(false)
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('guide-highlight')
    window.setTimeout(() => el.classList.remove('guide-highlight'), 2200)
  }

  return <>
    {!open && !inline && (tucked
      ? <button type="button" onClick={() => tuck(false)} aria-label="Show page help" className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] left-0 z-30 h-12 w-2.5 rounded-r-full bg-slate-300/80 dark:bg-slate-600/80" />
      : <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] left-3 z-30 flex items-center gap-1.5">
          <button type="button" onClick={() => { setOpen(true); markSeen() }} aria-label={`How ${guide.title} works`} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/90 text-slate-500 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-400"><HelpCircle className="h-[18px] w-[18px]" /></button>
          {fresh && <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 py-1 pl-3 pr-1 text-xs text-slate-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300"><button type="button" onClick={() => { setOpen(true); markSeen() }}>How this page works</button><button type="button" onClick={markSeen} aria-label="Dismiss" className="grid h-6 w-6 place-items-center rounded-full"><X className="h-3.5 w-3.5" /></button></span>}
          {!fresh && <button type="button" onClick={() => tuck(true)} aria-label="Tuck help to the edge" className="grid h-7 w-7 place-items-center rounded-full text-slate-400"><Minus className="h-4 w-4" /></button>}
        </div>)}

    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label={`How ${guide.title} works`} onClick={(e) => e.stopPropagation()} className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] dark:bg-slate-900 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm text-slate-500">How this page works</p><h2 className="text-xl font-semibold tracking-tight">{guide.title}</h2></div>
          <div className="flex gap-1">
            <button type="button" onClick={() => { setOpen(false); tuck(true) }} aria-label="Minimise" title="Minimise" className="grid h-9 w-9 place-items-center rounded-full text-slate-500"><Minus className="h-5 w-5" /></button>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full text-slate-500"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{guide.intro}</p>
        <ol className="mt-4 space-y-2">{guide.steps.map((s, i) => <li key={s.title}>
          <button type="button" onClick={() => show(s.target)} disabled={!s.target} className="flex w-full gap-3 rounded-2xl border border-slate-200 p-3.5 text-left disabled:cursor-default dark:border-slate-800">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums dark:bg-slate-800">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2"><span className="font-medium">{s.title}</span>{s.target && <span className="flex items-center text-xs text-slate-400">Show<ChevronRight className="h-3.5 w-3.5" /></span>}</span>
              <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-300">{s.text}</span>
              {s.example && <span className="mt-2 block rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300"><span className="text-xs font-medium uppercase tracking-wide text-slate-400">Example </span>{s.example}</span>}
            </span>
          </button>
        </li>)}</ol>
        <button type="button" onClick={hideAll} className="mt-4 w-full py-2 text-center text-sm text-slate-500">Turn off page help (Settings brings it back)</button>
      </div>
    </div>}
  </>
}
