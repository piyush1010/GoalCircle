'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FileText, Paperclip, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'

export interface Attachment { path: string; name: string; type: string; size: number }

const BUCKET = 'circle-files'
export const MAX_FILES = 10
const MAX_BYTES = 50 * 1024 * 1024
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm'

const sizeLabel = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

/** Upload files into the circle's private folder and return their attachment records. */
export async function uploadCircleFiles(circleId: string, files: File[]): Promise<Attachment[]> {
  const uploaded: Attachment[] = []
  for (const file of files) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'file'
    const path = `${circleId}/${crypto.randomUUID()}-${safeName}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
    if (error) throw new Error(`“${file.name}” could not be uploaded.`)
    uploaded.push({ path, name: file.name, type: file.type, size: file.size })
  }
  return uploaded
}

export async function removeCircleFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}

/** Choose several photos, PDFs or videos; shows them as removable chips. */
export function AttachmentPicker({ files, existing = [], onFilesChange, onRemoveExisting, onError }: {
  files: File[]; existing?: Attachment[]
  onFilesChange: (files: File[]) => void; onRemoveExisting?: (path: string) => void; onError: (message: string) => void
}) {
  const total = files.length + existing.length

  const add = (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list)
    const allowed = picked.filter((file) => ACCEPT.split(',').includes(file.type))
    if (allowed.length < picked.length) onError('Only photos, PDFs and videos can be attached.')
    const tooBig = allowed.find((file) => file.size > MAX_BYTES)
    if (tooBig) { onError(`“${tooBig.name}” is larger than 50 MB.`); return }
    const room = MAX_FILES - total
    if (allowed.length > room) onError(`You can attach up to ${MAX_FILES} files.`)
    onFilesChange([...files, ...allowed.slice(0, Math.max(0, room))])
  }

  return (
    <div className="space-y-2">
      {total > 0 && <ul className="flex flex-wrap gap-2">
        {existing.map((file) => <li key={file.path} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 py-1 pl-2 pr-1 text-xs font-semibold dark:bg-slate-800"><FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" /><span className="truncate">{file.name}</span>{onRemoveExisting && <button type="button" onClick={() => onRemoveExisting(file.path)} aria-label={`Remove ${file.name}`} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>}</li>)}
        {files.map((file, index) => <li key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-amber-500/10 py-1 pl-2 pr-1 text-xs font-semibold text-amber-800 dark:text-amber-200"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{file.name}</span><span className="shrink-0 font-normal opacity-70">{sizeLabel(file.size)}</span><button type="button" onClick={() => onFilesChange(files.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="grid h-6 w-6 place-items-center rounded-md hover:text-rose-500"><X className="h-3.5 w-3.5" /></button></li>)}
      </ul>}
      {total < MAX_FILES && <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-amber-500 dark:border-slate-700 dark:text-slate-300">
        <Paperclip className="h-4 w-4 text-amber-500" />Attach photos, PDFs or videos
        <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(event) => { add(event.target.files); event.target.value = '' }} />
      </label>}
    </div>
  )
}

/** Show attachments: photos as a grid, videos inline, PDFs as rows that open in a new tab. */
export function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!attachments.length) return
    let active = true
    void supabase.storage.from(BUCKET).createSignedUrls(attachments.map((file) => file.path), 60 * 60).then(({ data }) => {
      if (!active || !data) return
      const map: Record<string, string> = {}
      data.forEach((item) => { if (item.path && item.signedUrl) map[item.path] = item.signedUrl })
      setUrls(map)
    })
    return () => { active = false }
  }, [attachments])

  if (!attachments.length) return null
  const images = attachments.filter((file) => file.type.startsWith('image/'))
  const videos = attachments.filter((file) => file.type.startsWith('video/'))
  const documents = attachments.filter((file) => !file.type.startsWith('image/') && !file.type.startsWith('video/'))

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((file) => <a key={file.path} href={urls[file.path]} target="_blank" rel="noreferrer" className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
          {urls[file.path] && <Image src={urls[file.path]} alt={file.name} fill unoptimized className="object-cover" />}
        </a>)}
      </div>}
      {videos.map((file) => urls[file.path] && <video key={file.path} src={urls[file.path]} controls playsInline className="max-h-72 w-full rounded-xl bg-slate-950 object-contain" />)}
      {documents.map((file) => <a key={file.path} href={urls[file.path]} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-amber-500 dark:border-slate-700">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-[10px] font-black text-rose-600 dark:text-rose-300">PDF</span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{file.name}</span><span className="block text-xs text-slate-500">{sizeLabel(file.size)} · tap to open</span></span>
      </a>)}
    </div>
  )
}
