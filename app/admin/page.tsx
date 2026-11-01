'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Bug, Flame, RefreshCw, UsersRound } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface Day { day: string; active: number; checkins: number; signups: number }
interface Variant { variant: 'A' | 'B'; sent: number; converted: number; people: number }
interface Insights {
  generated_at: string
  users: { total: number; new_7d: number; active_today: number; active_7d: number; active_30d: number }
  daily: Day[]
  retention: { cohort: number; returned_within_7d: number }
  habits: { active_goals: number; streak_3_plus: number; streak_7_plus: number; best_streak: number }
  reach: { push_users: number; daily_reminder_on: number }
  mentors: { batches: number; tasks_7d: number; students: number; batch_checkins_7d: number }
  experiment: Variant[]
  errors: { count_7d: number; people_7d: number; top: { message: string; n: number; last_seen: string; path: string | null }[] }
}

const VARIANT_TEXT: Record<'A' | 'B', string> = {
  A: '“Time to check in for today. Even 10 minutes counts.”',
  B: '“Your 5-day streak is waiting. One small step today keeps it going.”',
}

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900'
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : '–')
const shortDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** Owner-only numbers: who's using GoalYaar, whether they come back, the reminder test, and errors. */
export default function AdminPage() {
  const router = useRouter()
  const [data, setData] = useState<Insights | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')
  const [hover, setHover] = useState<number | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/login?next=/admin'); return }
    const { data: result, error } = await supabase.rpc('admin_insights')
    if (error) { setState(error.code === '42501' || /not allowed/i.test(error.message) ? 'denied' : 'error'); return }
    setData(result as Insights); setState('ready')
  }, [router])

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer) }, [load])

  if (state === 'loading') return <main className="mx-auto max-w-3xl space-y-3 px-4 pb-28 pt-6" aria-busy="true">{[1, 2, 3].map((n) => <div key={n} className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</main>
  if (state === 'denied') return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">Not available</h1><p className="mt-2 text-sm text-slate-500">This page is only for the GoalYaar team.</p><Link href="/dashboard" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Back to Today</Link></div></main>
  if (state === 'error' || !data) return <main className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-6 text-center"><div><h1 className="text-xl">Couldn&apos;t load the numbers</h1><p className="mt-2 text-sm text-slate-500">Has the insights SQL been run in Supabase?</p><button onClick={() => { setState('loading'); void load() }} className="mt-5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Try again</button></div></main>

  const max = Math.max(1, ...data.daily.map((d) => d.active))
  const shown = hover === null ? data.daily[data.daily.length - 1] : data.daily[hover]
  const [a, b] = (['A', 'B'] as const).map((v) => data.experiment.find((x) => x.variant === v) ?? { variant: v, sent: 0, converted: 0, people: 0 })
  const totalSent = a.sent + b.sent
  const rate = (v: Variant) => (v.sent ? v.converted / v.sent : 0)

  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/profile" aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><ArrowLeft className="h-4 w-4" /></Link>
          <div><h1 className="text-2xl leading-tight">Insights</h1><p className="text-xs text-slate-500">Updated {new Date(data.generated_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · India time</p></div>
        </div>
        <button onClick={() => { setState('loading'); void load() }} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><RefreshCw className="h-4 w-4" /></button>
      </header>

      {/* Headline numbers */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['People', data.users.total, `+${data.users.new_7d} this week`],
          ['Active today', data.users.active_today, 'showed up'],
          ['Active 7 days', data.users.active_7d, pct(data.users.active_7d, data.users.total) + ' of people'],
          ['Active 30 days', data.users.active_30d, pct(data.users.active_30d, data.users.total) + ' of people'],
        ].map(([label, value, note]) => <div key={label as string} className={card}><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{value}</p><p className="mt-0.5 text-xs text-slate-500">{note}</p></div>)}
      </section>

      {/* 14-day activity */}
      <section className={`${card} mt-3`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base">People who showed up, last 14 days</h2>
          <p className="text-xs text-slate-500 tabular-nums">{shortDay(shown.day)}: <b className="text-slate-900 dark:text-white">{shown.active}</b> active · {shown.checkins} check-ins · {shown.signups} sign-ups</p>
        </div>
        <div className="mt-4 flex h-36 items-end gap-[2px] border-b border-slate-200 dark:border-slate-700" onMouseLeave={() => setHover(null)} role="img" aria-label={`Daily active people over 14 days, from ${data.daily[0]?.active ?? 0} to ${data.daily[data.daily.length - 1]?.active ?? 0}`}>
          {data.daily.map((d, i) => (
            <button key={d.day} type="button" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={() => setHover(i)} aria-label={`${shortDay(d.day)}: ${d.active} active, ${d.checkins} check-ins`} className="flex h-full flex-1 items-end">
              <span className={`block w-full rounded-t-[4px] transition-colors ${hover === i ? 'bg-amber-600' : 'bg-amber-500'}`} style={{ height: `${Math.max(d.active ? 4 : 0, (d.active / max) * 100)}%` }} />
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{shortDay(data.daily[0].day)}</span><span>today</span></div>
      </section>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {/* Retention */}
        <section className={card}>
          <h2 className="flex items-center gap-2 text-base"><UsersRound className="h-4 w-4 text-sky-500" />Coming back</h2>
          <p className="mt-2 text-3xl font-extrabold tabular-nums">{pct(data.retention.returned_within_7d, data.retention.cohort)}</p>
          <p className="text-sm text-slate-500">of people who joined 8–60 days ago came back within a week of their first day ({data.retention.returned_within_7d} of {data.retention.cohort}).</p>
        </section>
        {/* Habits */}
        <section className={card}>
          <h2 className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-orange-500" />Habits</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Active goals</dt><dd className="text-right font-bold tabular-nums">{data.habits.active_goals}</dd>
            <dt className="text-slate-500">Streaks of 3+ days</dt><dd className="text-right font-bold tabular-nums">{data.habits.streak_3_plus}</dd>
            <dt className="text-slate-500">Streaks of 7+ days</dt><dd className="text-right font-bold tabular-nums">{data.habits.streak_7_plus}</dd>
            <dt className="text-slate-500">Best streak</dt><dd className="text-right font-bold tabular-nums">{data.habits.best_streak} days</dd>
          </dl>
        </section>
        {/* Reach */}
        <section className={card}>
          <h2 className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-emerald-500" />Reach</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Phone notifications on</dt><dd className="text-right font-bold tabular-nums">{data.reach.push_users} <span className="font-normal text-slate-500">({pct(data.reach.push_users, data.users.total)})</span></dd>
            <dt className="text-slate-500">Daily reminder on</dt><dd className="text-right font-bold tabular-nums">{data.reach.daily_reminder_on}</dd>
          </dl>
        </section>
        {/* Mentors */}
        <section className={card}>
          <h2 className="flex items-center gap-2 text-base"><UsersRound className="h-4 w-4 text-amber-500" />Mentor batches</h2>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-slate-500">Batches with tasks</dt><dd className="text-right font-bold tabular-nums">{data.mentors.batches}</dd>
            <dt className="text-slate-500">Students in them</dt><dd className="text-right font-bold tabular-nums">{data.mentors.students}</dd>
            <dt className="text-slate-500">Tasks, last 7 days</dt><dd className="text-right font-bold tabular-nums">{data.mentors.tasks_7d}</dd>
            <dt className="text-slate-500">Batch check-ins, 7 days</dt><dd className="text-right font-bold tabular-nums">{data.mentors.batch_checkins_7d}</dd>
          </dl>
        </section>
      </div>

      {/* Reminder experiment */}
      <section className={`${card} mt-3`}>
        <h2 className="text-base">Reminder test: which message gets more check-ins?</h2>
        <p className="mt-1 text-sm text-slate-500">Everyone with the daily reminder on gets message A or B (always the same one). A success is a check-in within 3 hours of the reminder.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="pb-2 font-semibold">Message</th><th className="pb-2 text-right font-semibold">People</th><th className="pb-2 text-right font-semibold">Sent</th><th className="pb-2 text-right font-semibold">Checked in</th><th className="pb-2 text-right font-semibold">Rate</th></tr></thead>
            <tbody>{[a, b].map((v) => <tr key={v.variant} className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-2 pr-3"><b>{v.variant}</b> <span className="text-slate-500">{VARIANT_TEXT[v.variant]}</span></td>
              <td className="py-2 text-right tabular-nums">{v.people}</td><td className="py-2 text-right tabular-nums">{v.sent}</td><td className="py-2 text-right tabular-nums">{v.converted}</td>
              <td className="py-2 text-right font-bold tabular-nums">{pct(v.converted, v.sent)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
          {totalSent < 60
            ? `Too early to call: ${totalSent} reminders sent so far. Wait for at least 30 in each group before deciding.`
            : Math.abs(rate(a) - rate(b)) < 0.05
              ? 'No clear winner yet: the two messages are within 5 points of each other.'
              : `Message ${rate(a) > rate(b) ? 'A' : 'B'} is ahead by ${Math.round(Math.abs(rate(a) - rate(b)) * 100)} points.`}
        </p>
      </section>

      {/* Errors */}
      <section className={`${card} mt-3`}>
        <h2 className="flex items-center gap-2 text-base"><Bug className="h-4 w-4 text-rose-500" />Errors, last 7 days</h2>
        <p className="mt-1 text-sm text-slate-500">{data.errors.count_7d === 0 ? 'No errors reported.' : `${data.errors.count_7d} reports from ${data.errors.people_7d} signed-in ${data.errors.people_7d === 1 ? 'person' : 'people'}.`}</p>
        {data.errors.top.length > 0 && <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {data.errors.top.map((e) => <li key={e.message} className="flex items-start gap-3 py-2 text-sm">
            <span className="min-w-0 flex-1"><span className="block break-words font-mono text-xs">{e.message}</span><span className="text-xs text-slate-500">{e.path ?? '–'} · last {new Date(e.last_seen).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span></span>
            <span className="shrink-0 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-600 tabular-nums">{e.n}×</span>
          </li>)}
        </ul>}
      </section>
    </main>
  )
}
