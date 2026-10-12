import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronRight,
  CircleGauge,
  Flame,
  Globe2,
  HeartHandshake,
  ImagePlus,
  LockKeyhole,
  MessageCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: 'GoalCircle — Goals become real when you show up',
  description:
    'Announce your goals, share daily progress, and stay accountable with friends and trusted circles.',
  openGraph: {
    title: 'GoalCircle — Goals become real when you show up',
    description: 'Set a meaningful goal, share honest progress, and stay accountable with people you trust.',
    url: 'https://goalcircle-ivory.vercel.app',
    siteName: 'GoalCircle',
    type: 'website',
  },
}

const features = [
  {
    icon: Target,
    title: 'Announce the goal',
    copy: 'Turn a private intention into a clear commitment with a finish line and visibility you control.',
  },
  {
    icon: ImagePlus,
    title: 'Show the progress',
    copy: 'Post a photo, short reel, focus session, or simple note as proof of the work you did today.',
  },
  {
    icon: HeartHandshake,
    title: 'Build with your people',
    copy: 'Create trusted circles, send a timely nudge, and celebrate the small wins that keep momentum alive.',
  },
  {
    icon: CircleGauge,
    title: 'See consistency grow',
    copy: 'Streaks, heatmaps, and weekly progress make effort visible without turning life into a spreadsheet.',
  },
]

const steps = [
  ['01', 'Choose one meaningful goal', 'Make it specific, set an optional target date, and decide who can see it.'],
  ['02', 'Check in with real proof', 'Share the work—not just the outcome—with a quick daily update.'],
  ['03', 'Let accountability compound', 'Friends boost, comment, and nudge while your consistency becomes a track record.'],
]

