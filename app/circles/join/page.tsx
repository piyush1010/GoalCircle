'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, UsersRound } from 'lucide-react'
import { goBack } from '@/lib/goBack'

/** Join a batch with the code or link a mentor shared, or start your own. */
export default function JoinBatchPage() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const join = (e: React.FormEvent) => {
    e.preventDefault()
    // Accept the whole invite link or just the code at its end.
    const code = value.trim().split('/').filter(Boolean).pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() ?? ''
    if (code.length < 6) { setError('That code looks too short. Paste the whole link your mentor sent, or check the code.'); return }
    router.push(`/circles/join/${code}`)
  }

  return <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4">
    <div className="flex h-10 items-center gap-2">
      <button type="button" onClick={() => goBack(router, '/circles')} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button>
      <span className="text-[15px] font-semibold">Batches</span>
    </div>
    <form onSubmit={join} className="pt-6">
      <h1 className="text-[26px] font-bold tracking-tight">Join a batch</h1>
      <p className="mt-1.5 text-[15px] text-slate-500">Paste the link or code your mentor, trainer or friend shared.</p>
      <label htmlFor="code" className="mt-6 block text-sm font-semibold text-slate-700 dark:text-slate-300">Link or code</label>
      <input id="code" value={value} onChange={(e) => { setValue(e.target.value); setError(null) }} autoFocus autoCapitalize="none" autoCorrect="off" placeholder="For example, 3f9a1c7b2e4d" className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base dark:border-slate-700 dark:bg-slate-900" />
      {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
      <button type="submit" disabled={!value.trim()} className="mt-4 h-14 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">Join</button>
    </form>
    <Link href="/circles/new" className="mt-10 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"><UsersRound className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Start your own batch</span><span className="block text-sm text-slate-500">For your students, clients or a group of friends</span></span>
      <ChevronRight className="h-4 w-4 text-slate-400" />
    </Link>
  </main>
}
