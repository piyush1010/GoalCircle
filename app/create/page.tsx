import Link from 'next/link'
import { ArrowRight, CheckCircle2, Target } from 'lucide-react'

export default function CreatePage() {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-8">
      <div className="mb-7"><p className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Create</p><h1 className="mt-1 text-2xl font-black">What are you working on?</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Declare a new direction or show up for one you already chose.</p></div>
      <div className="space-y-4">
        <Link href="/check-in" className="group flex items-center gap-4 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-5 transition hover:border-amber-500"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500 text-slate-950"><CheckCircle2 className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h2 className="font-black">Post today&apos;s progress</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Add proof, focus minutes, or a milestone.</p></div><ArrowRight className="h-5 w-5 text-amber-500 transition group-hover:translate-x-1" /></Link>
        <Link href="/create-goal" className="group flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Target className="h-6 w-6" /></div><div className="min-w-0 flex-1"><h2 className="font-black">Declare a new goal</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose a clear action and start a streak.</p></div><ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-amber-500" /></Link>
      </div>
    </main>
  )
}
