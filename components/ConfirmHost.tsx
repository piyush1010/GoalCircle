'use client'

import { useEffect, useState } from 'react'
import { CONFIRM_EVENT, type ConfirmRequest } from '@/lib/confirm'

/** Shows confirmAction() requests as an in-app dialog. Mounted once in AppShell. */
export default function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    const show = (event: Event) => {
      const next = (event as CustomEvent<ConfirmRequest>).detail
      setRequest((current) => { current?.resolve(false); return next })
    }
    window.addEventListener(CONFIRM_EVENT, show)
    return () => window.removeEventListener(CONFIRM_EVENT, show)
  }, [])

  useEffect(() => {
    if (!request) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { request.resolve(false); setRequest(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [request])

  if (!request) return null
  const answer = (ok: boolean) => { request.resolve(ok); setRequest(null) }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-label="Please confirm" onClick={() => answer(false)}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#101b2d]" onClick={(event) => event.stopPropagation()}>
        <p className="text-sm font-semibold leading-relaxed">{request.message}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => answer(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700">Cancel</button>
          <button type="button" onClick={() => answer(true)} autoFocus className={`flex-1 rounded-xl py-3 text-sm font-black ${request.danger ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'}`}>{request.confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
