'use client'

import ProofMedia from '@/components/ProofMedia'
import ClampedText from '@/components/ClampedText'
import { confirmAction } from '@/lib/confirm'
import ProfileAvatar from '@/components/ProfileAvatar'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle2, ChevronDown, Clock3, Copy, Download, MessageCircle, Moon, Pencil, Search, Send, UserMinus, UserPlus, XCircle } from 'lucide-react'
import { AttachmentList, AttachmentPicker, removeCircleFiles, uploadCircleFiles, type Attachment } from '@/components/CircleAttachments'
import { supabase } from '@/utils/supabase'

export interface DashboardRow {
  user_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  joined_at: string
  today_status: 'done' | 'partial' | 'missed' | null
  today_hours: number | null
  today_minutes?: number | null
  today_reply?: string | null
  today_seen_at?: string | null
  today_note: string | null
  today_media_url: string | null
  today_media_type: 'image' | 'video' | null
  last_checkin_at: string | null
  days_done_7: number
  tasks_set_7: number
}

interface Task { id: string; title: string; details: string | null; task_date: string; attachments: Attachment[] }

type Filter = 'all' | 'done' | 'missed' | 'not_done' | 'quiet'

const checkedIn = (row: DashboardRow) => row.today_status === 'done' || row.today_status === 'partial'
const minutesOf = (row: DashboardRow) => row.today_minutes ?? (row.today_hours != null ? Math.round(row.today_hours * 60) : null)
type Sort = 'last' | 'name' | 'newest'
const QUIET_MS = 2 * 24 * 60 * 60 * 1000

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#16181B]'
const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-[#0E0F11]'

const displayName = (row: DashboardRow) => row.full_name || row.username || 'Student'
const isQuiet = (row: DashboardRow, now: number) => {
  const reference = row.last_checkin_at ?? row.joined_at
  return now - new Date(reference).getTime() > QUIET_MS
}
const timeAgo = (value: string | null) => {
  if (!value) return 'Never'
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`

/** The message mentors forward to their WhatsApp group: what it is, and exactly what to tap. */
export const inviteMessage = (circleName: string, link: string) =>
  `Join our batch "${circleName}" on GoalYaar\nI'll post the daily task there; check in once you finish it.\n\n1. Open: ${link}\n2. Tap "Continue with Google"\n3. Add it to your home screen (Chrome ⋮ → Add to Home screen) so you don't miss tasks.`

export default function MentorDashboard({ circleId, circleName, today, task, rows, inviteLink, onTaskSaved, onTaskDeleted, onChanged, onCopyInvite, flash }: {
  circleId: string; circleName: string; today: string; task: Task | null; rows: DashboardRow[]; inviteLink: string
  onTaskSaved: (task: Task) => void; onTaskDeleted: () => void; onChanged: () => void; onCopyInvite: () => void; flash: (text: string) => void
}) {
  const [view, setView] = useState<'today' | 'students' | 'week'>('today')
  const [seenMarked, setSeenMarked] = useState(false)
  const [now] = useState(() => Date.now())
  const done = rows.filter(checkedIn)
  const missed = rows.filter((row) => row.today_status === 'missed')
  const notDone = rows.filter((row) => !row.today_status)
  const quiet = rows.filter((row) => isQuiet(row, now))

  const nudge = async (ids: string[]) => {
    if (ids.length === 0) return
    const { data, error } = await supabase.rpc('nudge_circle_members', { target_circle: circleId, member_ids: ids, note: task ? `Reminder: today's task is "${task.title}".` : 'Your mentor is checking on you. Keep going today!' })
    if (error) flash('Nudge could not be sent')
    else flash(data === 0 ? 'Already nudged in the last 3 hours' : `Nudge sent to ${data} ${data === 1 ? 'student' : 'students'}`)
  }

  const inviteCard = <section className={`${card} text-center`}>
          <UserPlus className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="mt-2 text-base font-bold">{rows.length === 0 && view === 'students' ? 'No students yet' : 'Invite your students'}</h2>
          <p className="mt-1 text-sm text-slate-500">Send the invite to your WhatsApp group. It explains the steps, so students join on their own.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={whatsappUrl(inviteMessage(circleName, inviteLink))} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
            <button type="button" onClick={onCopyInvite} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700"><Copy className="h-4 w-4" />Copy link</button>
          </div>
        </section>

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {([['today', 'Today'], ['students', `Students (${rows.length})`], ['week', 'This week']] as const).map(([value, label]) => <button type="button" role="tab" data-tour={value === 'students' ? 'students-tab' : undefined} aria-selected={view === value} key={value} onClick={() => {
          setView(value)
          // Opening the list counts as reading today's check-ins: students see "Seen by mentor".
          if (value === 'students' && !seenMarked) { setSeenMarked(true); void supabase.rpc('mark_checkins_seen', { target_circle: circleId, on_date: today }) }
        }} className={`rounded-lg py-2.5 text-sm font-bold transition ${view === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      {view === 'today' && <>
        <TaskCard key={task?.id ?? 'new'} circleId={circleId} today={today} task={task} onSaved={onTaskSaved} onDeleted={onTaskDeleted} />
        <UpcomingTasks circleId={circleId} today={today} />

        {rows.length === 0 ? inviteCard : <section className={card}>
          <h2 className="text-sm font-bold">Today at a glance</h2>
          {task && <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat label="Checked in" value={done.length} tone="text-emerald-600 dark:text-emerald-400" onClick={() => setView('students')} />
            <Stat label="Missed" value={missed.length} tone="text-slate-600 dark:text-slate-300" onClick={() => setView('students')} />
            <Stat label="Not yet" value={notDone.length} tone="text-amber-600 dark:text-amber-400" onClick={() => setView('students')} />
            <Stat label="Quiet 2+ days" value={quiet.length} tone="text-rose-600 dark:text-rose-400" onClick={() => setView('students')} />
          </div>}
          {task && notDone.length > 0 && <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={() => void nudge(notDone.map((row) => row.user_id))} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-50 py-3 text-sm font-bold text-white dark:text-slate-900"><BellRing className="h-4 w-4" />Nudge {notDone.length} who haven&apos;t checked in</button>
            <a href={whatsappUrl(`Reminder for ${circleName}: today's task is "${task.title}". Please check in on GoalYaar once it's done.`)} target="_blank" rel="noreferrer" aria-label="Send reminder on WhatsApp" className="grid w-12 place-items-center rounded-xl bg-emerald-500 text-white"><MessageCircle className="h-5 w-5" /></a>
          </div>}
          {!task && <p className="mt-4 text-center text-xs text-slate-500">Set today&apos;s task above to start tracking.</p>}
        </section>}
      </>}

      {view === 'students' && rows.length === 0 && inviteCard}
      {view === 'students' && rows.length > 0 && <StudentList rows={rows} now={now} hasTask={!!task} taskId={task?.id ?? null} circleId={circleId} onNudge={nudge} onChanged={onChanged} flash={flash} />}
      {view === 'week' && <WeeklyReport circleId={circleId} circleName={circleName} today={today} flash={flash} />}
    </div>
  )
}

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl bg-slate-50 py-3 transition hover:bg-slate-100 dark:bg-[#0E0F11] dark:hover:bg-slate-800">
    <span className={`block text-2xl font-bold ${tone}`}>{value}</span>
    <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
  </button>
}

function TaskCard({ circleId, today, task, onSaved, onDeleted, dayLabel = 'today', startOpen }: { circleId: string; today: string; task: Task | null; onSaved: (task: Task) => void; onDeleted: () => void; dayLabel?: string; startOpen?: boolean }) {
  const [editing, setEditing] = useState(startOpen ?? !task)
  const forToday = dayLabel === 'today'
  const [title, setTitle] = useState(task?.title ?? '')
  const [details, setDetails] = useState(task?.details ?? '')
  const [kept, setKept] = useState<Attachment[]>(task?.attachments ?? [])
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (title.trim().length < 3) { setError('Write a task of at least 3 characters.'); return }
    setSaving(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    let uploaded: Attachment[] = []
    try { uploaded = await uploadCircleFiles(circleId, files) } catch (uploadError) { setError((uploadError as Error).message); setSaving(false); return }
    const attachments = [...kept, ...uploaded]
    const values = { title: title.trim(), details: details.trim() || null, attachments, updated_at: new Date().toISOString() }
    const result = task
      ? await supabase.from('circle_tasks').update(values).eq('id', task.id).select('id,title,details,task_date,attachments').single()
      : await supabase.from('circle_tasks').insert({ ...values, circle_id: circleId, creator_id: session?.user.id, task_date: today }).select('id,title,details,task_date,attachments').single()
    setSaving(false)
    if (result.error || !result.data) { await removeCircleFiles(uploaded.map((file) => file.path)); setError('The task could not be saved.'); return }
    const removed = (task?.attachments ?? []).filter((file) => !kept.some((keep) => keep.path === file.path))
    void removeCircleFiles(removed.map((file) => file.path))
    setFiles([]); setKept(attachments); setEditing(false)
    onSaved(result.data as Task)
    if (!task && forToday) window.dispatchEvent(new CustomEvent('goalcircle:push-moment', { detail: 'Task posted! Want a buzz when students comment or need you?' }))
  }

  const remove = async () => {
    if (!task || !(await confirmAction(forToday ? 'Delete today’s task? Students’ check-ins for it will be removed too.' : `Delete the task for ${dayLabel}?`))) return
    setSaving(true); setError(null)
    const { data, error: deleteError } = await supabase.from('circle_tasks').delete().eq('id', task.id).select('id')
    setSaving(false)
    if (deleteError || !data?.length) { setError('The task could not be deleted.'); return }
    void removeCircleFiles((task.attachments ?? []).map((file) => file.path))
    onDeleted()
  }

  if (!editing && task) return <section data-tour={forToday ? 'task' : undefined} className={card}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{forToday ? 'Today’s task' : `Task for ${dayLabel}`}</p>
        <h2 className="mt-1 text-lg font-bold leading-snug">{task.title}</h2>
        {task.details && <ClampedText text={task.details} className="mt-1 text-sm text-slate-600 dark:text-slate-300" />}
      </div>
      <button type="button" onClick={() => setEditing(true)} aria-label="Edit task" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Pencil className="h-4 w-4" /></button>
    </div>
    <AttachmentList attachments={task.attachments ?? []} isAdmin />
  </section>

  return <section data-tour={forToday ? 'task' : undefined} className={card}>
    <label htmlFor={`task-title-${today}`} className="block text-sm font-bold">{forToday ? (task ? 'Edit today’s task' : 'Set today’s task') : (task ? `Edit task for ${dayLabel}` : `Plan a task for ${dayLabel}`)}</label>
    <p className="mt-0.5 text-xs text-slate-500">{forToday ? 'Students get a notification and check in against it.' : 'Students see it and get a notification that morning at 6 AM.'}</p>
    <input id={`task-title-${today}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="e.g. Write 2 GS2 answers + revise Polity ch. 5" className={`${field} mt-3 font-semibold`} />
    <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} placeholder="Details or instructions (optional)" className={`${field} mt-2 max-h-72 min-h-[5rem] resize-none [field-sizing:content]`} />
    <div className="mt-2"><AttachmentPicker files={files} existing={kept} onFilesChange={setFiles} onRemoveExisting={(path) => setKept((list) => list.filter((file) => file.path !== path))} onExistingChange={setKept} onError={setError} /></div>
    {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
    <div className="mt-3 flex gap-2">
      {(task || !forToday) && <button type="button" onClick={() => { if (!task) { onDeleted(); return } setEditing(false); setTitle(task.title); setDetails(task.details ?? ''); setKept(task.attachments ?? []); setFiles([]) }} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700">Cancel</button>}
      <button type="button" onClick={() => void save()} disabled={saving} className="flex-[2] rounded-xl bg-slate-900 dark:bg-slate-50 py-3 text-sm font-bold text-white dark:text-slate-900 disabled:opacity-60">{saving ? 'Saving…' : task ? 'Save changes' : forToday ? 'Post task' : 'Schedule task'}</button>
    </div>
    {task && <button type="button" onClick={() => void remove()} disabled={saving} className="mt-3 w-full text-center text-xs font-bold text-rose-600 disabled:opacity-60 dark:text-rose-400">Delete this task</button>}
  </section>
}

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + days)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}
const dayName = (date: string, today: string) => date === addDays(today, 1) ? 'tomorrow' : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** Plan the next seven days. Each planned task reaches students on its own morning. */
function UpcomingTasks({ circleId, today }: { circleId: string; today: string }) {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [editingDay, setEditingDay] = useState<string | null>(null)
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index + 1))

  const load = useCallback(async () => {
    const { data } = await supabase.from('circle_tasks').select('id,title,details,task_date,attachments').eq('circle_id', circleId).gt('task_date', today).lte('task_date', addDays(today, 7)).order('task_date')
    setTasks((data || []) as Task[])
  }, [circleId, today])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const planned = tasks.length
  return <section className={card}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
      <span><span className="block text-base font-bold">Plan ahead</span><span className="block text-sm text-slate-600 dark:text-slate-300">{planned ? `${planned} of the next 7 days planned` : 'Set tasks for the coming week in one go'}</span></span>
      <ChevronDown className={`h-5 w-5 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="mt-3 space-y-2">{days.map((day) => {
      const existing = tasks.find((item) => item.task_date === day) ?? null
      if (editingDay === day) return <TaskCard key={`${day}-${existing?.id ?? 'new'}`} circleId={circleId} today={day} task={existing} dayLabel={dayName(day, today)} startOpen
        onSaved={(saved) => { setTasks((list) => [...list.filter((item) => item.task_date !== day), saved].sort((a, b) => a.task_date.localeCompare(b.task_date))); setEditingDay(null) }}
        onDeleted={() => { setTasks((list) => list.filter((item) => item.task_date !== day)); setEditingDay(null) }} />
      return <button type="button" key={day} onClick={() => setEditingDay(day)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 text-left transition hover:border-amber-500 dark:border-slate-700">
        <span className="w-24 shrink-0 text-sm font-bold capitalize">{dayName(day, today)}</span>
        <span className={`min-w-0 flex-1 truncate text-sm ${existing ? 'font-semibold' : 'text-slate-500'}`}>{existing ? existing.title : '+ Add task'}</span>
        {existing && <Pencil className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
    })}</div>}
  </section>
}

function StudentList({ rows, now, hasTask, taskId, circleId, onNudge, onChanged, flash }: {
  rows: DashboardRow[]; now: number; hasTask: boolean; taskId: string | null; circleId: string
  onNudge: (ids: string[]) => Promise<void>; onChanged: () => void; flash: (text: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('last')
  const [open, setOpen] = useState<string | null>(null)

  const visible = useMemo(() => {
    const text = query.trim().toLowerCase()
    return rows
      .filter((row) => !text || displayName(row).toLowerCase().includes(text) || (row.username || '').toLowerCase().includes(text))
      .filter((row) => filter === 'all' || (filter === 'done' && checkedIn(row)) || (filter === 'missed' && row.today_status === 'missed') || (filter === 'not_done' && !row.today_status) || (filter === 'quiet' && isQuiet(row, now)))
      .sort((a, b) => {
        if (sort === 'name') return displayName(a).localeCompare(displayName(b))
        if (sort === 'newest') return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
        return new Date(b.last_checkin_at ?? 0).getTime() - new Date(a.last_checkin_at ?? 0).getTime()
      })
  }, [filter, now, query, rows, sort])

  const remove = async (row: DashboardRow) => {
    if (!(await confirmAction(`Remove ${displayName(row)} from this circle?`))) return
    const { error } = await supabase.from('circle_memberships').delete().eq('circle_id', circleId).eq('user_id', row.user_id)
    if (error) flash('Could not remove this student')
    else { flash(`${displayName(row)} removed`); onChanged() }
  }

  const filters: Array<[Filter, string]> = [['all', 'All'], ['done', 'Checked in'], ['missed', 'Missed'], ['not_done', 'Not yet'], ['quiet', 'Quiet 2+ days']]

  return <section className="space-y-3">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students by name" className={`${field} pl-10`} />
    </div>
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">
        {filters.map(([value, label]) => <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${filter === value ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{label}</button>)}
      </div>
      <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort students" className="shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-[#16181B]">
        <option value="last">Last check-in</option>
        <option value="name">Name</option>
        <option value="newest">Newest</option>
      </select>
    </div>

    {visible.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No students match.</p>}

    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700/70 dark:bg-[#16181B]">
      {visible.map((row) => {
        const quiet = isQuiet(row, now)
        const expanded = open === row.user_id
        return <li key={row.user_id}>
          <button type="button" onClick={() => setOpen(expanded ? null : row.user_id)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <ProfileAvatar value={row.avatar_url} name={displayName(row)} size={40} className="rounded-full" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{displayName(row)}</span>
              <span className="block text-xs text-slate-500">Last check-in {timeAgo(row.last_checkin_at)} · {row.days_done_7} of {row.tasks_set_7 || 0} tasks this week</span>
            </span>
            <StatusPill status={row.today_status} quiet={quiet} minutes={minutesOf(row)} hasTask={hasTask} />
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && <div className="space-y-3 px-4 pb-4">
            {row.today_note && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-[#0E0F11]">“{row.today_note}”</p>}
            {row.today_status && taskId && <ReplyBox key={`${row.user_id}-${row.today_reply ?? ''}`} taskId={taskId} studentId={row.user_id} existing={row.today_reply ?? null} onSent={onChanged} flash={flash} />}
            {row.today_media_url && (row.today_media_type === 'video'
              ? <ProofMedia src={row.today_media_url} type="video" alt={`${displayName(row)}'s proof`} className="max-h-56 w-full rounded-xl bg-slate-950 object-contain" />
              : <div className="relative h-48 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950"><ProofMedia src={row.today_media_url} type="image" alt={`${displayName(row)}'s proof`} fill className="object-contain" /></div>)}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <button type="button" onClick={() => void onNudge([row.user_id])} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-50 py-2.5 text-xs font-bold text-white dark:text-slate-900 disabled:opacity-50"><BellRing className="h-4 w-4" />Nudge</button>
              <a href={whatsappUrl(`Hi ${displayName(row).split(' ')[0]}, just checking in. How is your preparation going today?`)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              <button type="button" onClick={() => void remove(row)} aria-label={`Remove ${displayName(row)}`} className="grid w-10 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 dark:border-slate-700"><UserMinus className="h-4 w-4" /></button>
            </div>
          </div>}
        </li>
      })}
    </ul>
  </section>
}

