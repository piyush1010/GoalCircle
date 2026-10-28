'use client'

import { uploadBatchProof } from '@/lib/proof'
import ProofMedia from '@/components/ProofMedia'
import ClampedText from '@/components/ClampedText'
import CircleAvatar from '@/components/CircleAvatar'
import { confirmAction } from '@/lib/confirm'
import { cheer } from '@/lib/goalie'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, CircleHelp, ImagePlus, LockKeyhole, LogOut, MoreHorizontal, Pencil, Share2, Timer, Users, X, XCircle } from 'lucide-react'
import GuideTour, { type TourStep } from '@/components/GuideTour'
import CircleNotices from '@/components/CircleNotices'
import MentorDashboard, { inviteMessage, type DashboardRow } from '@/components/MentorDashboard'
import { AttachmentList, type Attachment } from '@/components/CircleAttachments'
import { EXAMS, examLabel, localDateString } from '@/lib/exams'
import { focusMinutesKey } from '@/lib/focusHandoff'
import { mediaLimitError, shrinkImage, toLocalFile, UNREADABLE_FILE } from '@/lib/media'
import { supabase } from '@/utils/supabase'

interface Circle { id: string; owner_id: string; name: string; description: string | null; exam: string | null; visibility: 'public' | 'private'; invite_code: string | null }
interface Task { id: string; title: string; details: string | null; task_date: string; attachments: Attachment[] }
type CheckinStatus = 'done' | 'partial' | 'missed'
interface Checkin { status: CheckinStatus; hours: number | null; minutes?: number | null; note: string | null; media_url: string | null; media_type: 'image' | 'video' | null; shared?: boolean; mentor_reply?: string | null; seen_at?: string | null }
interface ProgressPerson { name: string; avatar_url: string | null; status: string; media_url: string | null; media_type: 'image' | 'video' | null; me: boolean }
interface Progress { checked_in: number; members: number; people: ProgressPerson[] }

const MENTOR_TOUR: TourStep[] = [
  { title: "Hi, I'm Goalie!", text: 'This is your batch. In four quick steps I\'ll show you how to run it in a few minutes a day.' },
  { target: 'invite', title: 'Invite your students', text: 'Share this link in your WhatsApp group. Students join with one tap.' },
  { target: 'task', title: "Post today's task", text: 'Write what everyone should finish today. Students get a notification and check in against it.' },
  { target: 'students-tab', title: 'See who needs you', text: 'Students shows who is done, who isn\'t yet and who has gone quiet. Search, filter and nudge from here.' },
  { target: 'notices', title: 'Share notices', text: 'Post test dates, new targets or a photo. Pin the important ones so they stay on top.' },
]

