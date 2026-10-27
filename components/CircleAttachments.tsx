'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Download, Eye, FileText, Paperclip, X } from 'lucide-react'
import { mediaLimitError, shrinkImage } from '@/lib/media'
import { supabase } from '@/utils/supabase'

/** `downloadable`: false when the mentor marked the file view only. Missing means students can download. */
export interface Attachment { path: string; name: string; type: string; size: number; downloadable?: boolean }

const BUCKET = 'circle-files'
export const MAX_FILES = 10
const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm'

/** Turn a storage error into a reason people can act on. */
const uploadHint = (message: string) => {
  if (/size|too large|exceed/i.test(message)) return 'The file is too large.'
  if (/mime|type/i.test(message)) return 'This file type isn’t supported.'
  if (/bucket not found/i.test(message)) return 'File storage isn’t set up yet.'
  if (/security|policy|unauthori|permission|403/i.test(message)) return 'Only the circle’s mentors can attach files.'
  if (/fetch|network|timeout/i.test(message)) return 'Check your connection and try again.'
  return `(${message})`
}

const sizeLabel = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Download choice for files not uploaded yet, kept beside the File itself.
const downloadChoice = new WeakMap<File, boolean>()
const allowsDownload = (file: File) => downloadChoice.get(file) !== false

/** Upload files into the circle's private folder and return their attachment records. */
export async function uploadCircleFiles(circleId: string, files: File[]): Promise<Attachment[]> {
  const uploaded: Attachment[] = []
  for (const file of files) {
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(-80) || 'file'
    const path = `${circleId}/${crypto.randomUUID()}-${safeName}`
    let { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000' })
    if (error && /fetch|network|timeout/i.test(error.message)) {
      // Mobile networks drop uploads now and then: try once more before giving up.
      ;({ error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: true }))
    }
    if (error) throw new Error(`“${file.name}” could not be uploaded. ${uploadHint(error.message)}`)
    uploaded.push({ path, name: file.name, type: file.type, size: file.size, downloadable: allowsDownload(file) })
  }
  return uploaded
}

export async function removeCircleFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}

