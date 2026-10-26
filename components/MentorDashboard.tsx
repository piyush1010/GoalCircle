'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { BellRing, CheckCircle2, ChevronDown, Clock3, Copy, MessageCircle, Moon, Pencil, Search, UserMinus, UserPlus } from 'lucide-react'
import { AttachmentList, AttachmentPicker, removeCircleFiles, uploadCircleFiles, type Attachment } from '@/components/CircleAttachments'
import { supabase } from '@/utils/supabase'

export interface DashboardRow {
  user_id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  joined_at: string
  today_status: 'done' | 'partial' | null
  today_hours: number | null
  today_note: string | null
  today_media_url: string | null
  today_media_type: 'image' | 'video' | null
  last_checkin_at: string | null
  days_done_7: number
  tasks_set_7: number
}

interface Task { id: string; title: string; details: string | null; task_date: string; attachments: Attachment[] }

type Filter = 'all' | 'done' | 'not_done' | 'quiet'
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

export default function MentorDashboard({ circleId, circleName, today, task, rows, inviteLink, onTaskSaved, onChanged, onCopyInvite, flash }: {
  circleId: string; circleName: string; today: string; task: Task | null; rows: DashboardRow[]; inviteLink: string
  onTaskSaved: (task: Task) => void; onChanged: () => void; onCopyInvite: () => void; flash: (text: string) => void
}) {
  const [view, setView] = useState<'today' | 'students'>('today')
  const [now] = useState(() => Date.now())
  const done = rows.filter((row) => row.today_status)
  const notDone = rows.filter((row) => !row.today_status)
  const quiet = rows.filter((row) => isQuiet(row, now))

  const nudge = async (ids: string[]) => {
    if (ids.length === 0) return
    const { data, error } = await supabase.rpc('nudge_circle_members', { target_circle: circleId, member_ids: ids, note: task ? `Reminder: today's task is "${task.title}".` : null })
    if (error) flash('Nudge could not be sent')
    else flash(data === 0 ? 'Already nudged in the last 3 hours' : `Nudge sent to ${data} ${data === 1 ? 'student' : 'students'}`)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {([['today', 'Today'], ['students', `Students (${rows.length})`]] as const).map(([value, label]) => <button type="button" role="tab" data-tour={value === 'students' ? 'students-tab' : undefined} aria-selected={view === value} key={value} onClick={() => setView(value)} className={`rounded-lg py-2.5 text-sm font-bold transition ${view === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500'}`}>{label}</button>)}
      </div>

      {view === 'today' && <>
        <TaskCard circleId={circleId} today={today} task={task} onSaved={onTaskSaved} />

        {rows.length === 0 ? <section className={`${card} text-center`}>
          <UserPlus className="mx-auto h-8 w-8 text-amber-500" />
          <h2 className="mt-2 text-base font-black">Invite your students</h2>
          <p className="mt-1 text-sm text-slate-500">Share the invite link in your WhatsApp group. Students join in one tap.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <a href={whatsappUrl(`Join "${circleName}" on GoalCircle for daily tasks and check-ins: ${inviteLink}`)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-3 text-sm font-black text-white"><MessageCircle className="h-4 w-4" />WhatsApp</a>
            <button type="button" onClick={onCopyInvite} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700"><Copy className="h-4 w-4" />Copy link</button>
          </div>
        </section> : <section className={card}>
          <h2 className="text-sm font-black">Today at a glance</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Done" value={done.length} tone="text-emerald-600 dark:text-emerald-400" onClick={() => setView('students')} />
            <Stat label="Not yet" value={notDone.length} tone="text-amber-600 dark:text-amber-400" onClick={() => setView('students')} />
            <Stat label="Quiet 2+ days" value={quiet.length} tone="text-rose-600 dark:text-rose-400" onClick={() => setView('students')} />
          </div>
          {task && notDone.length > 0 && <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={() => void nudge(notDone.map((row) => row.user_id))} className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950"><BellRing className="h-4 w-4" />Nudge {notDone.length} who haven&apos;t done it</button>
            <a href={whatsappUrl(`Reminder for ${circleName}: today's task is "${task.title}". Please check in on GoalCircle once it's done.`)} target="_blank" rel="noreferrer" aria-label="Send reminder on WhatsApp" className="grid w-12 place-items-center rounded-xl bg-emerald-500 text-white"><MessageCircle className="h-5 w-5" /></a>
          </div>}
          {!task && <p className="mt-4 text-center text-xs text-slate-500">Set today&apos;s task above to start tracking.</p>}
        </section>}
      </>}

      {view === 'students' && <StudentList rows={rows} now={now} hasTask={!!task} circleId={circleId} onNudge={nudge} onChanged={onChanged} flash={flash} />}
    </div>
  )
}

function Stat({ label, value, tone, onClick }: { label: string; value: number; tone: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-2xl bg-slate-50 py-3 transition hover:bg-slate-100 dark:bg-[#07101f] dark:hover:bg-slate-800">
    <span className={`block text-2xl font-black ${tone}`}>{value}</span>
    <span className="block text-[11px] font-semibold text-slate-500">{label}</span>
  </button>
}

function TaskCard({ circleId, today, task, onSaved }: { circleId: string; today: string; task: Task | null; onSaved: (task: Task) => void }) {
  const [editing, setEditing] = useState(!task)
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
  }

  if (!editing && task) return <section data-tour="task" className={card}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Today&apos;s task</p>
        <h2 className="mt-1 text-lg font-black leading-snug">{task.title}</h2>
        {task.details && <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{task.details}</p>}
      </div>
      <button type="button" onClick={() => setEditing(true)} aria-label="Edit task" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 dark:border-slate-700"><Pencil className="h-4 w-4" /></button>
    </div>
    <AttachmentList attachments={task.attachments ?? []} />
  </section>

  return <section data-tour="task" className={card}>
    <label htmlFor="task-title" className="block text-sm font-black">{task ? 'Edit today’s task' : 'Set today’s task'}</label>
    <p className="mt-0.5 text-xs text-slate-500">Students get a notification and check in against it.</p>
    <input id="task-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={140} placeholder="e.g. Write 2 GS2 answers + revise Polity ch. 5" className={`${field} mt-3 font-semibold`} />
    <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={2} maxLength={1000} placeholder="Details or instructions (optional)" className={`${field} mt-2 resize-none`} />
    <div className="mt-2"><AttachmentPicker files={files} existing={kept} onFilesChange={setFiles} onRemoveExisting={(path) => setKept((list) => list.filter((file) => file.path !== path))} onError={setError} /></div>
    {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
    <div className="mt-3 flex gap-2">
      {task && <button type="button" onClick={() => { setEditing(false); setTitle(task.title); setDetails(task.details ?? ''); setKept(task.attachments ?? []); setFiles([]) }} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold dark:border-slate-700">Cancel</button>}
      <button type="button" onClick={() => void save()} disabled={saving} className="flex-[2] rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{saving ? 'Saving…' : task ? 'Save changes' : 'Post task'}</button>
    </div>
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
      .filter((row) => filter === 'all' || (filter === 'done' && row.today_status) || (filter === 'not_done' && !row.today_status) || (filter === 'quiet' && isQuiet(row, now)))
      .sort((a, b) => {
        if (sort === 'name') return displayName(a).localeCompare(displayName(b))
        if (sort === 'newest') return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
        return new Date(b.last_checkin_at ?? 0).getTime() - new Date(a.last_checkin_at ?? 0).getTime()
      })
  }, [filter, now, query, rows, sort])

  const remove = async (row: DashboardRow) => {
    if (!window.confirm(`Remove ${displayName(row)} from this circle?`)) return
    const { error } = await supabase.from('circle_memberships').delete().eq('circle_id', circleId).eq('user_id', row.user_id)
    if (error) flash('Could not remove this student')
    else { flash(`${displayName(row)} removed`); onChanged() }
  }

  const filters: Array<[Filter, string]> = [['all', 'All'], ['done', 'Done today'], ['not_done', 'Not done'], ['quiet', 'Quiet 2+ days']]

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
              <span className="block text-xs text-slate-500">Last check-in {timeAgo(row.last_checkin_at)} · {row.days_done_7}/{row.tasks_set_7 || 0} days</span>
            </span>
            <StatusPill status={row.today_status} quiet={quiet} hours={row.today_hours} />
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

function StatusPill({ status, quiet, hours }: { status: DashboardRow['today_status']; quiet: boolean; hours: number | null }) {
  if (status === 'done') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />Done{hours !== null && ` · ${hours}h`}</span>
  if (status === 'partial') return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/10 px-2 py-1 text-[11px] font-bold text-sky-700 dark:text-sky-300"><Clock3 className="h-3.5 w-3.5" />Partly</span>
  if (quiet) return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300"><Moon className="h-3.5 w-3.5" />Quiet</span>
  return <span className="inline-flex shrink-0 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">Not yet</span>
}
