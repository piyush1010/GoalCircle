'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UNDO_EVENT, type UndoRequest } from '@/lib/undo'

type Note = { text: string; undo?: UndoRequest['undo']; thenGo?: string }

/** Shows showUndo() notes above the bottom bar for six seconds. Mounted once in AppShell. */
export default function UndoHost() {
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const show = (event: Event) => { const d = (event as CustomEvent<UndoRequest>).detail; setBusy(false); setNote({ ...d }) }
    window.addEventListener(UNDO_EVENT, show)
    return () => window.removeEventListener(UNDO_EVENT, show)
  }, [])

  useEffect(() => {
    if (!note || busy) return
    const t = window.setTimeout(() => setNote(null), note.undo ? 6000 : 2600)
    return () => window.clearTimeout(t)
  }, [note, busy])

  if (!note) return null
  const undo = async () => {
    if (!note.undo) return
    setBusy(true)
    const ok = await note.undo()
    setBusy(false)
    setNote({ text: ok ? 'Undone.' : 'Could not undo. Please try again.' })
    if (ok && note.thenGo) router.push(note.thenGo)
  }

  return <div role="status" className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[75] mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg dark:bg-white dark:text-slate-900">
    <span className={note.undo ? 'min-w-0' : 'w-full text-center'}>{note.text}</span>
    {note.undo && <button type="button" disabled={busy} onClick={() => void undo()} className="shrink-0 px-1 font-semibold text-white underline underline-offset-2 disabled:opacity-60 dark:text-slate-900">{busy ? 'Undoing…' : 'Undo'}</button>}
  </div>
}
