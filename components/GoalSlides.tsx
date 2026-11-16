'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import GoalReportCard from '@/components/GoalReportCard'
import type { GoalReport } from '@/lib/goalReport'

export interface GoalSlide { id: string; title: string; line: string; report: GoalReport }

/**
 * Personal goals as cards you swipe through, one report each. The next card peeks in from the
 * side so it's clear there are more; the dots below show where you are and can be tapped.
 */
export default function GoalSlides({ slides }: { slides: GoalSlide[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const el = track.current
    if (!el || slides.length < 2) return
    const onScroll = () => {
      const cards = [...el.children] as HTMLElement[]
      const middle = el.scrollLeft + el.clientWidth / 2
      let best = 0, gap = Infinity
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - middle); if (d < gap) { gap = d; best = i } })
      setActive(best)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [slides.length])

  const go = (i: number) => {
    const el = track.current
    const card = el?.children[i] as HTMLElement | undefined
    if (el && card) el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2, behavior: 'smooth' })
  }

  const single = slides.length === 1
  return <div>
    <div ref={track} role="group" aria-roledescription="carousel" aria-label="Your goals"
      className={`-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}>
      {slides.map((s, i) => <section key={s.id} role="group" aria-roledescription="slide" aria-label={`${s.title}, ${i + 1} of ${slides.length}`}
        className={`${single ? 'w-full' : 'w-[86%]'} shrink-0 snap-center rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900`}>
        <Link href={`/goal/${s.id}`} className="flex items-start gap-2">
          <span className="min-w-0 flex-1"><span className="block truncate text-[17px] font-semibold">{s.title}</span><span className="block text-sm text-slate-500">{s.line}</span></span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </Link>
        <div className="mt-3"><GoalReportCard report={s.report} compact /></div>
        {s.report.bestRun > 0 && <p className="mt-3 text-sm text-slate-500">{s.report.monthDays} of {s.report.monthSoFar} days this month. Best run: {s.report.bestRun} {s.report.bestRun === 1 ? 'day' : 'days'}.</p>}
      </section>)}
    </div>
    {!single && <div className="mt-3 flex justify-center gap-1.5">
      {slides.map((s, i) => <button key={s.id} type="button" onClick={() => go(i)} aria-label={`Show ${s.title}`} aria-current={active === i ? 'true' : undefined}
        className="grid h-6 w-6 place-items-center"><span className={`block h-2 rounded-full transition-all ${active === i ? 'w-5 bg-slate-900 dark:bg-white' : 'w-2 bg-slate-300 dark:bg-slate-600'}`} /></button>)}
    </div>}
  </div>
}
