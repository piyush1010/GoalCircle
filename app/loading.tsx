export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-4 px-4 py-6 pb-28" aria-label="Loading" aria-busy="true">
      <div className="h-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </main>
  )
}
