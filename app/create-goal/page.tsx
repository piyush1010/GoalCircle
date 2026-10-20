'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlignLeft,
  ArrowLeft,
  CalendarDays,
  Film,
  Globe2,
  ImagePlus,
  LockKeyhole,
  Target,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '@/utils/supabase'

type Visibility = 'public' | 'private'
type PostFormat = 'text' | 'image' | 'video'

const announcementFormats: Array<{
  value: PostFormat
  label: string
  helper: string
  icon: LucideIcon
}> = [
  { value: 'text', label: 'Text', helper: 'A clean announcement', icon: AlignLeft },
  { value: 'image', label: 'Photo', helper: 'One strong image', icon: ImagePlus },
  { value: 'video', label: 'Reel', helper: 'Up to 30 seconds', icon: Film },
]

export default function CreateGoalPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [postFormat, setPostFormat] = useState<PostFormat>('text')
  const [announcementCaption, setAnnouncementCaption] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [media, setMedia] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [targetDate, setTargetDate] = useState('')

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

  const chooseVisibility = (nextVisibility: Visibility) => {
    setVisibility(nextVisibility)
    setError(null)
    if (nextVisibility === 'private') {
      setPostFormat('text')
      removeMedia()
    }
  }

  const chooseMedia = async (file?: File) => {
    if (!file) return

    const actualType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : null

    if (!actualType) {
      setError('Choose a JPG, PNG, WebP, MP4, MOV or WebM file.')
      return
    }
    if (actualType !== postFormat) {
      setError(postFormat === 'image' ? 'Choose an image for a photo announcement.' : 'Choose a video for a reel announcement.')
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
        setError('Goal reels can be up to 30 seconds long.')
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
    const cleanCaption = announcementCaption.trim()

    if (cleanTitle.length < 3) {
      setError('Give your goal a clear title of at least 3 characters.')
      return
    }
    if (visibility === 'public' && postFormat !== 'text' && !media) {
      setError(postFormat === 'image' ? 'Add a photo before publishing this goal.' : 'Add a short reel before publishing this goal.')
      return
    }

    setSubmitting(true)
    setError(null)

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      router.replace('/login?next=/create-goal')
      return
    }

    let mediaUrl: string | null = null
    let uploadedPath: string | null = null

    if (visibility === 'public' && media && postFormat !== 'text') {
      const fallbackExtension = postFormat === 'video' ? 'mp4' : 'webp'
      const extension = media.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || fallbackExtension
      uploadedPath = `${session.user.id}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage
        .from('goal-media')
        .upload(uploadedPath, media, {
          contentType: media.type,
          cacheControl: '31536000',
        })

      if (uploadError) {
        setError('Your media could not be uploaded. The goal was not created.')
        setSubmitting(false)
        return
      }
      mediaUrl = supabase.storage.from('goal-media').getPublicUrl(uploadedPath).data.publicUrl
    }

    const { data, error: createError } = await supabase.rpc('create_goal_announcement', {
      goal_title: cleanTitle,
      goal_visibility: visibility,
      announcement_media_url: mediaUrl,
      announcement_type: visibility === 'public' ? postFormat : 'text',
      achievement_date: targetDate || null,
      announcement_caption: visibility === 'public' ? cleanCaption || null : null,
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
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-8 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Go back"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-black">Create a goal</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Make the commitment clear, then choose who sees it.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
          <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Target className="h-6 w-6" />
          </div>
          <label htmlFor="goal-title" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
            What will you do consistently?
          </label>
          <input
            id="goal-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={100}
            autoFocus
            placeholder="Read 20 pages every day"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold placeholder:text-slate-400 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-[#07101f]"
          />
          <div className="mt-2 flex justify-between text-[10px] text-slate-400">
            <span>Make it specific and achievable.</span>
            <span>{title.length}/100</span>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-black">Achievement date</h2>
          </div>
          <p className="mb-3 text-[10px] text-slate-500">Optional. Habits can stay open-ended; projects can have a finish line.</p>
          <input
            type="date"
            value={targetDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setTargetDate(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-[#07101f]"
          />
        </section>

        <fieldset>
          <legend className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Who can see it?</legend>
          <div className="grid grid-cols-2 gap-3">
            {([
              { value: 'public' as const, label: 'Public', helper: 'Published to the Feed', icon: Globe2 },
              { value: 'private' as const, label: 'Private', helper: 'Visible only to you', icon: LockKeyhole },
            ]).map((option) => {
              const Icon = option.icon
              const selected = visibility === option.value
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => chooseVisibility(option.value)}
                  className={`rounded-2xl border p-4 text-left transition ${selected ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]'}`}
                  aria-pressed={selected}
                >
                  <Icon className={`mb-3 h-5 w-5 ${selected ? 'text-amber-500' : 'text-slate-400'}`} />
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{option.helper}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        {visibility === 'public' ? (
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.04] p-5 shadow-sm dark:bg-amber-500/[0.06]">
            <div className="mb-1 flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-amber-500" />
              <h2 className="text-sm font-black">Build your public goal post</h2>
            </div>
            <p className="mb-4 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
              This announcement appears in the Feed so friends can support you from day one.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {announcementFormats.map((format) => {
                const Icon = format.icon
                const selected = postFormat === format.value
                return (
                  <button
                    type="button"
                    key={format.value}
                    onClick={() => chooseFormat(format.value)}
                    aria-pressed={selected}
                    className={`rounded-2xl border p-3 text-left transition ${selected ? 'border-amber-500 bg-white shadow-sm dark:bg-[#101b2d]' : 'border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-[#101b2d]/60'}`}
                  >
                    <Icon className={`mb-2 h-4 w-4 ${selected ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className="block text-xs font-black">{format.label}</span>
                    <span className="mt-0.5 block text-[9px] leading-3 text-slate-500">{format.helper}</span>
                  </button>
                )
              })}
            </div>

            {postFormat !== 'text' && (
              <div className="mt-4">
                {previewUrl ? (
                  <div className="relative overflow-hidden rounded-2xl bg-slate-950">
                    {postFormat === 'video' ? (
                      <video src={previewUrl} controls playsInline className="aspect-[9/16] max-h-[28rem] w-full object-contain" />
                    ) : (
                      <div className="aspect-[4/5] w-full bg-cover bg-center" style={{ backgroundImage: `url(${previewUrl})` }} />
                    )}
                    <button
                      type="button"
                      onClick={removeMedia}
                      aria-label="Remove media"
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-7 text-center transition hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]">
                    {postFormat === 'video' ? <Film className="mb-2 h-6 w-6 text-amber-500" /> : <ImagePlus className="mb-2 h-6 w-6 text-amber-500" />}
                    <span className="text-xs font-black">{postFormat === 'video' ? 'Choose a short reel' : 'Choose a photo'}</span>
                    <span className="mt-1 text-[10px] text-slate-500">
                      {postFormat === 'video' ? 'MP4, MOV or WebM · up to 30 seconds' : 'JPG, PNG or WebP'} · 25 MB maximum
                    </span>
                    <input
                      type="file"
                      accept={postFormat === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'}
                      className="sr-only"
                      onChange={(event) => void chooseMedia(event.target.files?.[0])}
                    />
                  </label>
                )}
              </div>
            )}

            <div className="mt-4">
              <label htmlFor="announcement-caption" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">
                Caption <span className="font-medium normal-case">(optional)</span>
              </label>
              <textarea
                id="announcement-caption"
                value={announcementCaption}
                onChange={(event) => setAnnouncementCaption(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Why does this goal matter to you?"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-3 text-sm focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-[#101b2d]"
              />
              <div className="mt-1 text-right text-[10px] text-slate-400">{announcementCaption.length}/500</div>
            </div>
          </section>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <p className="flex items-center gap-2 text-xs font-black"><LockKeyhole className="h-4 w-4 text-slate-400" />Private means private</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">This goal will be saved to your profile and will not create a Feed post.</p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-amber-500 px-4 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating your goal…' : visibility === 'public' ? 'Publish public goal' : 'Create private goal'}
        </button>
      </form>
    </main>
  )
}
