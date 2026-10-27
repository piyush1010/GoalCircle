'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlignLeft, ArrowLeft, BellRing, Camera, CircleCheck, Film, Globe2, ImagePlus, LockKeyhole, Music2, X } from 'lucide-react'
import { OPEN_ENDED_REMINDER_DAYS, calendarFileName, createGoalCalendarBundle, createGoogleCalendarUrl, createGoogleDailyReminderUrl, type DailyReminder, type GoalCalendarEvent } from '@/lib/calendar'
import MusicPicker, { type SelectedTrack } from '@/components/MusicPicker'
import GuideTour, { type TourStep } from '@/components/GuideTour'
import { MAX_VIDEO_SECONDS, mediaLimitError, shrinkImage, toLocalFile, UNREADABLE_FILE } from '@/lib/media'
import { supabase } from '@/utils/supabase'

const CREATE_TOUR: TourStep[] = [
  { target: 'goal-title', title: 'Name one clear action', text: "Small and specific works best: 'Read 20 pages a day', not 'Read more'. Or tap an idea to start." },
  { target: 'goal-plan', title: 'Date, reminder and privacy', text: 'Add a target date and a daily reminder if you like. Public shares it on your Feed; Private keeps it to yourself.' },
  { target: 'goal-publish', title: "That's it", text: 'Publish when ready. You can change everything later.' },
]

type Visibility = 'public' | 'private'
type PostFormat = 'text' | 'image' | 'video'

const formats = [
  { value: 'text' as const, label: 'Text', icon: AlignLeft },
  { value: 'image' as const, label: 'Photo', icon: ImagePlus },
  { value: 'video' as const, label: 'Reel', icon: Film },
]

const visibilityOptions = [
  { value: 'public' as const, label: 'Public', description: 'Shared on your Feed so friends can boost you.', icon: Globe2 },
  { value: 'private' as const, label: 'Private', description: 'Only you can see it. Nothing is posted.', icon: LockKeyhole },
]

