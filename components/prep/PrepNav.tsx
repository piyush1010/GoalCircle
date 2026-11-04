'use client'

import Link from 'next/link'

const ITEMS = [['/prep/plan', 'Plan'], ['/prep', 'Syllabus'], ['/prep/progress', 'Progress']] as const

/** The tracker has three screens. Everything else (mistakes, past papers, notes) opens from Progress. */
export default function PrepNav({ active }: { active: (typeof ITEMS)[number][0] }) {
  return <nav aria-label="Preparation" data-guide="prep-nav" className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
    {ITEMS.map(([href, label]) => <Link key={href} href={href} aria-current={active === href ? 'page' : undefined} className={`rounded-lg py-2 text-center text-sm font-bold ${active === href ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</Link>)}
  </nav>
}
