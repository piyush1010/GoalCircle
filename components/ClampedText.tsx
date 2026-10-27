'use client'

import { useState } from 'react'

/** Long text (like a pasted notice) shows four lines with "Show more", so the page stays short. */
export default function ClampedText({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 220 || text.split('\n').length > 4
  return (
    <div className={className}>
      <p className={`whitespace-pre-line break-words ${long && !open ? 'line-clamp-4' : ''}`}>{text}</p>
      {long && <button type="button" onClick={() => setOpen((value) => !value)} className="mt-1 text-sm font-black text-amber-600 dark:text-amber-400">{open ? 'Show less' : 'Show more'}</button>}
    </div>
  )
}