const sectionClass = 'rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]'
const headingClass = 'block text-sm font-black text-slate-900 dark:text-white'
const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-[#07101f]'
const calendarButtonClass = 'mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-black text-slate-950 transition hover:bg-amber-400'
const rowClass = 'flex items-center justify-between gap-4 py-4'
const hintClass = 'mt-0.5 text-xs text-slate-500 dark:text-slate-400'
const compactFieldClass = 'rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none transition [color-scheme:light] focus:border-amber-500 dark:border-slate-700 dark:bg-[#07101f] dark:[color-scheme:dark]'
const uploadClass = 'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 px-3 py-6 text-center text-xs font-bold text-slate-600 transition hover:border-amber-500 dark:border-slate-700 dark:text-slate-300'

const templates = [
  { label: 'Reading', title: 'Read 20 pages every day', category: 'learning' },
  { label: 'Fitness', title: 'Move for 30 minutes every day', category: 'fitness' },
  { label: 'New skill', title: 'Practise Python for 30 minutes a day', category: 'learning' },
  { label: 'Deep work', title: 'Complete 60 minutes of deep work', category: 'work' },
  { label: 'Mindfulness', title: 'Practise mindfulness for 10 minutes', category: 'habits' },
  { label: 'Give back', title: 'Spend 30 minutes cleaning up my area every week', category: 'community' },
]

export default function CreateGoalPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('personal')
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
  const [remindDaily, setRemindDaily] = useState(false)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'once'>('daily')
  const [timesPerWeek, setTimesPerWeek] = useState(3)
  const [reminderTime, setReminderTime] = useState('08:00')
  const [created, setCreated] = useState<{ goalId: string; title: string; targetDate: string | null; reminder: boolean; next: string } | null>(null)

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

  const chooseMedia = async (picked?: File) => {
    if (!picked) return
    let file: File = picked
    const actualType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null
    if (!actualType || actualType !== postFormat) {
      setError(postFormat === 'image' ? 'Choose an image for this post.' : 'Choose a video for this reel.')
      return
    }
    const limit = mediaLimitError(file)
    if (limit) {
      setError(limit)
      return
    }
    try { file = await toLocalFile(file) } catch { setError(UNREADABLE_FILE); return }
    if (actualType === 'image') file = await shrinkImage(file)
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
      if (!Number.isFinite(duration) || duration > MAX_VIDEO_SECONDS) {
        setError(`Reels can be up to ${MAX_VIDEO_SECONDS} seconds long.`)
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

    if (goalId) await supabase.from('goals').update({ category, frequency, times_per_week: frequency === 'weekly' ? timesPerWeek : null }).eq('id', goalId).eq('user_id', session.user.id)

    const next = visibility === 'public' ? '/feed?published=goal' : goalId ? `/goal/${goalId}` : '/profile'
    if (goalId && (remindDaily || targetDate)) {
      // Offer calendar reminders before leaving the page.
      setCreated({ goalId, title: cleanTitle, targetDate: targetDate || null, reminder: remindDaily, next })
      setSubmitting(false)
      return
    }
    router.replace(next)
    router.refresh()
  }

  const goalUrl = (goalId: string) => `${window.location.origin}/goal/${goalId}`
  const reminderFor = (goal: NonNullable<typeof created>): DailyReminder => ({ goalId: goal.goalId, title: goal.title, time: reminderTime, targetDate: goal.targetDate, url: goalUrl(goal.goalId) })
  const targetEventFor = (goal: NonNullable<typeof created>): GoalCalendarEvent | null => goal.targetDate ? { goalId: goal.goalId, title: goal.title, targetDate: goal.targetDate, url: goalUrl(goal.goalId) } : null
  const openInNewTab = (url: string) => window.open(url, '_blank', 'noopener,noreferrer')
  const downloadCalendar = (goal: NonNullable<typeof created>) => {
    const contents = createGoalCalendarBundle({ reminder: goal.reminder ? reminderFor(goal) : null, goal: targetEventFor(goal) })
    const href = URL.createObjectURL(new Blob([contents], { type: 'text/calendar;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = calendarFileName(goal.title)
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(href)
  }
  const continueToGoal = () => {
    if (!created) return
    router.replace(created.next)
    router.refresh()
  }

  const isPublic = visibility === 'public'
  const today = new Date().toISOString().slice(0, 10)

  if (created) {
    const targetEvent = targetEventFor(created)
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-8">
        <section className={`${sectionClass} text-center`}>
          <CircleCheck className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-3 text-xl font-black tracking-tight">Goal created</h1>
          <p className="mt-1 text-sm font-semibold">{created.title}</p>
          {(created.reminder || targetEvent) && <>
            <p className="mx-auto mt-3 max-w-sm text-sm text-slate-600 dark:text-slate-300">{created.reminder ? `Want a daily reminder at ${reminderTime}?` : 'Add your target date to your calendar?'}</p>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => {
                // iPhone: a calendar file opens Apple Calendar. Android: Google Calendar.
                if (/iPhone|iPad|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) downloadCalendar(created)
                else openInNewTab(created.reminder ? createGoogleDailyReminderUrl(reminderFor(created)) : createGoogleCalendarUrl(targetEvent!))
              }} className={calendarButtonClass}><BellRing className="h-4 w-4" />Add to my calendar</button>
              <button type="button" onClick={() => downloadCalendar(created)} className="w-full py-1 text-sm font-bold text-slate-600 underline-offset-2 hover:underline dark:text-slate-300">Use a different calendar app</button>
            </div>
          </>}

          <button type="button" onClick={continueToGoal} className="mt-6 w-full rounded-2xl bg-amber-500 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400">Continue</button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Go back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white transition hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button>
        <div>
          <h1 className="text-xl font-black tracking-tight">Create a goal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Set it. Share it. Show up.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <section data-tour="goal-title" className={sectionClass}>
          <div className="mb-3 flex items-baseline justify-between">
            <label htmlFor="goal-title" className={headingClass}>What&apos;s your goal?</label>
            <span className="text-xs text-slate-400">{title.length}/100</span>
          </div>
          <input id="goal-title" autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="e.g. Read 20 pages every day" className={`${fieldClass} text-base font-semibold`} />
          <p className="mb-2 mt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Or start from an idea</p>
          <div className="flex flex-wrap gap-2" aria-label="Goal templates">
            {templates.map((template) => {
              const selected = title === template.title
              return <button type="button" key={template.label} aria-pressed={selected} onClick={() => { setTitle(template.title); setCategory(template.category) }} className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${selected ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 text-slate-600 hover:border-amber-500 dark:border-slate-700 dark:text-slate-300'}`}>{template.label}</button>
            })}
          </div>
        </section>

        <section data-tour="goal-plan" className={`${sectionClass} divide-y divide-slate-100 py-1 dark:divide-slate-800`}>
          <div className="py-4">
            <p className={headingClass}>How often?</p>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="How often">
              {([['daily', 'Every day'], ['weekly', 'Few times a week'], ['once', 'Just once']] as const).map(([value, label]) => (
                <button type="button" role="radio" aria-checked={frequency === value} key={value} onClick={() => setFrequency(value)} className={`rounded-lg px-1 py-2.5 text-sm font-bold transition ${frequency === value ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{label}</button>
              ))}
            </div>
            {frequency === 'weekly' && <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Times per week</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setTimesPerWeek((n) => Math.max(1, n - 1))} aria-label="Fewer times" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-lg font-black dark:border-slate-700">−</button>
                <span className="w-8 text-center text-lg font-black">{timesPerWeek}</span>
                <button type="button" onClick={() => setTimesPerWeek((n) => Math.min(6, n + 1))} aria-label="More times" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-lg font-black dark:border-slate-700">+</button>
              </div>
            </div>}
            <p className={`${hintClass} mt-2`}>{frequency === 'daily' ? 'Your streak counts days in a row.' : frequency === 'weekly' ? `Check in any ${timesPerWeek} days a week. Your streak counts weeks you hit it.` : 'For a one-off, like submitting a form. Check in with “Done” to finish it.'}</p>
          </div>

          <div className={rowClass}>
            <div>
              <label htmlFor="target-date" className={headingClass}>Target date</label>
              <p className={hintClass}>Optional</p>
            </div>
            <input id="target-date" type="date" value={targetDate} min={today} onChange={(event) => setTargetDate(event.target.value)} className={`${compactFieldClass} w-40 ${targetDate ? '' : 'text-slate-400'}`} />
          </div>

          <div className={rowClass}>
            <div>
              <p id="reminder-label" className={`${headingClass} flex items-center gap-1.5`}><BellRing className="h-4 w-4 text-amber-500" />Daily reminder</p>
              <p className={hintClass}>{remindDaily ? (targetDate ? 'Every day until your target date' : `Every day for ${OPEN_ENDED_REMINDER_DAYS} days`) : 'A nudge in your phone\'s calendar'}</p>
            </div>
            <button type="button" role="switch" aria-checked={remindDaily} aria-labelledby="reminder-label" onClick={() => setRemindDaily((on) => !on)} className={`relative h-7 w-12 shrink-0 rounded-full transition ${remindDaily ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${remindDaily ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
          {remindDaily && <div className={rowClass}>
            <label htmlFor="reminder-time" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Remind me at</label>
            <input id="reminder-time" type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value || '08:00')} className={`${compactFieldClass} w-32`} />
          </div>}

          <div className="py-4">
            <p className={headingClass}>Who can see it?</p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Goal visibility">
              {visibilityOptions.map((option) => {
                const Icon = option.icon
                const selected = visibility === option.value
                return <button type="button" role="radio" aria-checked={selected} key={option.value} onClick={() => chooseVisibility(option.value)} className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-bold transition ${selected ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}><Icon className="h-4 w-4" />{option.label}</button>
              })}
            </div>
            <p className={`${hintClass} mt-2`}>{visibilityOptions.find((option) => option.value === visibility)?.description}</p>
          </div>
        </section>

        {isPublic && <section className={sectionClass}>
          <h2 className={headingClass}>Announce it on your Feed</h2>
          <p className="mb-3 mt-1 text-xs text-slate-500 dark:text-slate-400">Choose how your first post looks.</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Post format">
            {formats.map((format) => {
              const Icon = format.icon
              const selected = postFormat === format.value
              return <button type="button" role="radio" aria-checked={selected} key={format.value} onClick={() => chooseFormat(format.value)} className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition ${selected ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}><Icon className="h-4 w-4" />{format.label}</button>
            })}
          </div>

          {postFormat !== 'text' && <div className="mt-3">
            {previewUrl ? <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">{postFormat === 'video' ? <video src={previewUrl} controls playsInline className="max-h-64 w-full object-contain" /> : <div className="relative h-52"><Image src={previewUrl} alt="Goal post preview" fill unoptimized className="object-contain" /></div>}<button type="button" onClick={removeMedia} aria-label="Remove media" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button></div>
              : <div className="grid grid-cols-2 gap-3">
                <label className={uploadClass}><Camera className="h-5 w-5 text-amber-500" />{postFormat === 'video' ? 'Record a clip' : 'Take a photo'}<input type="file" accept={postFormat === 'video' ? 'video/*' : 'image/*'} capture="environment" className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label>
                <label className={uploadClass}>{postFormat === 'video' ? <Film className="h-5 w-5 text-amber-500" /> : <ImagePlus className="h-5 w-5 text-amber-500" />}Choose from library<input type="file" accept={postFormat === 'video' ? 'video/mp4,video/quicktime,video/webm' : 'image/jpeg,image/png,image/webp'} className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label>
              </div>}
            {postFormat === 'video' && !previewUrl && <p className="mt-2 text-xs text-slate-400">Up to 30 seconds and 25 MB.</p>}
          </div>}

          <label htmlFor="goal-caption" className="mb-2 mt-4 block text-xs font-semibold text-slate-500 dark:text-slate-400">Caption <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id="goal-caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} maxLength={500} placeholder="Why does this goal matter to you?" className={`${fieldClass} resize-none text-sm`} />

          {selectedTrack ? <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-2.5 dark:border-slate-700"><Image src={selectedTrack.artworkUrl} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-lg" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{selectedTrack.title}</p><p className="truncate text-xs text-slate-500">{selectedTrack.artist}</p></div><button type="button" onClick={() => setMusicOpen(true)} className="text-xs font-bold text-amber-600 dark:text-amber-400">Change</button><button type="button" onClick={() => setSelectedTrack(null)} aria-label="Remove music" className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><X className="h-3.5 w-3.5" /></button></div>
            : <button type="button" onClick={() => setMusicOpen(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:border-amber-500 dark:border-slate-700 dark:text-slate-300"><Music2 className="h-4 w-4 text-amber-500" />Add music <span className="font-normal text-slate-400">(optional)</span></button>}
        </section>}

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

        <button type="submit" data-tour="goal-publish" disabled={submitting} className="w-full rounded-2xl bg-amber-500 py-4 text-base font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-60">{submitting ? 'Publishing…' : isPublic ? 'Publish goal' : 'Create private goal'}</button>
      </form>

      <GuideTour name="create-goal" steps={CREATE_TOUR} />
      <MusicPicker open={musicOpen} selected={selectedTrack} onClose={() => setMusicOpen(false)} onSelect={setSelectedTrack} />
    </main>
  )
}
