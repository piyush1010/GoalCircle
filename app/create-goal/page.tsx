'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Film, Globe2, ImagePlus, LockKeyhole, Target, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'

export default function CreateGoalPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [media, setMedia] = useState<File | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState('')

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const chooseMedia = async (file?: File) => {
    if (!file) return
    const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null
    if (!type) { setError('Choose a JPG, PNG, WebP, MP4, MOV or WebM file.'); return }
    if (file.size > 25 * 1024 * 1024) { setError('Media must be smaller than 25 MB.'); return }
    if (type === 'video') {
      const url = URL.createObjectURL(file)
      const duration = await new Promise<number>((resolve) => { const video = document.createElement('video'); video.preload = 'metadata'; video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => resolve(Infinity); video.src = url })
      URL.revokeObjectURL(url)
      if (!Number.isFinite(duration) || duration > 30) { setError('Goal reels can be up to 30 seconds long.'); return }
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setMedia(file); setMediaType(type); setPreviewUrl(URL.createObjectURL(file)); setError(null)
  }

  const removeMedia = () => { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); setMedia(null); setMediaType(null) }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (cleanTitle.length < 3) { setError('Give your goal a clear title of at least 3 characters.'); return }
    setSubmitting(true)
    setError(null)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) { router.replace('/login?next=/create-goal'); return }
    let mediaUrl: string | null = null
    let uploadedPath: string | null = null
    if (media && mediaType) {
      const extension = media.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (mediaType === 'video' ? 'mp4' : 'webp')
      uploadedPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('goal-media').upload(uploadedPath, media, { contentType: media.type, cacheControl: '31536000' })
      if (uploadError) { setError('Your media could not be uploaded. The goal was not created.'); setSubmitting(false); return }
      mediaUrl = supabase.storage.from('goal-media').getPublicUrl(uploadedPath).data.publicUrl
    }
    const { data, error: createError } = await supabase.rpc('create_goal_announcement', { goal_title: cleanTitle, goal_visibility: visibility, announcement_media_url: mediaUrl, announcement_type: mediaType || 'text', achievement_date: targetDate || null })
    const goalId = typeof data === 'string' ? data : null
    if (createError) { if (uploadedPath) await supabase.storage.from('goal-media').remove([uploadedPath]); setError(createError.message || 'Your goal could not be created. Please try again.'); setSubmitting(false); return }
    router.push(goalId ? `/goal/${goalId}` : '/dashboard')
    router.refresh()
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-8 flex items-center gap-3"><button onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-lg font-black">Create a goal</h1><p className="text-xs text-slate-500 dark:text-slate-400">Start with one repeatable action.</p></div></header>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]"><div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><Target className="h-6 w-6" /></div><label htmlFor="goal-title" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">What will you do consistently?</label><input id="goal-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} autoFocus placeholder="Read 20 pages every day" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-[#07101f]" /><div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>Make it specific and achievable.</span><span>{title.length}/100</span></div></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]"><div className="mb-2 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-amber-500" /><h2 className="text-sm font-black">Achievement date</h2></div><p className="mb-3 text-[10px] text-slate-500">Optional. Habits can stay open-ended; projects can have a finish line.</p><input type="date" value={targetDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setTargetDate(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-[#07101f]" /></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]"><div className="mb-1 flex items-center gap-2"><ImagePlus className="h-5 w-5 text-amber-500" /><h2 className="text-sm font-black">Add a cover or short reel</h2></div><p className="mb-4 text-[10px] text-slate-500">Optional · one image or a video up to 30 seconds and 25 MB.</p>{previewUrl ? <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950">{mediaType === 'video' ? <video src={previewUrl} controls playsInline className="aspect-[9/16] max-h-96 w-full object-cover" /> : <><span className="sr-only">Goal announcement preview</span><div className="aspect-[4/5] w-full bg-cover bg-center" style={{ backgroundImage: `url(${previewUrl})` }} /></>}<button type="button" onClick={removeMedia} aria-label="Remove media" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button></div> : <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-slate-300 px-4 py-7 text-center hover:border-amber-500 dark:border-slate-700"><div className="mb-2 flex gap-2 text-amber-500"><ImagePlus className="h-5 w-5" /><Film className="h-5 w-5" /></div><span className="text-xs font-black">Choose photo or video</span><span className="mt-1 text-[10px] text-slate-500">JPG, PNG, WebP, MP4, MOV or WebM</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label>}</section>
        <fieldset><legend className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Who can see it?</legend><div className="grid grid-cols-2 gap-3">{([{ value: 'public' as const, label: 'Public', helper: 'GoalCircle community', icon: Globe2 }, { value: 'private' as const, label: 'Private', helper: 'Only you', icon: LockKeyhole }]).map((option) => { const Icon = option.icon; const selected = visibility === option.value; return <button type="button" key={option.value} onClick={() => setVisibility(option.value)} className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]'}`} aria-pressed={selected}><Icon className={`mb-3 h-5 w-5 ${selected ? 'text-amber-500' : 'text-slate-400'}`} /><span className="block text-sm font-black">{option.label}</span><span className="text-[10px] text-slate-500 dark:text-slate-400">{option.helper}</span></button> })}</div></fieldset>
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating your goal…' : 'Create goal'}</button>
      </form>
    </main>
  )
}
