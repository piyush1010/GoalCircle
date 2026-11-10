import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpenCheck, Check, Layers, NotebookPen, Target, UsersRound } from 'lucide-react'
import LogoMark from '@/components/LogoMark'
import ThemeToggle from '@/components/ThemeToggle'
import SignedInRedirect from '@/components/SignedInRedirect'

export const metadata: Metadata = {
  title: 'GoalYaar: a study plan you can keep',
  description: 'Pick your exam and date. GoalYaar splits the syllabus into a few subtopics a day, brings topics back for revision, and keeps your batch in the loop. Free, no ads.',
  openGraph: {
    title: 'GoalYaar: a study plan you can keep',
    description: 'A few subtopics a day, revision on time, and your batch in the loop. Free for UPSC, state PCS, SSC, banking, teaching, judiciary and CAT.',
    url: 'https://goalyaar.in',
    siteName: 'GoalYaar',
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/og-goalyaar.jpg', width: 1200, height: 630, alt: 'GoalYaar study planner' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og-goalyaar.jpg'] },
}

const EXAMS = ['UPSC CSE', 'UPPCS', 'BPSC', 'MPSC', 'HCS', 'JKPSC', 'SSC CGL', 'Bank PO', 'CTET', 'UPTET', 'UP PCS-J', 'MP Civil Judge', 'CAT']

const steps = [
  ['Tell us your exam and date', 'Pick the exam and when you sit it. Already finished some subjects? Tick them in a minute and they are taken off your plan.'],
  ['Study a few subtopics a day', 'Today shows exactly what is next. Tick each one when you are done. Tapped by mistake? Undo.'],
  ['Revise before you forget', 'Topics come back after a few days, then a week, then a month. Say how much you remembered and the gap adjusts.'],
]

const features = [
  { icon: Layers, title: 'Two exams, one plan', copy: 'Preparing for UPSC and UPPCS together? Topics they share are ticked once and count for both.' },
  { icon: UsersRound, title: 'Your batch, minus the WhatsApp mess', copy: 'Mentors post one task a day and see who did it. Students share their progress only if they want to.' },
  { icon: NotebookPen, title: 'A notebook for your mistakes', copy: 'Write down what tripped you up in a mock. It keeps coming back until you get it right.' },
  { icon: Target, title: 'Not just exams', copy: 'Gym, reading, a side project. Set any goal and check in each day, on your own or with friends.' },
]

const faqs = [
  ['Is it really free?', 'Yes. Everything students use is free, and there are no ads.'],
  ['Which exams are covered?', `${EXAMS.join(', ')}. Yours is missing? Request it from the app and we will add it.`],
  ['Who can see my progress?', 'Only you, unless you share it with your mentor or a circle. Others preparing for the same exam see a count of how many studied today, never your name.'],
  ['I fell behind. Now what?', 'Tap “Start fresh from today”. What is left is spread over the days you have. Nothing you ticked is lost.'],
  ['Is this an official app?', 'No. GoalYaar is independent and is not connected to UPSC or any other commission.'],
]

