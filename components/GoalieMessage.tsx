import Link from 'next/link'
import GoalieSays from '@/components/GoalieSays'

/** Goalie suggesting the next step on an empty screen. */
export default function GoalieMessage({ title, message, actionLabel, href, onAction }: {
  title: string; message: string; actionLabel?: string; href?: string; onAction?: () => void
}) {
  const button = 'mt-4 inline-flex rounded-xl bg-slate-900 dark:bg-slate-50 px-5 py-2.5 text-sm font-bold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-white'
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-[#101B2D]">
      <GoalieSays lines="empty" mood="sleepy" size={64} layout="stack" />
      <h2 className="mt-3 text-base font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {actionLabel && href && <Link href={href} className={button}>{actionLabel}</Link>}
      {actionLabel && !href && onAction && <button type="button" onClick={onAction} className={button}>{actionLabel}</button>}
    </div>
  )
}
