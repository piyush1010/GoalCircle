import Link from 'next/link'
import { CheckCircle2, Plus, Timer } from 'lucide-react'

const actions = [
  {
    href: '/create-goal',
    label: 'New goal',
    description: 'Make a commitment',
    icon: Plus,
  },
  {
    href: '/check-in',
    label: 'Check in',
    description: 'Post today\'s proof',
    icon: CheckCircle2,
  },
  {
    href: '/focus',
    label: 'Focus',
    description: 'Start a session',
    icon: Timer,
  },
]

export default function QuickActionsWidget() {
  return (
    <section aria-labelledby="quick-actions-title" className="space-y-2">
      <h2 id="quick-actions-title" className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        Quick actions
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {actions.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-500"
          >
            <span className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-slate-950 dark:text-amber-400">
              <Icon className="h-4 w-4" />
            </span>
            <span className="block text-xs font-black text-slate-900 dark:text-white">{label}</span>
            <span className="mt-0.5 block text-[9px] leading-3 text-slate-400">{description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
