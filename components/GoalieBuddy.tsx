'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import GoalieSays from '@/components/GoalieSays'

export const BUDDY_OFF_KEY = 'goalcircle-goalie-off'
export const BUDDY_EVENT = 'goalcircle:goalie-buddy'

// A short hello per page, said once per visit to that page in a session.
const PAGE_LINES: { match: (path: string) => boolean; line: string }[] = [
  { match: (path) => path === '/feed', line: 'See who showed up today 👀' },
  { match: (path) => path === '/circles', line: 'Your people are here 💛' },
  { match: (path) => path.startsWith('/circles/'), line: 'Your batch is waiting!' },
  { match: (path) => path === '/dashboard', line: 'One day at a time ☀️' },
  { match: (path) => path === '/profile', line: 'Looking good! 😎' },
  { match: (path) => path === '/create', line: 'What are we starting today? ✨' },
  { match: (path) => path.startsWith('/goal/'), line: 'One step at a time 💪' },
]
// Pages where Goalie already appears, or where it would distract.
const HIDDEN_ON = ['/check-in', '/focus', '/create-goal', '/settings', '/login', '/signup']

/** Goalie floats in the corner on every page, says hi briefly, and can be poked. */
export default function GoalieBuddy() {
  const pathname = usePathname() || '/'
  const [off, setOff] = useState(true)
  const [say, setSay] = useState<string | undefined>()
  const [otherGoalie, setOtherGoalie] = useState(false)
  const own = useRef<HTMLDivElement>(null)

  // Step aside while another Goalie (an empty page, a tour, the check-in helper) is on screen.
  useEffect(() => {
    const check = () => {
      const visible = [...document.querySelectorAll('[aria-label="Poke Goalie"]')].some((element) => {
        if (own.current?.contains(element)) return false
        const box = element.getBoundingClientRect()
        return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight
      })
      // Also step aside during tours, prompts and confirmations.
      setOtherGoalie(visible || Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]')))
    }
    check()
    const timer = window.setInterval(check, 500)
    window.addEventListener('scroll', check, { passive: true })
    return () => { window.clearInterval(timer); window.removeEventListener('scroll', check) }
  }, [pathname])

  useEffect(() => {
    const read = () => { try { setOff(window.localStorage.getItem(BUDDY_OFF_KEY) === '1') } catch { setOff(false) } }
    read()
    window.addEventListener(BUDDY_EVENT, read)
    return () => window.removeEventListener(BUDDY_EVENT, read)
  }, [])

  useEffect(() => {
    setSay(undefined)
    const line = PAGE_LINES.find((item) => item.match(pathname))?.line
    if (!line) return
    let seen = false
    try {
      const key = `goalcircle-goalie-said-${pathname.split('/')[1]}`
      seen = window.sessionStorage.getItem(key) === '1'
      window.sessionStorage.setItem(key, '1')
    } catch { /* storage unavailable */ }
    if (seen) return
    const timer = window.setTimeout(() => setSay(line), 1200)
    return () => window.clearTimeout(timer)
  }, [pathname])

  if (off || HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null

  return (
    <div ref={own} aria-hidden={otherGoalie} className={`goalie-float pointer-events-none fixed bottom-[5.75rem] right-3 z-40 transition-all duration-300 [&>*]:pointer-events-auto ${otherGoalie ? 'translate-x-24 opacity-0 [&>*]:pointer-events-none' : ''}`}>
      <GoalieSays key={pathname} say={say} size={46} layout="left" autoHideMs={4000} />
    </div>
  )
}
