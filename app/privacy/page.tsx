import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Eye, LockKeyhole, ShieldCheck, Target, UserRoundCheck } from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'Privacy | GoalCircle',
  description: 'How GoalCircle approaches visibility, personal data, and user control.',
}

const principles = [
  {
    icon: Eye,
    title: 'Visibility is explicit',
    copy: 'Goals and check-ins should clearly show whether they are public, shared with a circle, or private.',
  },
  {
    icon: LockKeyhole,
    title: 'Private means private',
    copy: 'Private goals and updates are intended to be visible only to their owner and protected by account-level access rules.',
  },
  {
    icon: UserRoundCheck,
    title: 'You control your profile',
    copy: 'You can update your profile, export your goal data, and remove content you created from within the app.',
  },
  {
    icon: ShieldCheck,
    title: 'Minimal, purposeful data',
    copy: 'GoalCircle uses account and progress information to provide the product rather than to build an advertising profile.',
  },
]

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-[#07101f] dark:text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5 dark:border-slate-800">
          <Link href="/" className="flex items-center gap-2.5 font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950"><Target className="h-5 w-5" /></span>GoalCircle</Link>
          <ThemeToggle />
        </header>

        <section className="py-14 sm:py-20">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-950 dark:hover:text-white"><ArrowLeft className="h-4 w-4" />Back to home</Link>
          <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Privacy approach</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">Your progress belongs to you.</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300">GoalCircle is built for useful accountability, not performative oversharing. These principles guide how visibility and personal data should work as the product grows.</p>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {principles.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#101b2d]">
                <span className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Icon className="h-5 w-5" /></span>
                <h2 className="font-black">{title}</h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-slate-100 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <h2 className="font-black">A note while GoalCircle is in early testing</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">Only share information you are comfortable testing with trusted participants. Product controls and security policies will continue to be reviewed before broader release.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
