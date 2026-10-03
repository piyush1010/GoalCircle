'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Feed', href: '/feed', icon: '🔥' },
    { label: 'Circles', href: '/circles', icon: '👥' },
    { label: 'Focus', href: '/focus', icon: '⚡' },
    { label: 'Leaderboard', href: '/leaderboard', icon: '🏆' },
    { label: 'Profile', href: '/profile', icon: '👤' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition active:scale-95 ${
                isActive
                  ? 'text-amber-500 font-extrabold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}