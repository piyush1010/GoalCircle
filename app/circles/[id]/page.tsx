'use client'

import { confirmAction } from '@/lib/confirm'
import { cheer } from '@/lib/goalie'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, CircleHelp, Copy, ImagePlus, LockKeyhole, LogOut, Pencil, Share2, Timer, Users, X } from 'lucide-react'
import GuideTour, { type TourStep } from '@/components/GuideTour'
import CircleNotices from '@/components/CircleNotices'
import MentorDashboard, { type DashboardRow } from '@/components/MentorDashboard'
import { AttachmentList, type Attachment } from '@/components/CircleAttachments'
import { examLabel, localDateString } from '@/lib/exams'
import { mediaLimitError, shrinkImage } from '@/lib/media'
import { supabase } from '@/utils/supabase'

interface Circle { id: string; owner_id: string; name: string; description: string | null; exam: string | null; visibility: 'public' | 'private'; invite_code: string | null }
interface Task { id: string; title: string; details: string | null; task_date: string; attachments: Attachment[] }
interface Checkin { status: 'done' | 'partial'; hours: number | null; note: string | null; media_url: string | null; media_type: 'image' | 'video' | null }

const MENTOR_TOUR: TourStep[] = [
  { title: "Hi, I'm Goalie!", text: 'This is your batch. In four quick steps I\'ll show you how to run it in a few minutes a day.' },
  { target: 'invite', title: 'Invite your students', text: 'Share this link in your WhatsApp group. Students join with one tap.' },
  { target: 'task', title: "Post today's task", text: 'Write what everyone should finish today. Students get a notification and check in against it.' },
  { target: 'students-tab', title: 'See who needs you', text: 'Students shows who is done, who isn\'t yet and who has gone quiet. Search, filter and nudge from here.' },
  { target: 'notices', title: 'Share notices', text: 'Post test dates, new targets or a photo. Pin the important ones so they stay on top.' },
]

