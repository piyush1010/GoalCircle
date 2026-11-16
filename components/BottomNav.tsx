'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, House, Plus, UsersRound } from 'lucide-react'
import AddSheet from '@/components/AddSheet'

/** Home, Communities, the + sheet, and Progress. Profile and settings open from your photo on Home. */
export default function BottomNav() {
  const pathname = usePathname()
  const [adding, setAdding] = useState(false)

  const left = [
    { label: 'Home', href: '/dashboard', tour: 'nav-home', icon: House, match: ['/dashboard', '/prep', '/goal'] },
    { label: 'Communities', href: '/circles', tour: 'nav-communities', icon: UsersRound, match: ['/circles', '/feed'] },
  ]
  const right = [{ label: 'Progress', href: '/progress', tour: 'nav-progress', icon: BarChart3, match: ['/progress', '/focus'] }]
  const tab = (item: (typeof left)[number]) => {
    const active = item.match.some((m) => pathname === m || pathname.startsWith(`${m}/`))
    const Icon = item.icon
    return <Link key={item.href} href={item.href} data-tour={item.tour} aria-current={active ? 'page' : undefined}
      className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs transition active:scale-95 ${active ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}>
      <Icon aria-hidden="true" className="h-[21px] w-[21px]" strokeWidth={active ? 2.4 : 1.9} />
      {item.label}
    </Link>
  }

  return <>
    <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#07101F]/95">
      <div className="mx-auto grid max-w-xl grid-cols-4 items-end px-3 py-2">
        {left.map(tab)}
        <div className="flex justify-center">
          <button type="button" onClick={() => setAdding(true)} data-tour="nav-add" aria-label="Add" aria-haspopup="dialog" className="-mt-6 grid h-14 w-14 place-items-center rounded-full border-4 border-white bg-amber-500 text-slate-950 shadow-md transition hover:bg-amber-400 active:scale-95 dark:border-[#07101F]">
            <Plus aria-hidden="true" className="h-6 w-6" strokeWidth={2.6} />
          </button>
        </div>
        {right.map(tab)}
      </div>
    </nav>
    {adding && <AddSheet onClose={() => setAdding(false)} />}
  </>
}