function StatusPill({ status, quiet, minutes, hasTask }: { status: DashboardRow['today_status']; quiet: boolean; minutes: number | null; hasTask: boolean }) {
  const time = minutes ? ` · ${minutes}m` : ''
  if (status === 'done') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Done{time}</span>
  if (status === 'partial') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-700 dark:text-sky-300"><Clock3 className="h-3.5 w-3.5" />Partly{time}</span>
  if (status === 'missed') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300"><XCircle className="h-3.5 w-3.5" />Missed</span>
  if (quiet) return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-700 dark:text-rose-300"><Moon className="h-3.5 w-3.5" />Quiet</span>
  if (!hasTask) return <span className="inline-flex shrink-0 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-bold text-slate-500">No task</span>
  return <span className="inline-flex shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">Not yet</span>
}

/** The mentor's short reply to a student's check-in. The student gets a notification. */
function ReplyBox({ taskId, studentId, existing, onSent, flash }: { taskId: string; studentId: string; existing: string | null; onSent: () => void; flash: (text: string) => void }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const send = async (value: string) => {
    const reply = value.trim()
    if (!reply) return
    setSending(true)
    const { error } = await supabase.rpc('reply_to_checkin', { target_task: taskId, target_user: studentId, reply })
    setSending(false)
    if (error) { flash('Reply could not be sent'); return }
    setText(''); flash('Reply sent'); onSent()
  }
  return <div className="space-y-2">
    {existing && <p className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><span className="mb-0.5 block text-xs font-semibold text-slate-500">Your reply</span>{existing}</p>}
    <div className="flex flex-wrap gap-1.5">
      {['Well done', 'Keep going', 'Good effort today', 'Let’s talk about this'].map((quick) => <button type="button" key={quick} disabled={sending} onClick={() => void send(quick)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">{quick}</button>)}
    </div>
    <div className="flex gap-2">
      <input value={text} onChange={(event) => setText(event.target.value)} maxLength={500} placeholder={existing ? 'Send another reply' : 'Reply to this check-in'} aria-label="Reply to this check-in" className={`${field} py-2.5`} />
      <button type="button" onClick={() => void send(text)} disabled={sending || !text.trim()} aria-label="Send reply" className="grid w-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"><Send className="h-4 w-4" /></button>
    </div>
  </div>
}

interface WeekRow { user_id: string; full_name: string | null; username: string | null; done_days: number; partial_days: number; missed_days: number; minutes: number; tasks_set: number; last_checkin_at: string | null }

const hoursText = (minutes: number) => minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} m` : ''}`.trim() : `${minutes} m`

/** The last 7 days per student: who is consistent and who is slipping. Shareable as text or a CSV file. */
function WeeklyReport({ circleId, circleName, today, flash }: { circleId: string; circleName: string; today: string; flash: (text: string) => void }) {
  const [rows, setRows] = useState<WeekRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    void supabase.rpc('circle_weekly_report', { target_circle: circleId, end_date: today }).then(({ data, error }) => {
      if (error) { setFailed(true); return }
      const list = ((data || []) as WeekRow[]).sort((a, b) => (b.done_days + b.partial_days) - (a.done_days + a.partial_days) || b.minutes - a.minutes)
      setRows(list)
    })
  }, [circleId, today])

  if (failed) return <section className={card}><p className="text-sm text-slate-500">The weekly report couldn&apos;t load. Please try again in a moment.</p></section>
  if (!rows) return <div className="h-48 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
  const tasks = rows[0]?.tasks_set ?? 0
  const name = (row: WeekRow) => row.full_name || row.username || 'Student'
  const showedUp = (row: WeekRow) => row.done_days + row.partial_days
  const slipping = rows.filter((row) => tasks > 0 && showedUp(row) < Math.ceil(tasks / 2))

  const summary = () => [
    `${circleName}: last 7 days (${tasks} ${tasks === 1 ? 'task' : 'tasks'})`,
    '',
    ...rows.map((row, index) => `${index + 1}. ${name(row)}: ${showedUp(row)}/${tasks}${row.minutes ? `, ${hoursText(row.minutes)}` : ''}${row.missed_days ? `, ${row.missed_days} missed` : ''}`),
    ...(slipping.length ? ['', `Needs a nudge: ${slipping.map(name).join(', ')}`] : []),
  ].join('\n')

  const downloadCsv = () => {
    const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
    const lines = [['Student', 'Tasks set', 'Done', 'Partly done', 'Missed', 'Minutes', 'Last check-in'].map(quote).join(',')]
    rows.forEach((row) => lines.push([name(row), tasks, row.done_days, row.partial_days, row.missed_days, row.minutes, row.last_checkin_at ? new Date(row.last_checkin_at).toLocaleString() : ''].map(quote).join(',')))
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }))
    const link = document.createElement('a'); link.href = url; link.download = `${circleName.replace(/[^a-z0-9]+/gi, '-')}-week-${today}.csv`; link.click()
    URL.revokeObjectURL(url); flash('Report downloaded')
  }

  return <section className={card}>
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-base font-bold">Last 7 days</h2><p className="text-sm text-slate-500">{tasks} {tasks === 1 ? 'task' : 'tasks'} posted · {rows.length} {rows.length === 1 ? 'student' : 'students'}</p></div>
    </div>
    {rows.length === 0 ? <p className="mt-4 text-sm text-slate-500">No students yet.</p> : <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map((row) => {
        const share = tasks ? showedUp(row) / tasks : 0
        return <li key={row.user_id} className="flex items-center gap-3 py-3">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{name(row)}</span>
            <span className="block text-xs text-slate-500">{row.done_days} done{row.partial_days ? ` · ${row.partial_days} partly` : ''}{row.missed_days ? ` · ${row.missed_days} missed` : ''}{row.minutes ? ` · ${hoursText(row.minutes)}` : ''}</span>
          </span>
          <span className="w-20 shrink-0">
            <span className="block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full" style={{ width: `${Math.round(share * 100)}%`, background: share >= 0.5 ? '#E8890C' : '#94A3B8' }} /></span>
            <span className="mt-1 block text-right text-xs font-semibold tabular-nums">{showedUp(row)}/{tasks}</span>
          </span>
        </li>
      })}
    </ul>}
    {slipping.length > 0 && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-[#0E0F11]"><span className="font-semibold">Needs a nudge:</span> {slipping.map(name).join(', ')}</p>}
    {rows.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2">
      <a href={whatsappUrl(summary())} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Share summary</a>
      <button type="button" onClick={downloadCsv} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700"><Download className="h-4 w-4" />Download CSV</button>
    </div>}
  </section>
}
