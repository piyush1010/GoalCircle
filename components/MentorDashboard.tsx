'use client'

import ClampedText from '@/components/ClampedText'
import { confirmAction } from '@/lib/confirm'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle2, ChevronDown, Clock3, Copy, MessageCircle, Moon, Pencil, Search, UserMinus, UserPlus, XCircle } from 'lucide-react'
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

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]'
const field = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-[#07101f]'

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
  `Join our batch "${circleName}" on GoalYaar 🎯\nI'll post the daily task there; check in once you finish it.\n\n1. Open: ${link}\n2. Tap "Continue with Google"\n3. Add it to your home screen (Chrome ⋮ → Add to Home screen) so you don't miss tasks.`

export default function MentorDashboard({ circleId, circleName, today, task, rows, inviteLink, onTaskSaved, onTaskDeleted, onChanged, onCopyInvite, flash }: {
  circleId: string; circleName: string; today: string; task: Task | null; rows: DashboardRow[]; inviteLink: string
  onTaskSaved: (task: Task) => void; onTaskDeleted: () => void; onChanged: () => void; onCopyInvite: () => void; flash: (text: string) => void
}) {
  const [view, setView] = useState<'today' | 'students'>('today')
  const [now] = useState(() => Date.now())
  const done = rows.filter(checkedIn)
  const missed = rows.filter((row) => row.today_status === 'missed')
  const notDone = rows.filter((row) => !row.today_status)
  const quiet = rows.filter((row) => isQuiet(row, now))

  const nudge = async (ids: string[]) => {
    if (ids.length === 0) return
    const { data, error } = await supabase.rpc('nudge_circle_members', { target_circle: circleId, member_ids: ids, note: task ? `Reminder: today's task is "${task.title}".` : null })
    if (error) flash('Nudge could not be sent')
    else flash(data === 0 ? 'Already nudged in the last 3 hours' : `Nudge sent to ${data} ${data === 1 ? 'student' : 'students'}`)
  }

  const inviteCard = <section className={`${card} text-center`}>
          <UserPlus className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="mt-2 text-base font-black">{rows.length === 0 && view === 'students' ? 'No students yet' : 'Invite your students'}</h2>
          <p className="mt-1 text-sm text-slate-500">Send the invite to your WhatsApp group. It explains the steps, so students join on their own.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={whatsappUrl(inviteMessage(circleName, inviteLink))} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-sm font-black text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
            <button type="button" onClick={onCopyInvite} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700"><Copy className="h-4 w-4" />Copy link</button>
          </div>
        </section>

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {([['today', 'Today'], ['students', `Students (${rows.length})`]] as const).map(([value, label]) => <button type="button" role="tab" data-tour={value === 'students' ? 'students-tab' : undefined} aria-selected={view === value} key={value} onClick={() => setView(value)} className={`rounded-lg py-2.5 text-sm font-bold transition ${view === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      {view === 'today' && <>
        <TaskCard key={task?.id ?? 'new'} circleId={circleId} today={today} task={task} onSaved={onTaskSaved} onDeleted={onTaskDeleted} />
        <UpcomingTasks circleId={circleId} today={today} />

        {rows.length === 0 ? inviteCard : <section className={card}>
          <h2 className="text-sm font-black">Today at a glance</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            <Stat label="Checked in" value={done.length} tone="text-emerald-600 dark:text-emerald-400" onClick={() => setView('students')} />
            <Stat label="Missed" value={missed.length} tone="text-slate-600 dark:text-slate-300" onClick={() => setView('students')} />
            <Stat label="Not yet" value={notDone.length} tone="text-amber-600 dark:text-amber-400" onClick={() => setView('students')} />
            <Stat label="Quiet 2+ days" value={quiet.length} tone="text-rose-600 dark:text-rose-400" onClick={() => setView('students')} />
          </div>
          {task && notDone.length > 0 && <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={() => void nudge(notDone.map((row) => row.user_id))} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950"><BellRing className="h-4 w-4" />Nudge {notDone.length} who haven&apos;t checked in</button>
            <a href={whatsappUrl(`Reminder for ${circleName}: today's task is "${task.title}". Please check in on GoalYaar once it's done.`)} target="_blank" rel="noreferrer" aria-label="Send reminder on WhatsApp" className="grid w-12 place-items-center rounded-xl bg-emerald-500 text-white"><MessageCircle className="h-5 w-5" /></a>
          </div>}
          {!task && <p className="mt-4 text-center text-xs text-slate-500">Set today&apos;s task above to start tracking.</p>}
        </section>}
      </>}

      {view === 'students' && rows.length === 0 && inviteCard}
      {view === 'students' && rows.length > 0 && <StudentList rows={rows} now={now} hasTask={!!task} circleId={circleId} onNudge={nudge} onChanged={onChanged} flash={flash} />}
    </div>
  )
}

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl bg-slate-50 py-3 transition hover:bg-slate-100 dark:bg-[#07101f] dark:hover:bg-slate-800">
    <span className={`block text-2xl font-black ${tone}`}>{value}</span>
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
        <h2 className="mt-1 text-lg font-black leading-snug">{task.title}</h2>
        {task.details && <ClampedText text={task.details} className="mt-1 text-sm text-slate-600 dark:text-slate-300" />}
      </div>
      <button type="button" onClick={() => setEditing(true)} aria-label="Edit task" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Pencil className="h-4 w-4" /></button>
    </div>
    <AttachmentList attachments={task.attachments ?? []} isAdmin />
  </section>

  return <section data-tour={forToday ? 'task' : undefined} className={card}>
    <label htmlFor={`task-title-${today}`} className="block text-sm font-black">{forToday ? (task ? 'Edit today’s task' : 'Set today’s task') : (task ? `Edit task for ${dayLabel}` : `Plan a task for ${dayLabel}`)}</label>
    <p className="mt-0.5 text-xs text-slate-500">{forToday ? 'Students get a notification and check in against it.' : 'Students see it and get a notification that morning at 6 AM.'}</p>
    <input id={`task-title-${today}`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="e.g. Write 2 GS2 answers + revise Polity ch. 5" className={`${field} mt-3 font-semibold`} />
    <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} placeholder="Details or instructions (optional)" className={`${field} mt-2 max-h-72 min-h-[5rem] resize-none [field-sizing:content]`} />
    <div className="mt-2"><AttachmentPicker files={files} existing={kept} onFilesChange={setFiles} onRemoveExisting={(path) => setKept((list) => list.filter((file) => file.path !== path))} onExistingChange={setKept} onError={setError} /></div>
    {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
    <div className="mt-3 flex gap-2">
      {(task || !forToday) && <button type="button" onClick={() => { if (!task) { onDeleted(); return } setEditing(false); setTitle(task.title); setDetails(task.details ?? ''); setKept(task.attachments ?? []); setFiles([]) }} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700">Cancel</button>}
      <button type="button" onClick={() => void save()} disabled={saving} className="flex-[2] rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : task ? 'Save changes' : forToday ? 'Post task' : 'Schedule task'}</button>
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
      <span><span className="block text-base font-black">Plan ahead</span><span className="block text-sm text-slate-600 dark:text-slate-300">{planned ? `${planned} of the next 7 days planned` : 'Set tasks for the coming week in one go'}</span></span>
      <ChevronDown className={`h-5 w-5 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="mt-3 space-y-2">{days.map((day) => {
      const existing = tasks.find((item) => item.task_date === day) ?? null
      if (editingDay === day) return <TaskCard key={`${day}-${existing?.id ?? 'new'}`} circleId={circleId} today={day} task={existing} dayLabel={dayName(day, today)} startOpen
        onSaved={(saved) => { setTasks((list) => [...list.filter((item) => item.task_date !== day), saved].sort((a, b) => a.task_date.localeCompare(b.task_date))); setEditingDay(null) }}
        onDeleted={() => { setTasks((list) => list.filter((item) => item.task_date !== day)); setEditingDay(null) }} />
      return <button type="button" key={day} onClick={() => setEditingDay(day)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-3 text-left transition hover:border-amber-500 dark:border-slate-700">
        <span className="w-24 shrink-0 text-sm font-black capitalize">{dayName(day, today)}</span>
        <span className={`min-w-0 flex-1 truncate text-sm ${existing ? 'font-semibold' : 'text-slate-500'}`}>{existing ? existing.title : '+ Add task'}</span>
        {existing && <Pencil className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
    })}</div>}
  </section>
}

function StudentList({ rows, now, hasTask, circleId, onNudge, onChanged, flash }: {
  rows: DashboardRow[]; now: number; hasTask: boolean; circleId: string
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
      <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sort students" className="shrink-0 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold dark:border-slate-700 dark:bg-[#101b2d]">
        <option value="last">Last check-in</option>
        <option value="name">Name</option>
        <option value="newest">Newest</option>
      </select>
    </div>

    {visible.length === 0 && <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No students match.</p>}

    <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700/70 dark:bg-[#101b2d]">
      {visible.map((row) => {
        const quiet = isQuiet(row, now)
        const expanded = open === row.user_id
        return <li key={row.user_id}>
          <button type="button" onClick={() => setOpen(expanded ? null : row.user_id)} aria-expanded={expanded} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100 text-sm font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {row.avatar_url ? <Image src={row.avatar_url} alt="" width={40} height={40} unoptimized className="h-10 w-10 object-cover" /> : displayName(row).charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{displayName(row)}</span>
              <span className="block text-xs text-slate-500">Last check-in {timeAgo(row.last_checkin_at)} · {row.days_done_7} of {row.tasks_set_7 || 0} tasks this week</span>
            </span>
            <StatusPill status={row.today_status} quiet={quiet} minutes={minutesOf(row)} />
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && <div className="space-y-3 px-4 pb-4">
            {row.today_note && <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-[#07101f]">“{row.today_note}”</p>}
            {row.today_media_url && (row.today_media_type === 'video'
              ? <video src={row.today_media_url} controls playsInline className="max-h-56 w-full rounded-xl bg-slate-950 object-contain" />
              : <div className="relative h-48 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950"><Image src={row.today_media_url} alt={`${displayName(row)}'s proof`} fill unoptimized className="object-contain" /></div>)}
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <button type="button" onClick={() => void onNudge([row.user_id])} disabled={!hasTask && !quiet} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50"><BellRing className="h-4 w-4" />Nudge</button>
              <a href={whatsappUrl(`Hi ${displayName(row).split(' ')[0]}, just checking in. How is your preparation going today?`)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-black text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              <button type="button" onClick={() => void remove(row)} aria-label={`Remove ${displayName(row)}`} className="grid w-10 place-items-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-500 dark:border-slate-700"><UserMinus className="h-4 w-4" /></button>
            </div>
          </div>}
        </li>
      })}
    </ul>
  </section>
}

function StatusPill({ status, quiet, minutes }: { status: DashboardRow['today_status']; quiet: boolean; minutes: number | null }) {
  const time = minutes ? ` · ${minutes}m` : ''
  if (status === 'done') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Done{time}</span>
  if (status === 'partial') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-700 dark:text-sky-300"><Clock3 className="h-3.5 w-3.5" />Partly{time}</span>
  if (status === 'missed') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-300"><XCircle className="h-3.5 w-3.5" />Missed</span>
  if (quiet) return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-700 dark:text-rose-300"><Moon className="h-3.5 w-3.5" />Quiet</span>
  return <span className="inline-flex shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">Not yet</span>
}
