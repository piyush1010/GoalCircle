'use client'

import { formatAmount, isLevel, type GoalReport } from '@/lib/goalReport'

/**
 * A goal's report: one sentence about this week, a bar for each of the last eight weeks,
 * and two plain numbers. Bars show the amount when the goal counts something, otherwise days.
 */
export default function GoalReportCard({ report, compact = false }: { report: GoalReport; compact?: boolean }) {
  const byAmount = Boolean(report.unit) && report.weeks.some((w) => w.amount !== null)
  const value = (w: GoalReport['weeks'][number]) => (byAmount ? w.amount ?? 0 : w.days)
  const values = report.weeks.map(value)
  // Weight: show the change around the range, not from zero, or every bar looks the same.
  const level = byAmount && isLevel(report.unit)
  const present = report.weeks.filter((w) => w.amount !== null).map((w) => w.amount as number)
  const lo = level && present.length ? Math.min(...present) - 1 : 0
  const hi = Math.max(1, ...values) - lo
  const height = (w: GoalReport['weeks'][number]) => { const v = value(w); if (!v) return 0; return Math.max(6, ((v - lo) / hi) * 100) }
  const tip = (w: GoalReport['weeks'][number]) => `Week of ${w.label}: ${byAmount ? (w.amount === null ? 'nothing logged' : `${formatAmount(w.amount)} ${report.unit}`) : `${w.days} ${w.days === 1 ? 'day' : 'days'}`}`

  const empty = values.every((v) => !v)
  if (empty) return <p className={`${compact ? 'text-sm' : 'text-[15px]'} leading-snug text-slate-500`}>No check-ins in the last eight weeks. Log one, and your weeks start to show here.</p>

  return <div>
    <p className={`${compact ? 'text-sm' : 'text-[15px]'} leading-snug text-slate-700 dark:text-slate-200`}>{report.summary}</p>
    <div className={`mt-3 flex items-end gap-1.5 ${compact ? 'h-16' : 'h-24'}`} role="img" aria-label={`${byAmount ? report.unit : 'Days'} for each of the last ${report.weeks.length} weeks: ${report.weeks.map(tip).join('. ')}.`}>
      {report.weeks.map((w) => <div key={w.start} title={tip(w)} className="flex h-full flex-1 flex-col justify-end">
        <span className={`block w-full rounded-t-md ${w.current ? 'bg-amber-500' : 'bg-amber-500/45'}`} style={{ height: `${height(w)}%` }} />
      </div>)}
    </div>
    <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{report.weeks[0].label}</span><span>This week</span></div>
    {!compact && <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <div><dt className="sr-only">This month</dt><dd className="text-xl font-bold tabular-nums">{report.monthDays}<span className="text-sm font-medium text-slate-500"> of {report.monthSoFar}</span></dd><dd className="text-sm text-slate-500">days this month</dd></div>
      <div><dt className="sr-only">Best run</dt><dd className="text-xl font-bold tabular-nums">{report.bestRun}</dd><dd className="text-sm text-slate-500">{report.bestRun === 1 ? 'day' : 'days'} in a row, your best</dd></div>
    </dl>}
  </div>
}