const STUDENT_TOUR: TourStep[] = [
  { target: 'task', title: "Today's task", text: 'Your mentor posts the task here. You get a notification when it\'s new.' },
  { target: 'checkin', title: 'Check in', text: 'Pick Done, Partly done or Missed, then tap Check in. Your mentor sees it straight away.' },
]

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#16181B]'
const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-[#0E0F11]'
const primary = 'w-full rounded-2xl bg-slate-900 dark:bg-slate-50 py-3.5 text-sm font-bold text-white dark:text-slate-900 transition hover:bg-slate-800 dark:hover:bg-white disabled:opacity-60'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)

  const isAdmin = !!circle && (circle.owner_id === userId || role === 'owner' || role === 'moderator')
  const isMember = isAdmin || !!role

  const loadDashboard = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc('circle_dashboard', { target_circle: circleId, on_date: today })
    if (rpcError) setError('Student progress could not be loaded.')
    else setDashboard((data || []) as DashboardRow[])
  }, [circleId, today])

  const cacheKey = `goalcircle-circle-${circleId}`

  // Show the last view of this circle instantly, then refresh it.
  useEffect(() => {
    try {
      const cached = JSON.parse(window.localStorage.getItem(cacheKey) || 'null')
      if (cached?.circle && cached.today === today) {
        setCircle(cached.circle); setRole(cached.role); setMemberCount(cached.memberCount); setTask(cached.task); setCheckin(cached.checkin)
        if (cached.userId) setUserId(cached.userId)
        if (Array.isArray(cached.dashboard)) setDashboard(cached.dashboard)
        setLoading(false)
      }
    } catch { /* no cache */ }
  }, [cacheKey, today])

  const load = useCallback(async () => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace(`/login?next=/circles/${circleId}`); return }
    const uid = session.user.id
    setUserId(uid)
    // Everything in one round trip. The dashboard only returns rows for the circle's mentors.
    const [circleResult, roleResult, countResult, taskResult, checkinResult, dashboardResult] = await Promise.all([
      supabase.from('circles').select('id,owner_id,name,description,exam,visibility,invite_code').eq('id', circleId).maybeSingle(),
      supabase.from('circle_memberships').select('role').eq('circle_id', circleId).eq('user_id', uid).maybeSingle(),
      supabase.from('circle_memberships').select('user_id', { count: 'exact', head: true }).eq('circle_id', circleId),
      supabase.from('circle_tasks').select('id,title,details,task_date,attachments').eq('circle_id', circleId).eq('task_date', today).maybeSingle(),
      supabase.from('circle_task_checkins').select('*, circle_tasks!inner(task_date)').eq('circle_id', circleId).eq('user_id', uid).eq('circle_tasks.task_date', today).maybeSingle(),
      supabase.rpc('circle_dashboard', { target_circle: circleId, on_date: today }),
    ])
    if (!circleResult.data) { setNotFound(true); setLoading(false); return }
    const loadedCircle = circleResult.data as Circle
    const loadedTask = (taskResult.data as Task | null) ?? null
    const loadedCheckin = loadedTask && checkinResult.data ? (({ status, hours, minutes, note, media_url, media_type, shared, mentor_reply, seen_at }) => ({ status, hours, minutes, note, media_url, media_type, shared, mentor_reply, seen_at }))(checkinResult.data as unknown as Checkin) as Checkin : null
    const admin = loadedCircle.owner_id === uid || ['owner', 'moderator'].includes(roleResult.data?.role ?? '')
    const rows = admin && !dashboardResult.error ? (dashboardResult.data || []) as DashboardRow[] : []
    if (admin && dashboardResult.error) setError('Student progress could not be loaded.')
    setCircle(loadedCircle)
    setRole(roleResult.data?.role ?? null)
    setMemberCount(countResult.count || 0)
    setTask(loadedTask)
    setCheckin(loadedCheckin)
    setDashboard(rows)
    setLoading(false)
    try { window.localStorage.setItem(cacheKey, JSON.stringify({ today, userId: uid, circle: loadedCircle, role: roleResult.data?.role ?? null, memberCount: countResult.count || 0, task: loadedTask, checkin: loadedCheckin, dashboard: rows.slice(0, 150) })) } catch { /* storage full */ }
  }, [cacheKey, circleId, router, today])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  // How the batch is doing today (count and who), for students. Loads on its own.
  const loadProgress = useCallback(async () => {
    const { data, error: progressError } = await supabase.rpc('circle_today_progress', { target_circle: circleId, on_date: today })
    const row = Array.isArray(data) ? (data[0] as Progress | undefined) : undefined
    if (!progressError && row) setProgress(row)
  }, [circleId, today])
  useEffect(() => { if (task && !isAdmin && role) void Promise.resolve().then(loadProgress) }, [task, isAdmin, role, loadProgress])

  // The batch photo loads on its own, so the page never waits for it.
  useEffect(() => {
    void supabase.from('circles').select('avatar_url').eq('id', circleId).maybeSingle().then(({ data, error: photoError }) => {
      if (!photoError) setAvatarUrl((data as { avatar_url?: string | null } | null)?.avatar_url ?? null)
    })
  }, [circleId])

  const changePhoto = async (chosen?: File) => {
    if (!chosen || !userId) return
    if (!chosen.type.startsWith('image/')) { setError('Choose a photo or logo image.'); return }
    setPhotoBusy(true); setError(null)
    let file: File = chosen
    try { file = await shrinkImage(await toLocalFile(chosen)) } catch { setError(UNREADABLE_FILE); setPhotoBusy(false); return }
    const path = `${userId}/circle-${circleId}/photo-${crypto.randomUUID()}.${file.type === 'image/webp' ? 'webp' : 'jpg'}`
    const { error: uploadError } = await supabase.storage.from('goal-media').upload(path, file, { contentType: file.type, cacheControl: '31536000' })
    if (uploadError) { setError('The photo could not be uploaded. Please try again.'); setPhotoBusy(false); return }
    const url = supabase.storage.from('goal-media').getPublicUrl(path).data.publicUrl
    const { error: saveError } = await supabase.from('circles').update({ avatar_url: url }).eq('id', circleId)
    setPhotoBusy(false)
    if (saveError) { setError('The photo was uploaded but could not be saved to the batch.'); return }
    setAvatarUrl(url); flash('Batch photo updated')
  }

  const removePhoto = async () => {
    if (!(await confirmAction('Remove the batch photo? The batch will show its initials instead.'))) return
    const { error: saveError } = await supabase.from('circles').update({ avatar_url: null }).eq('id', circleId)
    if (saveError) setError('The photo could not be removed.')
    else { setAvatarUrl(null); flash('Batch photo removed') }
  }

  const flash = (text: string) => { setMessage(text); window.setTimeout(() => setMessage(null), 3000) }

  const inviteLink = circle?.invite_code ? `${typeof window !== 'undefined' ? window.location.origin : ''}/circles/join/${circle.invite_code}` : ''
  const shareInvite = async () => {
    if (!circle || !inviteLink) return
    const text = inviteMessage(circle.name, inviteLink)
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
    setMenuOpen(false)
    if (!userId || !(await confirmAction(`Leave ${circle?.name ?? 'this circle'}? Your mentor will be told, and won't see your check-ins any more.`))) return
    const { error: leaveError } = await supabase.from('circle_memberships').delete().eq('circle_id', circleId).eq('user_id', userId)
    if (leaveError) setError('You could not leave this circle.')
    else router.replace('/circles')
  }

  if (loading) return <main className="mx-auto max-w-xl space-y-3 px-4 pt-6"><div className="h-24 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="h-48 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" /></main>

  if (notFound || !circle) return <main className="mx-auto max-w-xl px-4 pt-10 text-center"><LockKeyhole className="mx-auto h-10 w-10 text-slate-400" /><h1 className="mt-3 text-lg font-bold">Circle not available</h1><p className="mt-1 text-sm text-slate-500">It may be private. Ask your mentor for an invite link.</p><Link href="/circles" className="mt-5 inline-block rounded-xl bg-slate-900 dark:bg-slate-50 px-4 py-2 text-sm font-bold text-white dark:text-slate-900">Back to circles</Link></main>

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4">
      <header className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => router.push('/circles')} aria-label="Back to circles" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#16181B]"><ArrowLeft className="h-4 w-4" /></button>
        <span className="flex-1" />
        {isMember && <button type="button" onClick={() => setTourReplay((n) => n + 1)} aria-label="Show the guide" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-500 hover:text-amber-500 dark:border-slate-700"><CircleHelp className="h-4 w-4" /></button>}
        {isMember && <div className="relative shrink-0">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="More options" aria-expanded={menuOpen} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-500 dark:border-slate-700"><MoreHorizontal className="h-4 w-4" /></button>
          {menuOpen && <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-10 cursor-default" />}
          {menuOpen && <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#16181B]">
            {isAdmin
              ? <>
                <button type="button" onClick={() => { setMenuOpen(false); setEditing(true) }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"><Pencil className="h-4 w-4" />Edit batch details</button>
                {avatarUrl && <button type="button" onClick={() => { setMenuOpen(false); void removePhoto() }} className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-950/40"><X className="h-4 w-4" />Remove photo</button>}
              </>
              : <button type="button" onClick={() => void leave()} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><LogOut className="h-4 w-4" />Leave circle</button>}
          </div>}
        </div>}
        {isAdmin && <button type="button" data-tour="invite" onClick={() => void shareInvite()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-50 px-3 py-2 text-xs font-bold text-white dark:text-slate-900"><Share2 className="h-4 w-4" />Invite</button>}
        <div className="order-last mt-2 flex w-full min-w-0 items-center gap-3">
        {isAdmin
          ? <label className="relative shrink-0 cursor-pointer" title="Change batch photo">
              <CircleAvatar name={circle.name} url={avatarUrl} size={44} className={photoBusy ? 'opacity-50' : ''} />
              <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-white bg-slate-900 text-white dark:border-[#0E0F11]"><Pencil className="h-2.5 w-2.5" /></span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Change batch photo" onChange={(event) => { void changePhoto(event.target.files?.[0]); event.target.value = '' }} />
            </label>
          : <CircleAvatar name={circle.name} url={avatarUrl} size={44} />}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">{circle.name}</h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            {examLabel(circle.exam) && <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 font-bold text-amber-700 dark:text-amber-300">{examLabel(circle.exam)}</span>}
            {circle.visibility === 'private' && <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3 w-3" />Private</span>}
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
          </p>
        </div>
        </div>
      </header>

      {message && <p role="status" className="mb-3 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">{message}</p>}
      {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}

      {isAdmin && <MentorDashboard circleId={circleId} circleName={circle.name} today={today} task={task} rows={dashboard} inviteLink={inviteLink}
        onTaskSaved={(saved) => { setTask(saved); void loadDashboard() }} onTaskDeleted={() => { setTask(null); void loadDashboard() }} onChanged={() => void loadDashboard()} onCopyInvite={async () => { await navigator.clipboard.writeText(inviteLink); flash('Invite link copied') }} flash={flash} />}

      {!isAdmin && isMember && userId && <StudentToday circleId={circleId} userId={userId} task={task} checkin={checkin} progress={progress} onSaved={(saved) => { setCheckin(saved); void loadProgress(); flash(saved.status === 'missed' ? 'Thanks for being honest. Tomorrow is a fresh start.' : 'Checked in. Your mentor can see it.') }} />}

      {isMember && userId && <CircleNotices circleId={circleId} userId={userId} isAdmin={isAdmin} />}

      {editing && isAdmin && <EditBatch circle={circle} onClose={() => setEditing(false)} onSaved={(next) => { setCircle(next); setEditing(false); flash('Batch details saved') }} />}

      {isMember && <GuideTour name={isAdmin ? 'mentor-circle' : 'student-circle'} steps={isAdmin ? MENTOR_TOUR : STUDENT_TOUR} replayKey={tourReplay} />}

      {!isMember && <section className={`${card} text-center`}>
        <h2 className="text-base font-bold">Join this circle</h2>
        <p className="mt-1 text-sm text-slate-500">{circle.description || 'Check in daily with the group.'}</p>
        <button type="button" onClick={() => void joinPublic()} className={`${primary} mt-4`}>Join circle</button>
      </section>}

    </main>
  )
}

function StudentToday({ circleId, userId, task, checkin, progress, onSaved }: { circleId: string; userId: string; task: Task | null; checkin: Checkin | null; progress: Progress | null; onSaved: (checkin: Checkin) => void }) {
  const [shareWithBatch, setShareWithBatch] = useState(checkin?.shared ?? false)
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<CheckinStatus | null>(checkin?.status ?? null)
  const [minutes, setMinutes] = useState(() => {
    const saved = checkin?.minutes ?? (checkin?.hours != null ? Math.round(checkin.hours * 60) : null)
    if (saved != null) return String(saved)
    try { return window.localStorage.getItem(focusMinutesKey(circleId, localDateString())) || '' } catch { return '' }
  })
  const [note, setNote] = useState(checkin?.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (!task) return <section data-tour="task" className={`${card} text-center`}>
    <CheckCircle2 className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
    <h2 className="mt-2 text-base font-bold">No task from your mentor today</h2>
    <p className="mt-1 text-sm text-slate-500">Use the time for your own study. You&apos;ll get a notification when your mentor posts one.</p>
    <Link href={`/focus?circle=${circleId}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400"><Timer className="h-4 w-4" />Start a focus session</Link>
  </section>

  const chooseFile = async (chosen?: File) => {
    if (!chosen) return
    let picked: File = chosen
    if (!picked.type.startsWith('image/') && !picked.type.startsWith('video/')) { setError('Choose a photo or a video.'); return }
    const limit = mediaLimitError(picked)
    if (limit) { setError(limit); return }
    try { picked = await toLocalFile(picked) } catch { setError(UNREADABLE_FILE); return }
    if (picked.type.startsWith('image/')) picked = await shrinkImage(picked)
    if (preview) URL.revokeObjectURL(preview)
    setFile(picked); setPreview(URL.createObjectURL(picked)); setError(null)
  }

  const save = async () => {
    if (!status) { setError('Pick Done, Partly done or Missed first.'); return }
    const minutesValue = minutes.trim() === '' ? null : Math.round(Number(minutes))
    if (minutesValue !== null && (Number.isNaN(minutesValue) || minutesValue < 0 || minutesValue > 1440)) { setError('Minutes should be between 0 and 1440.'); return }
    setSaving(true); setError(null)
    let mediaUrl = checkin?.media_url ?? null
    let mediaType = checkin?.media_type ?? null
    if (file) {
      // Private: only you, your mentor, and (if you share it) your batch can open it.
      const uploaded = await uploadBatchProof(userId, circleId, file)
      if ('error' in uploaded) { setError(uploaded.error); setSaving(false); return }
      mediaUrl = uploaded.ref
      mediaType = file.type.startsWith('video/') ? 'video' : 'image'
    }
    const row: Checkin = { status, ...(mediaUrl && (shareWithBatch || checkin?.shared) ? { shared: shareWithBatch } : {}), minutes: minutesValue, hours: minutesValue === null ? null : Math.min(24, Math.round(minutesValue / 6) / 10), note: note.trim() || null, media_url: mediaUrl, media_type: mediaType }
    const { error: saveError } = await supabase.from('circle_task_checkins').upsert({ task_id: task.id, circle_id: circleId, user_id: userId, ...row, updated_at: new Date().toISOString() }, { onConflict: 'task_id,user_id' })
    setSaving(false)
    if (saveError) { setError('Your update could not be saved. Please try again.'); return }
    setEditing(false); setFile(null)
    onSaved({ ...row, mentor_reply: checkin?.mentor_reply ?? null, seen_at: checkin?.seen_at ?? null })
    if (status !== 'missed') cheer()
  }

  const showForm = editing || !checkin

  return (
    <section data-tour="task" className={card}>
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Today&apos;s task</p>
      <h2 className="mt-1 text-lg font-bold leading-snug">{task.title}</h2>
      {task.details && <ClampedText text={task.details} className="mt-1 text-sm text-slate-600 dark:text-slate-300" />}
      <AttachmentList attachments={task.attachments ?? []} />

      {progress && progress.members > 0 && <BatchToday progress={progress} />}

      {!showForm && checkin && <div className={`mt-4 flex items-center justify-between rounded-2xl px-4 py-3 ${checkin.status === 'missed' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-emerald-500/10'}`}>
        <p className={`flex items-center gap-2 text-sm font-bold ${checkin.status === 'missed' ? 'text-slate-600 dark:text-slate-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{checkin.status === 'missed' ? <XCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}{checkin.status === 'done' ? 'Done today' : checkin.status === 'partial' ? 'Partly done' : 'Missed today'}{(() => { const m = checkin.minutes ?? (checkin.hours != null ? Math.round(checkin.hours * 60) : null); return m ? ` · ${m} min` : '' })()}</p>
        <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Pencil className="h-3.5 w-3.5" />Edit</button>
      </div>}
      {!showForm && checkin && (checkin.mentor_reply || checkin.seen_at) && <div className="mt-2 space-y-2">
        {checkin.mentor_reply && <div className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"><p className="text-xs font-semibold text-slate-500">Your mentor replied</p><p className="mt-0.5 text-sm">{checkin.mentor_reply}</p></div>}
        {!checkin.mentor_reply && checkin.seen_at && <p className="px-1 text-xs font-semibold text-slate-500">Seen by your mentor</p>}
      </div>}

      {showForm && <div className="mt-4 space-y-3">
        <div data-tour="checkin" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="How did today go?">
          {([['done', 'Done'], ['partial', 'Partly done'], ['missed', 'Missed']] as const).map(([value, label]) => <button type="button" role="radio" aria-checked={status === value} key={value} onClick={() => setStatus(value)} className={`rounded-lg py-2.5 text-sm font-bold transition ${status === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="minutes" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Minutes studied <span className="font-normal text-slate-400">(optional)</span></label>
          <input id="minutes" type="number" inputMode="numeric" min="0" max="1440" step="5" value={minutes} onChange={(event) => setMinutes(event.target.value)} placeholder="0" className={`${field} w-24 py-2 text-center font-bold`} />
        </div>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} placeholder="Note for your mentor (only your mentor sees it)" className={`${field} resize-none`} />
        {preview ? <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">{file?.type.startsWith('video/') ? <video src={preview} controls playsInline className="max-h-56 w-full object-contain" /> : <div className="relative h-44"><Image src={preview} alt="Your proof" fill unoptimized className="object-contain" /></div>}<button type="button" onClick={() => { if (preview) URL.revokeObjectURL(preview); setPreview(null); setFile(null) }} aria-label="Remove file" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-950/80 text-white"><X className="h-4 w-4" /></button></div>
          : <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-3 text-sm font-bold text-slate-500 transition hover:border-amber-500 dark:border-slate-700"><ImagePlus className="h-4 w-4 text-amber-500" />Add a photo or video (optional)<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(event) => void chooseFile(event.target.files?.[0])} /></label>}
        {(preview || checkin?.media_url) && <label className="flex items-center gap-2 px-1 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={shareWithBatch} onChange={(event) => setShareWithBatch(event.target.checked)} className="h-4 w-4 accent-slate-900" />Show my photo to the batch <span className="text-slate-400">(your note stays private)</span></label>}
        {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
        <button type="button" onClick={() => void save()} disabled={saving || !status} className={primary}>{saving ? 'Saving…' : status ? 'Check in' : 'Pick how today went'}</button>
        <Link href={`/focus?circle=${circleId}`} data-tour="focus" className="flex items-center justify-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400"><Timer className="h-4 w-4" />Start a focus session first</Link>
      </div>}
    </section>
  )
}

/** Mentors fix the batch name, exam or description after creating it. */
function EditBatch({ circle, onClose, onSaved }: { circle: Circle; onClose: () => void; onSaved: (circle: Circle) => void }) {
  const [name, setName] = useState(circle.name)
  const [exam, setExam] = useState(circle.exam ?? '')
  const [description, setDescription] = useState(circle.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanName = name.trim()
    if (cleanName.length < 2) { setError('Give the batch a name of at least 2 characters.'); return }
    setSaving(true); setError(null)
    const next = { name: cleanName, exam: exam || null, description: description.trim() || null }
    const { error: saveError } = await supabase.from('circles').update(next).eq('id', circle.id)
    setSaving(false)
    if (saveError) { setError('The changes could not be saved. Please try again.'); return }
    onSaved({ ...circle, ...next })
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-batch-title">
    <form onSubmit={save} className="w-full max-w-sm space-y-3 rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-[#16181B]">
      <div className="flex items-center justify-between"><h2 id="edit-batch-title" className="text-base font-bold">Edit batch details</h2><button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button></div>
      <label className="block text-sm font-semibold">Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required className={`${field} mt-1`} /></label>
      <label className="block text-sm font-semibold">Exam<select value={exam} onChange={(event) => setExam(event.target.value)} className={`${field} mt-1`}><option value="">No exam</option>{EXAMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="block text-sm font-semibold">Description <span className="font-normal text-slate-500">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} maxLength={300} className={`${field} mt-1 resize-none`} /></label>
      {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
      <button type="submit" disabled={saving} className={primary}>{saving ? 'Saving…' : 'Save changes'}</button>
    </form>
  </div>
}

/** Today in the batch: how many have checked in, who, and photos they chose to share. */
function BatchToday({ progress }: { progress: Progress }) {
  const people = progress.people || []
  const others = people.filter((person) => !person.me)
  const photos = people.filter((person) => person.media_url && person.media_type === 'image').slice(0, 6)
  const names = others.slice(0, 2).map((person) => person.name.split(' ')[0])
  const rest = others.length - names.length
  return <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 dark:bg-[#0E0F11]">
    <div className="flex items-center gap-3">
      {people.length > 0 && <div className="flex -space-x-2">
        {people.slice(0, 4).map((person, index) => person.avatar_url && !person.avatar_url.startsWith('preset:')
          ? <Image key={index} src={person.avatar_url} alt="" width={28} height={28} unoptimized className="h-7 w-7 rounded-full border-2 border-white object-cover dark:border-[#0E0F11]" />
          : <span key={index} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-semibold text-slate-700 dark:border-[#0E0F11] dark:bg-slate-700 dark:text-slate-200">{person.name.charAt(0).toUpperCase()}</span>)}
      </div>}
      <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">{progress.checked_in} of {progress.members}</span> <span className="text-slate-500">checked in today</span></p>
    </div>
    {names.length > 0 && <p className="mt-1.5 text-xs text-slate-500">{names.join(', ')}{rest > 0 ? ` and ${rest} more` : ''} {others.length === 1 ? 'has' : 'have'} checked in.</p>}
    {photos.length > 0 && <div className="mt-3 grid grid-cols-3 gap-1.5">
      {photos.map((person, index) => <div key={index} className="relative aspect-square overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800"><ProofMedia src={person.media_url!} type="image" alt={`${person.name}'s proof`} fill className="object-cover" /><span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-[11px] font-semibold text-white">{person.me ? 'You' : person.name.split(' ')[0]}</span></div>)}
    </div>}
  </div>
}