function DownloadToggle({ on, name, onToggle }: { on: boolean; name: string; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-pressed={on} aria-label={on ? `${name}: students can download. Tap for view only.` : `${name}: view only. Tap to allow download.`} title={on ? 'Students can download' : 'View only'}
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] font-black ${on ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
      {on ? <Download className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{on ? 'Can download' : 'View only'}
    </button>
  )
}

/** Choose several photos, PDFs or videos; each chip has a view-only / download switch. */
export function AttachmentPicker({ files, existing = [], onFilesChange, onRemoveExisting, onExistingChange, onError }: {
  files: File[]; existing?: Attachment[]
  onFilesChange: (files: File[]) => void; onRemoveExisting?: (path: string) => void
  onExistingChange?: (existing: Attachment[]) => void; onError: (message: string) => void
}) {
  const total = files.length + existing.length
  const [preparing, setPreparing] = useState(false)

  const add = async (list: FileList | null) => {
    if (!list) return
    const picked = Array.from(list)
    const allowed = picked.filter((file) => ACCEPT.split(',').includes(file.type))
    if (allowed.length < picked.length) onError('Only photos, PDFs and videos can be attached.')
    const tooBig = allowed.map((file) => mediaLimitError(file)).find(Boolean)
    if (tooBig) { onError(tooBig); return }
    const room = MAX_FILES - total
    if (allowed.length > room) onError(`You can attach up to ${MAX_FILES} files.`)
    setPreparing(true)
    const ready = await Promise.all(allowed.slice(0, Math.max(0, room)).map((file) => (file.type.startsWith('image/') ? shrinkImage(file) : Promise.resolve(file))))
    setPreparing(false)
    onFilesChange([...files, ...ready])
  }

  const toggleNew = (file: File) => { downloadChoice.set(file, !allowsDownload(file)); onFilesChange([...files]) }
  const toggleExisting = (path: string) => onExistingChange?.(existing.map((file) => file.path === path ? { ...file, downloadable: file.downloadable === false } : file))

  return (
    <div className="space-y-2">
      {total > 0 && <ul className="flex flex-wrap gap-2">
        {existing.map((file) => <li key={file.path} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-100 py-1 pl-2 pr-1 text-xs font-semibold dark:bg-slate-800"><FileText className="h-3.5 w-3.5 shrink-0 text-amber-500" /><span className="truncate">{file.name}</span>
          {onExistingChange && <DownloadToggle on={file.downloadable !== false} name={file.name} onToggle={() => toggleExisting(file.path)} />}
          {onRemoveExisting && <button type="button" onClick={() => onRemoveExisting(file.path)} aria-label={`Remove ${file.name}`} className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:text-rose-500"><X className="h-3.5 w-3.5" /></button>}</li>)}
        {files.map((file, index) => <li key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-amber-500/10 py-1 pl-2 pr-1 text-xs font-semibold text-amber-800 dark:text-amber-200"><FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{file.name}</span><span className="shrink-0 font-normal opacity-70">{sizeLabel(file.size)}</span>
          <DownloadToggle on={allowsDownload(file)} name={file.name} onToggle={() => toggleNew(file)} />
          <button type="button" onClick={() => onFilesChange(files.filter((_, i) => i !== index))} aria-label={`Remove ${file.name}`} className="grid h-6 w-6 place-items-center rounded-md hover:text-rose-500"><X className="h-3.5 w-3.5" /></button></li>)}
      </ul>}
      {total > 0 && <p className="text-[11px] text-slate-500">Tap a file’s label to switch between “Can download” and “View only” for students.</p>}
      {total < MAX_FILES && <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-amber-500 dark:border-slate-700 dark:text-slate-300">
        <Paperclip className="h-4 w-4 text-amber-500" />{preparing ? 'Preparing…' : 'Attach photos, PDFs or videos'}
        <input type="file" multiple accept={ACCEPT} className="sr-only" onChange={(event) => { void add(event.target.files); event.target.value = '' }} />
      </label>}
    </div>
  )
}

/** Save a file through a short-lived link that tells the browser to download it. */
async function downloadFile(file: Attachment) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(file.path, 60, { download: file.name })
  if (!data?.signedUrl) return
  const link = document.createElement('a')
  link.href = data.signedUrl
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
}

// pdf.js, loaded from a CDN only when a PDF is opened, draws pages as pictures so the file itself isn't handed over.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174'
interface PdfPage { getViewport: (options: { scale: number }) => { width: number; height: number }; render: (options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> } }
interface PdfDocument { numPages: number; getPage: (page: number) => Promise<PdfPage>; destroy: () => void }
interface PdfLib { GlobalWorkerOptions: { workerSrc: string }; getDocument: (source: { url: string }) => { promise: Promise<PdfDocument> } }
let pdfLib: Promise<PdfLib> | null = null
function loadPdfLib() {
  pdfLib ??= new Promise<PdfLib>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${PDFJS}/pdf.min.js`
    script.onload = () => {
      const lib = (window as unknown as { pdfjsLib?: PdfLib }).pdfjsLib
      if (!lib) { reject(new Error('missing')); return }
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS}/pdf.worker.min.js`
      resolve(lib)
    }
    script.onerror = () => { pdfLib = null; reject(new Error('blocked')) }
    document.head.appendChild(script)
  })
  return pdfLib
}

function PdfPages({ url }: { url: string }) {
  const holder = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let cancelled = false
    let doc: PdfDocument | null = null
    const box = holder.current
    if (!box) return
    void (async () => {
      try {
        const lib = await loadPdfLib()
        doc = await lib.getDocument({ url }).promise
        if (cancelled) return
        setStatus('ready')
        const width = box.clientWidth || 360
        const ratio = Math.min(window.devicePixelRatio || 1, 2)
        for (let number = 1; number <= doc.numPages && !cancelled; number += 1) {
          const page = await doc.getPage(number)
          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: (width / base.width) * ratio })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = '100%'
          canvas.className = 'mb-2 rounded-lg bg-white shadow'
          const context = canvas.getContext('2d')
          if (!context) continue
          box.appendChild(canvas)
          await page.render({ canvasContext: context, viewport }).promise
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true; doc?.destroy(); box.replaceChildren() }
  }, [url])

  return (
    <>
      {status === 'loading' && <p className="py-10 text-center text-sm text-slate-300">Opening…</p>}
      {status === 'error' && <p className="py-10 text-center text-sm text-slate-300">This PDF could not be opened. Check your connection and try again.</p>}
      <div ref={holder} />
    </>
  )
}

