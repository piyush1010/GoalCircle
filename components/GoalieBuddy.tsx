'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import GoalieSays from '@/components/GoalieSays'

export const BUDDY_OFF_KEY = 'goalcircle-goalie-off'
export const BUDDY_EVENT = 'goalcircle:goalie-buddy'

// A short hello per page, said once per visit to that page in a session.
const PAGE_LINES: { match: (path: string) => boolean; line: string }[] = [
  { match: (path) => path === '/feed', line: 'See who showed up today 👀' },
  { match: (path) => path === '/circles', line: 'Your people are here 💛' },
  { match: (path) => path.startsWith('/circles/'), line: 'Your batch is waiting!' },
  { match: (path) => path === '/dashboard', line: 'Look how far you’ve come 📈' },
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
    <div className="goalie-float pointer-events-none fixed bottom-[5.75rem] right-3 z-40 [&>*]:pointer-events-auto">
      <GoalieSays key={pathname} say={say} size={46} layout="left" autoHideMs={4000} />
    </div>
  )
}