const faqs = [
  ['Can I keep a goal private?', 'Yes. Choose public, circle-only, or private visibility for each goal and progress update.'],
  ['What counts as a check-in?', 'A short note, photo, video, or focus session can record the work you completed that day.'],
  ['What is a circle?', 'A circle is a smaller accountability group for friends, teammates, classmates, or people working toward a shared outcome.'],
  ['Can I take a break without losing everything?', 'Eligible goals include a one-time seven-day compassionate pause for situations when life needs your full attention.'],
]

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f8fafc] text-slate-950 dark:bg-[#07101f] dark:text-slate-50">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_70%_0%,rgba(245,158,11,0.18),transparent_42%),radial-gradient(circle_at_12%_25%,rgba(56,189,248,0.10),transparent_30%)] dark:bg-[radial-gradient(circle_at_70%_0%,rgba(245,158,11,0.16),transparent_38%),radial-gradient(circle_at_12%_25%,rgba(56,189,248,0.08),transparent_28%)]" />

      <header className="relative z-20 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#07101f]/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5" aria-label="GoalCircle home">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Target className="h-5 w-5" strokeWidth={2.7} />
            </span>
            <span className="text-lg font-black tracking-[-0.04em]">GoalCircle</span>
          </Link>

          <nav className="flex items-center gap-2" aria-label="Landing page navigation">
            <div className="mr-2 hidden items-center gap-5 lg:flex">
              <a href="#how-it-works" className="text-xs font-bold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">How it works</a>
              <a href="#features" className="text-xs font-bold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">Features</a>
              <a href="#faq" className="text-xs font-bold text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">FAQ</a>
            </div>
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800 shadow-sm dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Social accountability, built around progress
            </div>
            <h1 className="text-balance text-5xl font-black leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Goals become real when you{' '}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 bg-clip-text text-transparent">show up.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base font-medium leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
              GoalCircle is a social home for meaningful goals. Make a commitment, share daily proof, and stay accountable with friends who want to see you win.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login?mode=signup" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/20 transition hover:-translate-y-0.5 hover:bg-amber-400">
                Start your first goal <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how-it-works" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white/80 px-6 py-3.5 text-sm font-black text-slate-700 transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900">
                <Play className="h-4 w-4 fill-current" /> See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-500" /> Free to get started</span>
              <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-emerald-500" /> Public, private, or circles</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Your progress, your control</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[31rem]">
            <div className="absolute -inset-10 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="relative rotate-[1.5deg] rounded-[2.7rem] border border-slate-300/80 bg-slate-950 p-2.5 shadow-[0_35px_90px_-28px_rgba(15,23,42,0.55)] dark:border-slate-700">
              <div className="overflow-hidden rounded-[2.15rem] bg-slate-50 dark:bg-[#0b1526]">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div><p className="flex items-center gap-1.5 text-sm font-black"><UsersRound className="h-4 w-4 text-amber-500" />Today&apos;s circle</p><p className="text-[10px] font-semibold text-slate-500">Proof over promises</p></div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-500 text-xs font-black text-slate-950">AM</span>
                </div>

                <div className="space-y-3 p-3.5">
                  <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#111e31]">
                    <div className="flex items-center gap-3 p-4">
                      <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-600 text-xs font-black text-white">AM</span>
                      <div className="min-w-0 flex-1"><p className="truncate text-xs font-black">Alex Morgan</p><p className="text-[10px] font-semibold text-slate-400">Day 14 · Run my first 5K</p></div>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400">On track</span>
                    </div>
                    <div className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-[linear-gradient(145deg,#16324a,#256d67_46%,#e9a23b)]">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_25%,rgba(255,255,255,.28),transparent_26%)]" />
                      <div className="relative grid h-16 w-16 place-items-center rounded-full border border-white/30 bg-slate-950/35 text-white backdrop-blur"><Play className="ml-1 h-6 w-6 fill-current" /></div>
                      <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/60 px-2.5 py-1 text-[9px] font-black text-white backdrop-blur">Morning run · 3.2 km</span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200">Didn&apos;t feel like going. Went anyway. New personal best today.</p>
                      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 text-[10px] font-black text-slate-500 dark:border-slate-800 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400"><Flame className="h-3.5 w-3.5 fill-current" /> 24 boosts</span>
                        <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5" /> 8 comments</span>
                        <span className="ml-auto inline-flex items-center gap-1.5"><BellRing className="h-3.5 w-3.5" /> Nudge</span>
                      </div>
                    </div>
                  </article>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ['12', 'day streak'],
                      ['82%', 'this week'],
                      ['6', 'friends'],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-[#111e31]">
                        <p className="text-lg font-black text-amber-500">{value}</p><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-5 hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:flex dark:border-slate-700 dark:bg-[#111e31]">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500"><Check className="h-5 w-5" /></span>
              <div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Check-in complete</p><p className="text-xs font-black">Momentum protected</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/70 py-6 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-4 text-xs font-black text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-2"><Globe2 className="h-4 w-4 text-amber-500" /> Announce publicly</span>
          <span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-amber-500" /> Share with a circle</span>
          <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-amber-500" /> Keep it private</span>
          <span className="inline-flex items-center gap-2"><Flame className="h-4 w-4 text-amber-500" /> Protect your streak</span>
        </div>
      </section>

      <section id="how-it-works" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-5xl">A simple loop that keeps you moving.</h2>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">No complicated system to maintain. Just a meaningful goal, honest progress, and the right people beside you.</p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {steps.map(([number, title, copy]) => (
              <article key={number} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-[#101b2d]">
                <div className="mb-8 flex items-center justify-between"><span className="text-4xl font-black text-amber-500/35">{number}</span><ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-amber-500 dark:text-slate-700" /></div>
                <h3 className="text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-slate-100/80 p-5 sm:p-8 lg:p-12 dark:border-slate-800 dark:bg-slate-900/45">
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-[#101b2d]">
                <span className="mb-5 grid h-11 w-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Icon className="h-5 w-5" /></span>
                <h3 className="text-base font-black">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-24 px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-16">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Questions, answered</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">Accountability without giving up control.</h2>
            <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">GoalCircle is designed around intentional sharing. You decide what to share, who sees it, and when a goal stays private.</p>
            <Link href="/privacy" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-amber-600 hover:text-amber-500 dark:text-amber-400">Read our privacy approach <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="space-y-3">
            {faqs.map(([question, answer]) => (
              <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5 open:border-amber-500/40 dark:border-slate-800 dark:bg-[#101b2d]">
                <summary className="cursor-pointer list-none pr-8 text-sm font-black marker:hidden">{question}<span className="float-right text-lg font-medium text-amber-500 transition group-open:rotate-45">+</span></summary>
                <p className="mt-3 pr-6 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-14 text-center text-white shadow-2xl sm:px-12 lg:py-20 dark:border dark:border-slate-800">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,.28),transparent_42%)]" />
          <div className="relative">
            <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500 text-slate-950"><Target className="h-6 w-6" /></span>
            <h2 className="text-balance text-3xl font-black tracking-[-0.04em] sm:text-5xl">Your goal deserves more than good intentions.</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm font-medium leading-6 text-slate-300 sm:text-base">Start small. Share the commitment. Show up again tomorrow.</p>
            <Link href="/login?mode=signup" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-400">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-sm font-black"><Target className="h-4 w-4 text-amber-500" /> GoalCircle</div>
          <p className="text-xs font-medium text-slate-500">Built for progress, accountability, and people who keep showing up.</p>
          <div className="flex items-center gap-4"><Link href="/privacy" className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">Privacy</Link><Link href="/login" className="text-xs font-black text-amber-600 hover:text-amber-500 dark:text-amber-400">Sign in</Link></div>
        </div>
      </footer>
    </main>
  )
}