/** Full-screen viewer. Long-press saving is turned off; Download shows only when the mentor allowed it (or for mentors). */
function Viewer({ file, url, canDownload, onClose }: { file: Attachment; url: string; canDownload: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-950/95" role="dialog" aria-modal="true" aria-label={file.name}
      onContextMenu={(event) => { if (!canDownload) event.preventDefault() }}
      style={{ WebkitTouchCallout: canDownload ? undefined : 'none', userSelect: canDownload ? undefined : 'none' }}>
      <div className="flex items-center gap-2 px-4 py-3 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-bold">{file.name}</p>
        {canDownload
          ? <button type="button" onClick={() => void downloadFile(file)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-black text-slate-950"><Download className="h-4 w-4" />Download</button>
          : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400"><Eye className="h-3.5 w-3.5" />View only</span>}
        <button type="button" onClick={onClose} autoFocus aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><X className="h-5 w-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
        {file.type === 'application/pdf'
          ? <div className="mx-auto max-w-3xl"><PdfPages url={url} /></div>
          : <div className="relative h-full min-h-[60vh]"><Image src={url} alt={file.name} fill unoptimized draggable={false} className="pointer-events-none object-contain" /></div>}
      </div>
    </div>
  )
}

/** Show attachments: photos as a grid, videos inline, PDFs as rows. Photos and PDFs open in the in-app viewer. */
export function AttachmentList({ attachments, isAdmin = false }: { attachments: Attachment[]; isAdmin?: boolean }) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Attachment | null>(null)

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
  const canDownload = (file: Attachment) => isAdmin || file.downloadable !== false
  const badge = (file: Attachment) => isAdmin && <span className={`text-[10px] font-black ${file.downloadable !== false ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>{file.downloadable !== false ? 'Students can download' : 'View only for students'}</span>

  return (
    <div className="mt-3 space-y-2">
      {images.length > 0 && <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.map((file) => <button type="button" key={file.path} onClick={() => urls[file.path] && setOpen(file)} onContextMenu={(event) => { if (!canDownload(file)) event.preventDefault() }} aria-label={`Open ${file.name}`}
          className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950" style={{ WebkitTouchCallout: canDownload(file) ? undefined : 'none' }}>
          {urls[file.path] && <Image src={urls[file.path]} alt={file.name} fill unoptimized draggable={false} className="pointer-events-none object-cover" />}
          {isAdmin && <span className={`absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black ${file.downloadable !== false ? 'bg-emerald-500 text-white' : 'bg-slate-900/70 text-white'}`}>{file.downloadable !== false ? <Download className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{file.downloadable !== false ? 'Download' : 'View only'}</span>}
        </button>)}
      </div>}
      {videos.map((file) => urls[file.path] && <div key={file.path}>
        <video src={urls[file.path]} controls playsInline controlsList={canDownload(file) ? undefined : 'nodownload'} disablePictureInPicture={!canDownload(file)} onContextMenu={(event) => { if (!canDownload(file)) event.preventDefault() }} className="max-h-72 w-full rounded-xl bg-slate-950 object-contain" />
        <div className="mt-1 flex items-center justify-between gap-2">{badge(file)}{canDownload(file) && <button type="button" onClick={() => void downloadFile(file)} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400"><Download className="h-3.5 w-3.5" />Download</button>}</div>
      </div>)}
      {documents.map((file) => <div key={file.path} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 transition hover:border-amber-500 dark:border-slate-700">
        <button type="button" onClick={() => urls[file.path] && setOpen(file)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-[10px] font-black text-rose-600 dark:text-rose-300">PDF</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{file.name}</span><span className="block text-xs text-slate-500">{sizeLabel(file.size)} · tap to open{isAdmin ? '' : canDownload(file) ? '' : ' · view only'}</span>{badge(file)}</span>
        </button>
        {canDownload(file) && <button type="button" onClick={() => void downloadFile(file)} aria-label={`Download ${file.name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"><Download className="h-4 w-4" /></button>}
      </div>)}
      {open && urls[open.path] && <Viewer file={open} url={urls[open.path]} canDownload={canDownload(open)} onClose={() => setOpen(null)} />}
    </div>
  )
}