const STUDENT_TOUR: TourStep[] = [
  { title: "Hi, I'm Goalie!", text: 'This is your batch. Here\'s how to keep your mentor updated in about 10 seconds a day.' },
  { target: 'task', title: "Today's task", text: 'Your mentor posts the task here. You get a notification when it\'s new.' },
  { target: 'checkin', title: 'Check in', text: 'Pick Done or Partly done, add hours if you like, then save. A photo is optional.' },
  { target: 'focus', title: 'Hard to start?', text: 'Run a short focus session first. Starting is the hardest part.' },
  { target: 'notices', title: 'Notices', text: 'Test dates and updates from your mentor appear here.' },
]

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]'
const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-[#07101f]'
const primary = 'w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-60'

export default function CirclePage() {
  const params = useParams()
  const router = useRouter()
  const circleId = params.id as string
  const today = localDateString()

  const [userId, setUserId] = useState<string | null>(null)
  const [circle, setCircle] = useState<Circle | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [task, setTask] = useState<Task | null>(null)
  const [checkin, setCheckin] = useState<Checkin | null>(null)
  const [dashboard, setDashboard] = useState<DashboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tourReplay, setTourReplay] = useState(0)

  const isAdmin = !!circle && (circle.owner_id === userId || role === 'owner' || role === 'moderator')
  const isMember = isAdmin || !!role

  const loadDashboard = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('circle_dashboard', { target_circle: circleId, on_date: today })
    if (rpcError) setError('Student progress could not be loaded.')
    else setDashboard((data || []) as DashboardRow[])
  }, [circleId, today])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace(`/login?next=/circles/${circleId}`); return }
    const uid = session.user.id
    setUserId(uid)
    const [circleResult, roleResult, countResult, taskResult] = await Promise.all([
      supabase.from('circles').select('id,owner_id,name,description,exam,visibility,invite_code').eq('id', circleId).maybeSingle(),
      supabase.from('circle_memberships').select('role').eq('circle_id', circleId).eq('user_id', uid).maybeSingle(),
      supabase.from('circle_memberships').select('user_id', { count: 'exact', head: true }).eq('circle_id', circleId),
      supabase.from('circle_tasks').select('id,title,details,task_date,attachments').eq('circle_id', circleId).eq('task_date', today).maybeSingle(),
    ])
    if (!circleResult.data) { setNotFound(true); setLoading(false); return }
    const loadedCircle = circleResult.data as Circle
    setCircle(loadedCircle)
    setRole(roleResult.data?.role ?? null)
    setMemberCount(countResult.count || 0)
    const loadedTask = (taskResult.data as Task | null) ?? null
    setTask(loadedTask)
    if (loadedTask) {
      const { data } = await supabase.from('circle_task_checkins').select('status,hours,note,media_url,media_type').eq('task_id', loadedTask.id).eq('user_id', uid).maybeSingle()
      setCheckin((data as Checkin | null) ?? null)
    } else setCheckin(null)
    const admin = loadedCircle.owner_id === uid || ['owner', 'moderator'].includes(roleResult.data?.role ?? '')
    if (admin) await loadDashboard()
    setLoading(false)
  }, [circleId, loadDashboard, router, today])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const flash = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(null), 3000) }

  const inviteLink = circle?.invite_code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/circles/join/${circle.invite_code}` : ''
  const shareInvite = async () => {
    if (!circle || !inviteLink) return
    const text = `Join "${circle.name}" on GoalCircle for daily tasks and check-ins: ${inviteLink}`
    if (navigator.share) { try { await navigator.share({ text }); return } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(inviteLink); flash('Invite link copied')
  }

  const joinPublic = async () => {
    if (!userId) return
    const { error: joinError } = await supabase.from('circle_memberships').insert({ circle_id: circleId, user_id: userId, role: 'member' })
    if (joinError) setError('You could not join this circle.')
    else void load()
  }

  const leave = async () => {
    if (!userId || !(await confirmAction('Leave this circle? Your mentor will no longer see your check-ins here.'))) return
    const { error: leaveError } = await supabase.from('circle_memberships').delete().eq('circle_id', circleId).eq('user_id', userId)
    if (leaveError) setError('You could not leave this circle.')
    else router.replace('/circles')
  }

  if (loading) return <main className="mx-auto max-w-xl space-y-3 px-4 pt-6"><div className="h-24 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="h-48 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></main>

  if (notFound || !circle) return <main className="mx-auto max-w-xl px-4 pt-10 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-3 text-lg font-black">Circle not available</h1><p className="mt-1 text-sm text-slate-500">It may be private. Ask your mentor for an invite link.</p><Link href="/circles" className="mt-5 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950">Back to circles</Link></main>

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-4 flex items-start gap-3">
        <button type="button" onClick={() => router.push('/circles')} aria-label="Back to circles" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101b2d]"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-tight">{circle.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            {examLabel(circle.exam) && <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">{examLabel(circle.exam)}</span>}
            {circle.visibility === 'private' && <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" />Private</span>}
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
          </p>
        </div>
        {isMember && <button type="button" onClick={() => setTourReplay((n) => n + 1)} aria-label="Show the guide" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 hover:text-amber-500 dark:border-slate-700"><CircleHelp className="h-4 w-4" /></button>}
        {isAdmin && <button type="button" data-tour="invite" onClick={() => void shareInvite()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950"><Share2 className="h-4 w-4" />Invite</button>}
      </header>

      {message && <p role="status" className="mb-3 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {isAdmin && <MentorDashboard circleId={circleId} circleName={circle.name} today={today} task={task} rows={dashboard} inviteLink={inviteLink}
        onTaskSaved={(saved) => { setTask(saved); void loadDashboard() }} onChanged={() => void loadDashboard()} onCopyInvite={async () => { await navigator.clipboard.writeText(inviteLink); flash('Invite link copied') }} flash={flash} />}

      {!isAdmin && isMember && userId && <StudentToday circleId={circleId} userId={userId} task={task} checkin={checkin} onSaved={(saved) => { setCheckin(saved); flash('Saved. Your mentor can see it.') }} />}

      {isMember && userId && <CircleNotices circleId={circleId} userId={userId} isAdmin={isAdmin} />}

      {isMember && <GuideTour name={isAdmin ? 'mentor-circle' : 'student-circle'} steps={isAdmin ? MENTOR_TOUR : STUDENT_TOUR} replayKey={tourReplay} />}

      {!isMember && <section className={`${card} text-center`}>
        <h2 className="text-base font-black">Join this circle</h2>
        <p className="mt-1 text-sm text-slate-500">{circle.description || 'Check in daily with the group.'}</p>
        <button type="button" onClick={() => void joinPublic()} className={`${primary} mt-4`}>Join circle</button>
      </section>}

      {!isAdmin && isMember && <button type="button" onClick={() => void leave()} className="mx-auto mt-8 flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-500"><LogOut className="h-3.5 w-3.5" />Leave circle</button>}
    </main>
  )
}

function StudentToday({ circleId, userId, task, checkin, onSaved }: { circleId: string; userId: string; task: Task | null; checkin: Checkin | null; onSaved: (checkin: Checkin) => void }) {
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<'done' | 'partial'>(checkin?.status ?? 'done')
  const [hours, setHours] = useState(checkin?.hours?.toString() ?? '')
  const [note, setNote] = useState(checkin?.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (!task) return <section data-tour="task" className={`${card} text-center`}>
    <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
    <h2 className="mt-2 text-base font-black">No task yet today</h2>
    <p className="mt-1 text-sm text-slate-500">Your mentor hasn&apos;t set today&apos;s task. Keep going with your own goals.</p>
    <Link href="/focus" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400"><Timer className="h-4 w-4" />Start a focus session</Link>
  </section>

  const chooseFile = async (chosen?: File) => {
    if (!chosen) return
    let picked: File = chosen
    if (!picked.type.startsWith('image/') && !picked.type.startsWith('video/')) { setError('Choose a photo or a video.'); return }
    const limit = mediaLimitError(picked)
    if (limit) { setError(limit); return }
    if (picked.type.startsWith('image/')) picked = await shrinkImage(picked)
    if (preview) URL.revokeObjectURL(preview)
    setFile(picked); setPreview(URL.createObjectURL(picked)); setError(null)
  }

  const save = async () => {
    const hoursValue = hours.trim() === '' ? null : Number(hours)
    if (hoursValue !== null && (Number.isNaN(hoursValue) || hoursValue < 0 || hoursValue > 24)) { setError('Hours should be between 0 and 24.'); return }
    setSaving(true); setError(null)
    let mediaUrl = checkin?.media_url ?? null
    let mediaType = checkin?.media_type ?? null
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || (file.type.startsWith('video/') ? 'mp4' : 'jpg')
      const path = `${userId}/circle-${circleId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('goal-media').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
      if (uploadError) { setError('Your photo or video could not be uploaded.'); setSaving(false); return }
      mediaUrl = supabase.storage.from('goal-media').getPublicUrl(path).data.publicUrl
      mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    }
    const row = { status, hours: hoursValue, note: note.trim() || null, media_url: mediaUrl, media_type: mediaType }
    const { error: saveError } = await supabase.from('circle_task_checkins').upsert({ task_id: task.id, circle_id: circleId, user_id: userId, ...row, updated_at: new Date().toISOString() }, { onConflict: 'task_id,user_id' })
    setSaving(false)
    if (saveError) { setError('Your update could not be saved. Please try again.'); return }
    setEditing(false); setFile(null)
    onSaved(row)
    cheer()
  }

  const showForm = editing || !checkin

  return (
    <section data-tour="task" className={card}>
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Today&apos;s task</p>
      <h2 className="mt-1 text-lg font-black leading-snug">{task.title}</h2>
      {task.details && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{task.details}</p>}
      <AttachmentList attachments={task.attachments ?? []} />

      {!showForm && checkin && <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-500/10 px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-black text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" />{checkin.status === 'done' ? 'Done today' : 'Partly done'}{checkin.hours !== null && ` · ${checkin.hours} h`}</p>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Pencil className="h-3.5 w-3.5" />Edit</button>
      </div>}

      {showForm && <div className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="How much did you finish?">
          {([['done', 'Done'], ['partial', 'Partly done']] as const).map(([value, label]) => <button type="button" role="radio" aria-checked={status === value} key={value} onClick={() => setStatus(value)} className={`rounded-lg py-2.5 text-sm font-bold transition ${status === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="hours" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Hours studied <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="hours" type="number" inputMode="decimal" min="0" max="24" step="0.5" value={hours} onChange={(event) => setHours(event.target.value)} placeholder="0" className={`${field} w-24 py-2 text-center font-bold`} />
        </div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="A short note for your mentor (optional)" className={`${field} resize-none`} />
        {preview ? <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">{file?.type.startsWith('video/') ? <video src={preview} controls playsInline className="max-h-56 w-full object-contain" /> : <div className="relative h-44"><Image src={preview} alt="Your proof" fill unoptimized className="object-contain" /></div>}<button type="button" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null) }} aria-label="Remove file" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button></div>
          : <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-500 transition hover:border-amber-500 dark:border-slate-700"><ImagePlus className="h-4 w-4 text-amber-500" />Add a photo or video (optional)<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label>}
        {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
        <button type="button" data-tour="checkin" onClick={() => void save()} disabled={saving} className={primary}>{saving ? 'Saving…' : 'Save my update'}</button>
        <Link href="/focus" data-tour="focus" className="flex items-center justify-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400"><Timer className="h-4 w-4" />Start a focus session first</Link>
      </div>}
    </section>
  )
}
