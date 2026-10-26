'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Camera, CircleDashed, Images, LockKeyhole, Music2, Video, X } from 'lucide-react'
import GoalieMessage from '@/components/GoalieMessage'
import GuideTour, { type TourStep } from '@/components/GuideTour'
import { supabase } from '@/utils/supabase'

const CHECKIN_TOUR: TourStep[] = [
  { target: 'checkin-goal', title: 'Pick a goal', text: 'Choose which goal you worked on today.' },
  { target: 'checkin-status', title: 'Be honest', text: 'Done, partly done or missed: all count. Showing up honestly keeps you going.' },
  { target: 'checkin-submit', title: 'Post it', text: 'Add a note or photo if you like, then post. Friends can boost you.' },
]
import MusicPicker, { type SelectedTrack } from '@/components/MusicPicker'

interface GoalOption { id: string; title: string; shared?: boolean }
type CheckinStatus = 'done' | 'partial' | 'missed'
type Visibility = 'public' | 'private'

const statusOptions = [
  { value: 'done' as const, label: 'Done', description: 'Completed today' },
  { value: 'partial' as const, label: 'Partial', description: 'Made progress' },
  { value: 'missed' as const, label: 'Missed', description: 'Log honestly' },
]

export default function CheckInPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [goalId, setGoalId] = useState('')
  const [caption, setCaption] = useState('')
  const [status, setStatus] = useState<CheckinStatus>('done')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [minutes, setMinutes] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack | null>(null)
  const [musicOpen, setMusicOpen] = useState(false)

  useEffect(() => {
    void Promise.resolve().then(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) { router.replace('/login?next=/check-in'); return }
      setUserId(session.user.id)
      const [{ data: ownedGoals, error: goalsError }, { data: collaborations, error: collaborationError }] = await Promise.all([
        supabase.from('goals').select('id,title').eq('user_id', session.user.id).eq('is_completed', false).order('created_at', { ascending: false }),
        supabase.from('goal_collaborators').select('goal_id').eq('user_id', session.user.id).eq('status', 'accepted'),
      ])
      const sharedIds = (collaborations || []).map((item) => item.goal_id)
      const { data: sharedGoals, error: sharedGoalsError } = sharedIds.length
        ? await supabase.from('goals').select('id,title').in('id', sharedIds).eq('is_completed', false).order('created_at', { ascending: false })
        : { data: [], error: null }
      if (goalsError || collaborationError || sharedGoalsError) setError('Could not load your goals.')
      else {
        const owned = ((ownedGoals || []) as GoalOption[]).map((goal) => ({ ...goal, shared: false }))
        const ownedIds = new Set(owned.map((goal) => goal.id))
        const shared = ((sharedGoals || []) as GoalOption[]).filter((goal) => !ownedIds.has(goal.id)).map((goal) => ({ ...goal, shared: true }))
        const options = [...owned, ...shared]
        const requestedGoal = new URLSearchParams(window.location.search).get('goal')
        const selectedGoal = options.some((goal) => goal.id === requestedGoal)
          ? requestedGoal
          : options[0]?.id
        setGoals(options)
        setGoalId(selectedGoal || '')
      }
      setLoading(false)
    })
  }, [router])

  useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview) }, [mediaPreview])

  const chooseMedia = async (file: File | undefined) => {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) { setError('Choose an image or short video.'); return }
    if (file.size > 25 * 1024 * 1024) { setError('Media must be smaller than 25 MB.'); return }
    if (file.type.startsWith('video/')) {
      const videoUrl = URL.createObjectURL(file)
      const duration = await new Promise<number>((resolve) => { const video = document.createElement('video'); video.preload = 'metadata'; video.onloadedmetadata = () => resolve(video.duration); video.onerror = () => resolve(999); video.src = videoUrl })
      URL.revokeObjectURL(videoUrl)
      if (duration > 30) { setError('Progress videos can be up to 30 seconds long.'); return }
    }
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(file); setMediaPreview(URL.createObjectURL(file))
  }

  const toggleVisibility = () => {
    setVisibility((current) => {
      if (current === 'public') {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview)
        setMediaFile(null)
        setMediaPreview(null)
        setSelectedTrack(null)
        return 'private'
      }
      return 'public'
    })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!userId || !goalId) { setError('Choose a goal for this check-in.'); return }
    setSubmitting(true); setError(null)
    const parsedMinutes = minutes ? Number(minutes) : null
    let mediaUrl: string | null = null
    if (mediaFile) {
      const extension = mediaFile.name.split('.').pop()?.toLowerCase() || (mediaFile.type.startsWith('video/') ? 'mp4' : 'jpg')
      const path = `${userId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('goal-media').upload(path, mediaFile, { contentType: mediaFile.type, upsert: false })
      if (uploadError) { setError('Your media could not be uploaded. Try another file.'); setSubmitting(false); return }
      mediaUrl = supabase.storage.from('goal-media').getPublicUrl(path).data.publicUrl
    }
    const proofType = mediaFile?.type.startsWith('video/') ? 'video' : mediaFile ? 'image' : parsedMinutes ? 'focus' : 'text'
    const defaultCaption = status === 'done' ? 'Completed today’s check-in.' : status === 'partial' ? 'Made progress today.' : 'Missed today, resetting with honesty.'
    const { error: postError } = await supabase.from('posts').insert({
      user_id: userId,
      goal_id: goalId,
      caption: caption.trim() || defaultCaption,
      media_url: mediaUrl,
      proof_type: proofType,
      checkin_status: status,
      minutes_logged: parsedMinutes,
      visibility,
      music_title: selectedTrack?.title || null,
      music_artist: selectedTrack?.artist || null,
      music_artwork_url: selectedTrack?.artworkUrl || null,
      music_preview_url: selectedTrack?.previewUrl || null,
      music_source: selectedTrack?.source || null,
    })
    if (postError) { setError(postError.message || 'Your check-in could not be published.'); setSubmitting(false); return }

    if (parsedMinutes) {
      const { error: logError } = await supabase.from('focus_logs').insert({
        user_id: userId,
        goal_id: goalId,
        minutes_logged: parsedMinutes,
        note: caption.trim() || defaultCaption,
      })
      if (logError) {
        setError('Your update was published, but the focus minutes were not saved. Please try logging them again.')
        setSubmitting(false)
        return
      }
    }

    router.push('/feed'); router.refresh()
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-7 flex items-center gap-3"><button onClick={() => router.back()} aria-label="Go back" className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button><div><h1 className="text-lg font-black">Daily check-in</h1><p className="text-xs text-slate-500 dark:text-slate-400">Small proof. Real momentum.</p></div></header>
      {loading ? <div className="h-64 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /> : goals.length === 0 ? <GoalieMessage title="Let's set your first goal" message="Every check-in belongs to a goal. Pick one small thing you can do daily." actionLabel="Create a goal" href="/create-goal" /> : <form onSubmit={submit} className="space-y-4"><div><label htmlFor="goal" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Goal</label><select data-tour="checkin-goal" id="goal" value={goalId} onChange={(event) => setGoalId(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-[#101b2d]">{goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.shared ? 'Shared · ' : ''}{goal.title}</option>)}</select></div><div><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Today</span><div data-tour="checkin-status" className="grid grid-cols-3 gap-2">{statusOptions.map((option) => <button type="button" key={option.value} onClick={() => setStatus(option.value)} aria-pressed={status === option.value} className={`rounded-2xl border px-2 py-3 text-center transition ${status === option.value ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-[#101b2d]'}`}><span className="block text-xs font-black">{option.label}</span><span className="mt-0.5 block text-[9px]">{option.description}</span></button>)}</div></div><div><label htmlFor="caption" className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Note <span className="font-medium normal-case">(optional)</span></label><textarea id="caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} maxLength={500} placeholder="What helped, what changed, or what comes next?" className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-[#101b2d]" /></div>{visibility === 'public' && <div><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Proof <span className="font-medium normal-case">(optional)</span></span>{mediaPreview ? <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-950">{mediaFile?.type.startsWith('video/') ? <video src={mediaPreview} controls playsInline className="max-h-72 w-full object-contain" /> : <div className="relative aspect-[4/3]"><Image src={mediaPreview} alt="Progress preview" fill unoptimized className="object-contain" /></div>}<button type="button" onClick={() => { if (mediaPreview) URL.revokeObjectURL(mediaPreview); setMediaPreview(null); setMediaFile(null) }} aria-label="Remove media" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button></div> : <div className="grid grid-cols-3 gap-2"><label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-center hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]"><Camera className="h-5 w-5 text-amber-500" /><span className="text-[10px] font-black">Photo</span><input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label><label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-center hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]"><Video className="h-5 w-5 text-amber-500" /><span className="text-[10px] font-black">Clip</span><input type="file" accept="video/*" capture="environment" className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label><label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-center hover:border-amber-500 dark:border-slate-700 dark:bg-[#101b2d]"><Images className="h-5 w-5 text-amber-500" /><span className="text-[10px] font-black">Library</span><input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => void chooseMedia(event.target.files?.[0])} /></label></div>}</div>}<div className="grid grid-cols-2 gap-2"><label className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#101b2d]"><span className="block text-[9px] font-black uppercase text-slate-400">Focus minutes</span><input id="minutes" type="number" min="1" max="1440" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="Optional" className="mt-0.5 w-full bg-transparent text-sm font-bold outline-none" /></label><button type="button" onClick={toggleVisibility} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black dark:border-slate-700 dark:bg-[#101b2d]">{visibility === 'public' ? <CircleDashed className="h-4 w-4 text-amber-500" /> : <LockKeyhole className="h-4 w-4" />}{visibility === 'public' ? 'Public' : 'Private'}</button></div>{visibility === 'public' && <button type="button" onClick={() => setMusicOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-black dark:border-slate-700"><Music2 className="h-4 w-4 text-amber-500" />{selectedTrack ? `${selectedTrack.title} · ${selectedTrack.artist}` : 'Add music'}</button>}{visibility === 'private' && <p className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] text-slate-500 dark:bg-slate-800">Private check-ins are text-only so no public media URL is created.</p>}{error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}<button type="submit" data-tour="checkin-submit" disabled={submitting} className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-black text-slate-950 disabled:opacity-60">{submitting ? 'Publishing…' : visibility === 'public' ? 'Publish check-in' : 'Save privately'}</button></form>}
      <MusicPicker open={musicOpen} selected={selectedTrack} onClose={() => setMusicOpen(false)} onSelect={setSelectedTrack} />
      <GuideTour name="check-in" steps={CHECKIN_TOUR} />
    </main>
  )
}
