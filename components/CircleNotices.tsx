'use client'

import { confirmAction } from '@/lib/confirm'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Pin, PinOff, Trash2 } from 'lucide-react'
import { AttachmentList, AttachmentPicker, removeCircleFiles, uploadCircleFiles, type Attachment } from '@/components/CircleAttachments'
import { supabase } from '@/utils/supabase'

interface Notice { id: string; body: string | null; media_url: string | null; media_type: 'image' | 'video' | null; pinned: boolean; created_at: string; attachments: Attachment[] }

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]'

export default function CircleNotices({ circleId, userId, isAdmin }: { circleId: string; userId: string; isAdmin: boolean }) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [posting, setPosting] = useState(false)
  const [composing, setComposing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('circle_posts').select('id,body,media_url,media_type,pinned,created_at,attachments').eq('circle_id', circleId).order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(20)
    setNotices((data || []) as Notice[])
  }, [circleId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const clearComposer = () => { setBody(''); setPinned(false); setFiles([]); setComposing(false) }

  const post = async () => {
    if (!body.trim() && files.length === 0) { setError('Write a notice or attach a file.'); return }
    setPosting(true); setError(null)
    let attachments: Attachment[] = []
    try { attachments = await uploadCircleFiles(circleId, files) } catch (uploadError) { setError((uploadError as Error).message); setPosting(false); return }
    const { error: postError } = await supabase.from('circle_posts').insert({ circle_id: circleId, author_id: userId, body: body.trim() || null, attachments, pinned })
    setPosting(false)
    if (postError) { await removeCircleFiles(attachments.map((file) => file.path)); setError('The notice could not be posted.'); return }
    clearComposer()
    void load()
  }

  const togglePin = async (notice: Notice) => {
    await supabase.from('circle_posts').update({ pinned: !notice.pinned }).eq('id', notice.id)
    void load()
  }

  const remove = async (notice: Notice) => {
    if (!(await confirmAction('Delete this notice for everyone?'))) return
    await supabase.from('circle_posts').delete().eq('id', notice.id)
    void removeCircleFiles((notice.attachments ?? []).map((file) => file.path))
    void load()
  }

  if (!isAdmin && notices.length === 0) return null

  return (
    <section data-tour="notices" className="mt-3 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="flex items-center gap-1.5 text-sm font-black"><Megaphone className="h-4 w-4 text-amber-500" />Notices</h2>
        {isAdmin && !composing && <button type="button" onClick={() => setComposing(true)} className="text-xs font-bold text-amber-600 dark:text-amber-400">+ New notice</button>}
      </div>

      {isAdmin && composing && <div className={card}>
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={3} maxLength={2000} autoFocus placeholder="e.g. Mock test this Sunday at 9 AM. Notes attached." className="max-h-72 min-h-[5rem] w-full resize-none [field-sizing:content] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-[#07101f]" />
        <div className="mt-2"><AttachmentPicker files={files} onFilesChange={setFiles} onError={setError} /></div>
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={() => setPinned((on) => !on)} aria-pressed={pinned} className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${pinned ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}><Pin className="h-3.5 w-3.5" />Pin</button>
          <span className="flex-1" />
          <button type="button" onClick={clearComposer} className="h-10 rounded-xl px-3 text-xs font-bold text-slate-500">Cancel</button>
          <button type="button" onClick={() => void post()} disabled={posting} className="h-10 rounded-xl bg-amber-500 px-4 text-xs font-black text-slate-950 disabled:opacity-60">{posting ? 'Posting…' : 'Post'}</button>
        </div>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
      </div>}

      {notices.length === 0 && isAdmin && !composing && <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">Post notices, new targets or test dates here. Students are notified.</p>}

      {notices.map((notice) => <article key={notice.id} className={`${card} ${notice.pinned ? 'border-amber-500/50' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-bold text-slate-400">{notice.pinned && <span className="mr-1 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><Pin className="h-3 w-3" />Pinned ·</span>}{new Date(notice.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
          {isAdmin && <div className="flex gap-1">
            <button type="button" onClick={() => void togglePin(notice)} aria-label={notice.pinned ? 'Unpin notice' : 'Pin notice'} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-amber-500">{notice.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}</button>
            <button type="button" onClick={() => void remove(notice)} aria-label="Delete notice" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
          </div>}
        </div>
        {notice.body && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{notice.body}</p>}
        {notice.media_url && (notice.media_type === 'video'
          ? <video src={notice.media_url} controls playsInline className="mt-3 max-h-72 w-full rounded-xl bg-slate-950 object-contain" />
          : <div className="relative mt-3 h-56 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950"><Image src={notice.media_url} alt="Notice" fill unoptimized className="object-contain" /></div>)}
        <AttachmentList attachments={notice.attachments ?? []} isAdmin={isAdmin} />
      </article>)}
    </section>
  )
}
