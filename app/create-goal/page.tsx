'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlignLeft, ArrowLeft, CalendarDays, Camera, Film, Globe2, ImagePlus, LockKeyhole, Music2, X } from 'lucide-react'
import MusicPicker, { type SelectedTrack } from '@/components/MusicPicker'
import { supabase } from '@/utils/supabase'

type Visibility = 'public' | 'private'
type PostFormat = 'text' | 'image' | 'video'

const formats = [
  { value: 'text' as const, label: 'Text', icon: AlignLeft },
  { value: 'image' as const, label: 'Photo', icon: ImagePlus },
  { value: 'video' as const, label: 'Reel', icon: Film },
]

export default function CreateGoalPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [postFormat, setPostFormat] = useState<PostFormat>('text')
  const [caption, setCaption] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [media, setMedia] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(null)
  const [musicOpen, setMusicOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  const removeMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setMedia(null)
  }

  const chooseFormat = (format: PostFormat) => {
    if (format !== postFormat) removeMedia()
    setPostFormat(format)
    setError(null)
  }

  const chooseVisibility = (next: Visibility) => {
    setVisibility(next)
    setError(null)
    if (next === 'private') {
      setPostFormat('text')
      setSelectedTrack(null)
      removeMedia()
    }
  }

  const chooseMedia = async (file?: File) => {
    if (!file) return
    const actualType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null
    if (!actualType || actualType !== postFormat) {
      setError(postFormat === 'image' ? 'Choose an image for this post.' : 'Choose a video for this reel.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Media must be smaller than 25 MB.')
      return
    }
    if (actualType === 'video') {
      const url = URL.createObjectURL(file)
      const duration = await new Promise<number>((resolve) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => resolve(video.duration)
        video.onerror = () => resolve(Infinity)
        video.src = url
      })
      URL.revokeObjectURL(url)
      if (!Number.isFinite(duration) || duration > 30) {
        setError('Reels can be up to 30 seconds long.')
        return
      }
    }
    removeMedia()
    setMedia(file)
    setPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (cleanTitle.length < 3) {
      setError('Give your goal a clear title of at least 3 characters.')
      return
    }
    if (visibility === 'public' && postFormat !== 'text' && !media) {
      setError(postFormat === 'image' ? 'Add a photo before publishing.' : 'Add a reel before publishing.')
      return
    }

    setSubmitting(true)
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      router.replace('/login?next=/create-goal')
      return
    }

    let mediaUrl: string | null = null
    let uploadedPath: string | null = null
    if (visibility === 'public' && media && postFormat !== 'text') {
      const fallbackExtension = postFormat === 'video' ? 'mp4' : 'webp'
      const extension = media.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || fallbackExtension
      uploadedPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('goal-media').upload(uploadedPath, media, { contentType: media.type, cacheControl: '31536000' })
      if (uploadError) {
        setError('Your media could not be uploaded. The goal was not created.')
        setSubmitting(false)
        return
      }
      mediaUrl = supabase.storage.from('goal-media').getPublicUrl(uploadedPath).data.publicUrl
    }

    const { data, error: createError } = await supabase.rpc('create_goal_post', {
      goal_title: cleanTitle,
      goal_visibility: visibility,
      announcement_media_url: mediaUrl,
      announcement_type: visibility === 'public' ? postFormat : 'text',
      achievement_date: targetDate || null,
      announcement_caption: visibility === 'public' ? caption.trim() || null : null,
      track_title: visibility === 'public' ? selectedTrack?.title || null : null,
      track_artist: visibility === 'public' ? selectedTrack?.artist || null : null,
      track_artwork_url: visibility === 'public' ? selectedTrack?.artworkUrl || null : null,
      track_preview_url: visibility === 'public' ? selectedTrack?.previewUrl || null : null,
      track_source: visibility === 'public' ? selectedTrack?.source || null : null,
    })

    const goalId = typeof data === 'string' ? data : null
    if (createError) {
      if (uploadedPath) await supabase.storage.from('goal-media').remove([uploadedPath])
      setError(createError.message || 'Your goal could not be created. Please try again.')
      setSubmitting(false)
      return
    }

    router.replace(visibility === 'public' ? '/feed?published=goal' : goalId ? `/goal/${goalId}` : '/profile')
    router.refresh()
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-24 pt-3">
      <header className="mb-3 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button>
        <div><h1 className="text-lg font-black">Create a goal</h1><p className="text-[11px] text-slate-500">Set it. Share it. Show up.</p></div>
      </header>

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
        <label htmlFor="goal-title" className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">Your goal</label>
        <input id="goal-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Read 20 pages every day" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-bold outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-[#07101f]" />

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button type="button" onClick={() => chooseVisibility('public')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${visibility === 'public' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}><Globe2 className="h-3.5 w-3.5" />Public</button>
            <button type="button" onClick={() => chooseVisibility('private')} className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${visibility === 'private' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}><LockKeyhole className="h-3.5 w-3.5" />Private</button>
          </div>
          <label className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 dark:border-slate-700" title="Achievement date"><CalendarDays className="h-4 w-4 text-slate-400" /><input type="date" value={targetDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setTargetDate(event.target.value)} aria-label="Achievement date" className="w-[7.7rem] bg-transparent py-2 text-[11px] font-bold outline-none" /></label>
        </div>

        {visibility === 'public' && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="grid grid-cols-3 gap-2">
            {formats.map((format) => { const Icon = format.icon; const selected = postFormat === format.value; return <button type="button" key={format.value} onClick={() => chooseFormat(format.value)} aria-pressed={selected} className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-black ${selected ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}><Icon className="h-3.5 w-3.5" />{format.label}</button> })}
          </div>

          {postFormat !== 'text' && <div className="mt-2">
            {previewUrl ? <div className="relative overflow-hidden rounded-xl bg-slate-950">{postFormat === 'video' ? <video src={previewUrl} controls playsInline className="max-h-52 w-full object-contain" /> : <div className="relative h-40"><Image src={previewUrl} alt="Goal post preview" fill unoptimized className="object-cover" /></div>}<button type="button" onClick={removeMedia} aria-label="Remove media" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button></div> : <div className="grid grid-cols-2 gap-2"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-[11px] font-black dark:border-slate-700"><Camera className="h-4 w-4 text-amber-500" />{postFormat === 'video' ? 'Record clip' : 'Take photo'}<input type="file" accept={postFormat === 'video' ? 'video/*' : 'image/*'} capture="environment" className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-[11px] font-black dark:border-slate-700">{postFormat === 'video' ? <Film className="h-4 w-4 text-amber-500" /> : <ImagePlus className="h-4 w-4 text-amber-500" />}Library<input type="file" accept={postFormat === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'} className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label></div>}
          </div>}

          <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={2} maxLength={500} placeholder="Add a caption (optional)" className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-[#07101f]" />

          {selectedTrack ? <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700"><Image src={selectedTrack.artworkUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-lg" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black">{selectedTrack.title}</p><p className="truncate text-[9px] text-slate-500">{selectedTrack.artist}</p></div><button type="button" onClick={() => setMusicOpen(true)} className="text-[10px] font-black text-amber-600 dark:text-amber-400">Change</button><button type="button" onClick={() => setSelectedTrack(null)} aria-label="Remove music" className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-3.5 w-3.5" /></button></div> : <button type="button" onClick={() => setMusicOpen(true)} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"><Music2 className="h-4 w-4 text-amber-500" />Add music</button>}
        </div>}

        {visibility === 'private' && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-500 dark:bg-[#07101f]">Only you can see this goal. No Feed post will be created.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={submitting} className="mt-3 w-full rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-60">{submitting ? 'Publishing…' : visibility === 'public' ? 'Publish goal' : 'Create private goal'}</button>
      </form>

      <MusicPicker open={musicOpen} selected={selectedTrack} onClose={() => setMusicOpen(false)} onSelect={setSelectedTrack} />
    </main>
  )
}
