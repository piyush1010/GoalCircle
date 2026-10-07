'use client'

import { useEffect } from 'react'
import { RotateCcw, TriangleAlert } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main className="grid min-h-[80vh] place-items-center px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><TriangleAlert className="h-6 w-6" /></div>
        <h1 className="text-lg font-black">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your data is safe. Try loading this screen again.</p>
        <button onClick={reset} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950"><RotateCcw className="h-4 w-4" />Try again</button>
      </div>
    </main>
  )
}
