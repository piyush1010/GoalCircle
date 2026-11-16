'use client'

import { useEffect, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { composerHint, removePhoto, saveError, uploadPhoto, type DiscussionPost } from '@/lib/discussions'

export interface Place { key: string; name: string }

/**
 * Write a question or a post. With more than one community to choose from, it asks where.
 * Pass `editing` to change an existing post instead.
 */
export default function Composer({ places, initialPlace, editing, onDone, onCancel, autoFocus = true }: {
  places: Place[]; initialPlace?: string; editing?: DiscussionPost
  onDone: (post: DiscussionPost) => void; onCancel?: () => void; autoFocus?: boolean
}) {
  const [place, setPlace] = useState(editing?.community ?? initialPlace ?? places[0]?.key ?? '')
  const [kind, setKind] = useState<'question' | 'post'>(editing?.kind ?? 'question')
  const [body, setBody] = useState(editing?.body ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(editing?.image_url ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { if (autoFocus) box.current?.focus() }, [autoFocus])
  useEffect(() => () => { if (photo && preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [photo, preview])

  const clean = body.trim()
  const ready = clean.length >= 3 && Boolean(place)

  const pick = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please choose a photo.'); return }
    setError(null); setPhoto(file); setPreview(URL.createObjectURL(file))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || busy) return
    setBusy(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); setError('Please sign in again.'); return }
    let imageUrl = preview && !photo ? editing?.image_url ?? null : null
    if (photo) {
      const uploaded = await uploadPhoto(session.user.id, photo)
      if (uploaded.error) { setBusy(false); setError(uploaded.error); return }
      imageUrl = uploaded.url
    }
    const saved = editing
      ? await supabase.from('community_posts').update({ body: clean, kind, image_url: imageUrl }).eq('id', editing.id).select('id').single()
      : await supabase.from('community_posts').insert({ community: place, kind, body: clean, image_url: imageUrl }).select('id').single()
    if (saved.error || !saved.data) {
      if (photo) void removePhoto(imageUrl)
      setBusy(false); setError(saveError(saved.error?.message)); return
    }
    if (editing?.image_url && editing.image_url !== imageUrl) void removePhoto(editing.image_url)
    const { data: card } = await supabase.from('community_post_cards').select('*').eq('id', saved.data.id).single()
    setBusy(false)
    if (card) onDone(card as DiscussionPost)
  }

  const seg = (on: boolean) => `rounded-lg py-2 text-sm font-semibold ${on ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`

  return <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="What are you posting?">
      <button type="button" aria-pressed={kind === 'question'} onClick={() => setKind('question')} className={seg(kind === 'question')}>Ask a question</button>
      <button type="button" aria-pressed={kind === 'post'} onClick={() => setKind('post')} className={seg(kind === 'post')}>Share something</button>
    </div>

    {!editing && places.length > 1 && <label className="mt-3 block text-sm font-medium text-slate-600 dark:text-slate-300">Post in
      <select value={place} onChange={(e) => setPlace(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[15px] text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        {places.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
      </select>
    </label>}

    <label className="sr-only" htmlFor="composer-body">{kind === 'question' ? 'Your question' : 'Your post'}</label>
    <textarea id="composer-body" ref={box} value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} placeholder={composerHint(place, kind)}
      className="mt-3 block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-[15px] leading-relaxed outline-none focus:border-slate-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-400" />
    {body.length > 1800 && <p className="mt-1 text-right text-xs text-slate-500">{2000 - body.length} characters left</p>}

    {preview && <div className="relative mt-3 inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={preview} alt="The photo you're adding" className="max-h-48 rounded-xl border border-slate-200 object-contain dark:border-slate-700" />
      <button type="button" onClick={() => { setPhoto(null); setPreview(null); if (input.current) input.current.value = '' }} aria-label="Remove the photo" className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900"><X className="h-4 w-4" /></button>
    </div>}

    <div className="mt-3 flex items-center gap-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {!preview && <button type="button" onClick={() => input.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ImagePlus className="h-5 w-5" />Add a photo</button>}
      <span className="flex-1" />
      {onCancel && <button type="button" onClick={onCancel} className="h-10 rounded-xl px-3 text-sm font-medium text-slate-500">Cancel</button>}
      <button type="submit" disabled={!ready || busy} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Posting…' : editing ? 'Save' : kind === 'question' ? 'Ask' : 'Post'}</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm font-medium text-rose-600">{error}</p>}
  </form>
}
