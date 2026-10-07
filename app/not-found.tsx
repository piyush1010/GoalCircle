import Link from 'next/link'
import { MapPinOff } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="grid min-h-[80vh] place-items-center px-6">
      <div className="max-w-sm text-center"><MapPinOff className="mx-auto mb-4 h-10 w-10 text-amber-500" /><h1 className="text-lg font-black">This page is not available</h1><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">It may have moved or no longer exists.</p><Link href="/feed" className="mt-5 inline-flex rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950">Return to your feed</Link></div>
    </main>
  )
}