/** A small, honest picture of the Today screen. */
function TodayPreview() {
  return <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#0E1A2C]">
    <p className="text-xs text-slate-500">Tuesday, 10 November</p>
    <p className="text-lg font-semibold">Good evening, Riya</p>
    <div className="mt-3 flex items-baseline justify-between"><p className="text-2xl font-semibold tabular-nums">2 of 5 done</p><p className="text-xs text-slate-500">UPSC · 200 days left</p></div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full w-2/5 rounded-full bg-amber-500" /></div>
    <div className="mt-4 rounded-2xl bg-slate-900 p-4 text-white dark:bg-white dark:text-slate-900">
      <p className="text-[11px] uppercase tracking-[0.14em] opacity-60">Study</p>
      <p className="mt-2 text-lg font-semibold leading-snug">Fundamental Rights: Articles 12 to 18</p>
      <p className="mt-1 text-sm opacity-70">Indian polity</p>
      <div className="mt-4 flex gap-2"><span className="flex-1 rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">Done</span><span className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold dark:border-slate-300">Focus</span></div>
    </div>
    <div className="mt-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Revise</p>
      <p className="mt-2 font-semibold leading-snug">Monsoon and its mechanism</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold"><span className="rounded-lg bg-slate-900 py-2 text-white dark:bg-white dark:text-slate-900">Got it</span><span className="rounded-lg border border-slate-200 py-2 dark:border-slate-700">Partly</span><span className="rounded-lg border border-slate-200 py-2 dark:border-slate-700">Forgot</span></div>
    </div>
  </div>
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-[#07101F] dark:text-slate-50">
      <SignedInRedirect />
      <header className="border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/80 dark:bg-[#07101F]/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="GoalYaar home"><LogoMark size={34} /><span className="text-lg font-bold tracking-tight">GoalYaar</span></Link>
          <nav className="flex items-center gap-1.5" aria-label="Site">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">Sign in</Link>
            <Link href="/login?mode=signup" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">Start free</Link>
          </nav>
        </div>
      </header>

      <section className="px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h1 className="landing-enter text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">A study plan you can <span className="text-amber-600 dark:text-amber-400">actually keep.</span></h1>
            <p className="landing-enter landing-delay-2 mt-5 max-w-xl text-pretty text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">Pick your exam and your date. GoalYaar splits the syllabus into a few subtopics a day, brings each topic back before you forget it, and keeps your batch in the loop.</p>
            <div className="landing-enter landing-delay-3 mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup&next=/prep/start" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-base font-semibold text-slate-950 shadow-sm hover:bg-amber-400">Make my plan <ArrowRight className="h-4 w-4" /></Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center rounded-2xl border border-slate-300 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900">How it works</a>
            </div>
            <p className="landing-enter landing-delay-4 mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />Free, no ads</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />Takes a minute to set up</span><span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" />Private unless you share</span></p>
          </div>
          <div className="landing-enter landing-delay-3"><TodayPreview /></div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/70 py-5 dark:border-slate-800 dark:bg-slate-900/30" aria-label="Exams covered">
        <p className="mx-auto max-w-5xl px-4 text-center text-sm leading-7 text-slate-500 dark:text-slate-400"><BookOpenCheck className="mr-1.5 inline h-4 w-4 align-[-3px] text-amber-500" />{EXAMS.join(' · ')}</p>
      </section>

      <section id="how-it-works" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="landing-reveal max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
          <ol className="mt-8 grid gap-4 lg:grid-cols-3">
            {steps.map(([title, copy], i) => (
              <li key={title} className="landing-reveal rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#101B2D]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-500/15 text-sm font-semibold text-amber-700 dark:text-amber-400">{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="landing-reveal rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#101B2D]">
              <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="landing-reveal text-3xl font-bold tracking-tight sm:text-4xl">Questions</h2>
          <div className="mt-6 space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="landing-reveal group rounded-2xl border border-slate-200 bg-white p-5 open:border-amber-500/40 dark:border-slate-800 dark:bg-[#101B2D]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden"><span>{question}</span><span aria-hidden="true" className="text-xl leading-none text-slate-400 transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="landing-reveal mx-auto max-w-4xl rounded-[2rem] bg-slate-900 px-6 py-12 text-center text-white sm:px-12 dark:bg-slate-800/60">
          <h2 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl">Start with today&apos;s five subtopics.</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">Setting up takes about a minute. You can change your exam, date or hours whenever you like.</p>
          <Link href="/login?mode=signup&next=/prep/start" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-semibold text-slate-950 hover:bg-amber-400">Make my plan <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center text-sm sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 font-semibold"><LogoMark size={20} />GoalYaar</div>
          <p className="text-xs text-slate-500">An independent study planner. Not connected to any commission.</p>
          <div className="flex items-center gap-4 text-xs font-semibold"><Link href="/about" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">About</Link><Link href="/privacy" className="text-slate-500 hover:text-slate-900 dark:hover:text-white">Privacy</Link><Link href="/login" className="text-amber-600 dark:text-amber-400">Sign in</Link></div>
        </div>
      </footer>
    </main>
  )
}
