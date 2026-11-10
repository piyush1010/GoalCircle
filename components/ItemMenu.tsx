'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { confirmAction } from '@/lib/confirm'

/**
 * The same small "⋯" menu on every list item a person created: Edit and Delete.
 * Delete always asks first, in plain words, and says what will be lost.
 */
export default function ItemMenu({ label, onEdit, onDelete, deleteMessage }: {
  label: string // what the item is, for screen readers: "mistake", "note"
  onEdit?: () => void
  onDelete?: () => Promise<boolean>
  deleteMessage?: string
}) {
  const [open, setOpen] = useState(false)
  // Placed against the screen, not the card, so it is never clipped; opens upwards near the bottom bar.
  const [pos, setPos] = useState<React.CSSProperties>({})
  const [busy, setBusy] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const place = () => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const up = r.bottom > window.innerHeight - 200
    setPos({ position: 'fixed', right: Math.max(8, window.innerWidth - r.right), ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }) })
  }
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const follow = () => place() // stay next to the item while the page scrolls
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', follow, true)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', follow, true) }
  }, [open])

  const remove = async () => {
    setOpen(false)
    if (!onDelete) return
    const ok = await confirmAction(deleteMessage ?? `Delete this ${label}? This can't be undone.`, { confirmLabel: 'Delete', danger: true })
    if (!ok) return
    setBusy(true); await onDelete(); setBusy(false)
  }

  return <div ref={box} className="relative shrink-0">
    <button type="button" disabled={busy} ref={btn} onClick={() => { place(); setOpen(!open) }} aria-haspopup="menu" aria-expanded={open} aria-label={`Edit or delete ${label}`} className="-m-1 grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"><MoreHorizontal className="h-5 w-5" /></button>
    {open && <div role="menu" style={pos} className="z-[70] min-w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      {onEdit && <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit() }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"><Pencil className="h-4 w-4 text-slate-400" />Edit</button>}
      {onDelete && <button type="button" role="menuitem" onClick={() => void remove()} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" />Delete</button>}
    </div>}
  </div>
}
