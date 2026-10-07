'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleUserRound, Flame, LayoutDashboard, Plus, UsersRound } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Feed', href: '/feed', icon: Flame },
    { label: 'Circles', href: '/circles', icon: UsersRound },
    { label: 'Create', href: '/create', icon: Plus, primary: true },
    { label: 'Progress', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Profile', href: '/profile', icon: CircleUserRound },
  ]

  return (
    <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/92 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-[#0b1220]/92">
      <div className="mx-auto flex max-w-xl items-end justify-around px-3 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Create"
                className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-400 active:scale-95 dark:border-[#0b1220]"
              >
                <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={2.6} />
              </Link>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-14 flex-col items-center gap-1 rounded-xl px-2 py-1 transition active:scale-95 ${
                isActive
                  ? 'text-amber-500 font-extrabold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold'
              }`}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.7 : 2} />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
