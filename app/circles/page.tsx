'use client'

import { confirmAction } from '@/lib/confirm'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, BriefcaseBusiness, ChevronRight, Dumbbell, Globe2, LockKeyhole, LogOut, MoreHorizontal, Plus, Repeat2, Search, Target, Trash2, X, type LucideIcon } from 'lucide-react'
import { EXAMS, examLabel } from '@/lib/exams'
import EmptyState from '@/components/EmptyState'
import CircleAvatar from '@/components/CircleAvatar'
import { localDateString } from '@/lib/exams'
import { supabase } from '@/utils/supabase'
import CircleChallenges from '@/components/CircleChallenges'
import ChallengeCard from '@/components/communities/ChallengeCard'
import { describe, todayLine, type CommunityRow } from '@/lib/communities'
import HelpButton from '@/components/HelpButton'

type Category = 'all' | 'work' | 'fitness' | 'learning' | 'habits'
interface CircleRow { id: string; owner_id: string; name: string; description: string | null; category: Exclude<Category, 'all'>; emoji: string; created_at: string; visibility: 'public' | 'private'; exam: string | null }
type TodayStatus = 'done' | 'partial' | 'missed' | null
interface CircleToday { task: string | null; mine: TodayStatus; checkedIn: number; members?: number }
interface CircleView extends CircleRow { memberCount: number; joined: boolean; owned: boolean; avatarUrl?: string | null; today?: CircleToday }
const categories: Array<{ id: Category; label: string; icon: LucideIcon }> = [
  { id: 'all', label: 'All', icon: Globe2 }, { id: 'work', label: 'Deep Work', icon: BriefcaseBusiness },
  { id: 'fitness', label: 'Fitness', icon: Dumbbell }, { id: 'learning', label: 'Learning', icon: BookOpen },
  { id: 'habits', label: 'Daily Habits', icon: Repeat2 },
]

function CategoryIcon({ category, className = 'h-3.5 w-3.5' }: { category: Category; className?: string }) {
  const Icon = categories.find((item) => item.id === category)?.icon || Target
  return <Icon className={className} />
}

export default function CirclesPage() {
  const router = useRouter()
  const [circles, setCircles] = useState<CircleView[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'my' | 'discover'>('my')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [category, setCategory] = useState<Category>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  // Today's first-day screen links here with ?create=1 for coaches.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('create') !== '1') return
    const timer = window.setTimeout(() => setShowCreate(true), 0)
    window.history.replaceState(null, '', '/circles')
    return () => window.clearTimeout(timer)
  }, [])
  const [name, setName] = useState('')
  const [newCategory, setNewCategory] = useState<Exclude<Category, 'all'>>('habits')
  const [description, setDescription] = useState('')
  const [newVisibility, setNewVisibility] = useState<'private' | 'public'>('private')
  const [newExam, setNewExam] = useState('')
  const [communities, setCommunities] = useState<CommunityRow[] | null>(null)
  const [query, setQuery] = useState('')
  const matches = useCallback((text: string) => !query.trim() || text.toLowerCase().includes(query.trim().toLowerCase()), [query])
  useEffect(() => {
    // Communities arrive with the "communities" database update. Until then this part simply stays hidden.
    void supabase.rpc('community_overview').then(({ data, error: e }) => setCommunities(e ? [] : (data || []) as CommunityRow[]))
  }, [])
  const mine = useMemo(() => (communities ?? []).filter((c) => c.member).sort((a, b) => Number(b.key.startsWith('exam:')) - Number(a.key.startsWith('exam:')) || b.members - a.members), [communities])
  const explore = useMemo(() => (communities ?? []).filter((c) => !c.member && !c.key.startsWith('exam:')), [communities])
  const updateRow = (next: CommunityRow) => setCommunities((rows) => (rows ?? []).map((row) => row.key === next.key ? next : row))

  // Photos and today's progress load after the list, so the list itself never waits on them.
  const loadExtras = useCallback(async (uid: string, list: CircleView[]) => {
    const joinedIds = list.filter((circle) => circle.joined).map((circle) => circle.id)
    const [avatars, tasks] = await Promise.all([
      supabase.from('circles').select('id,avatar_url').in('id', list.map((circle) => circle.id)),
      joinedIds.length ? supabase.from('circle_tasks').select('id,circle_id,title').in('circle_id', joinedIds).eq('task_date', localDateString()) : Promise.resolve({ data: [], error: null }),
    ])
    const taskRows = (tasks.data || []) as Array<{ id: string; circle_id: string; title: string }>
    const { data: checkins } = taskRows.length
      ? await supabase.from('circle_task_checkins').select('task_id,user_id,status').in('task_id', taskRows.map((task) => task.id))
      : { data: [] as Array<{ task_id: string; user_id: string; status: string }> }
    // Students can't read classmates' rows; the count comes from a small summary instead.
    const studentCircles = list.filter((circle) => circle.joined && !circle.owned && taskRows.some((task) => task.circle_id === circle.id))
    const counts = new Map<string, { checked: number; members: number }>()
    await Promise.all(studentCircles.map(async (circle) => {
      const { data } = await supabase.rpc('circle_today_progress', { target_circle: circle.id, on_date: localDateString() })
      const row = Array.isArray(data) ? data[0] as { checked_in: number; members: number } | undefined : undefined
      if (row) counts.set(circle.id, { checked: row.checked_in, members: row.members })
    }))
    const avatarById = new Map(((avatars.error ? [] : avatars.data) || []).map((row) => [row.id as string, (row as { avatar_url?: string | null }).avatar_url ?? null]))
    const rows = (checkins || []) as Array<{ task_id: string; user_id: string; status: string }>
    setCircles((items) => items.map((circle) => {
      const task = taskRows.find((row) => row.circle_id === circle.id)
      const forTask = task ? rows.filter((row) => row.task_id === task.id) : []
      return {
        ...circle,
        avatarUrl: avatarById.get(circle.id) ?? circle.avatarUrl ?? null,
        today: circle.joined ? {
          task: task?.title ?? null,
          mine: (forTask.find((row) => row.user_id === uid)?.status as TodayStatus) ?? null,
          checkedIn: counts.get(circle.id)?.checked ?? forTask.filter((row) => row.user_id !== uid && row.status !== 'missed').length,
          members: counts.get(circle.id)?.members,
        } : undefined,
      }
    }))
  }, [])

  const loadCircles = useCallback(async () => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/circles'); return }
    const uid = session.user.id; setUserId(uid)
    try { const cached = JSON.parse(window.localStorage.getItem(`goalcircle-circles-${uid}`) || 'null'); if (Array.isArray(cached) && cached.length) { setCircles(cached); setLoading(false) } } catch { /* no cache */ }
    const [circleResult, membershipResult] = await Promise.all([
      supabase.from('circles').select('id,owner_id,name,description,category,emoji,created_at,visibility,exam').order('created_at', { ascending: false }),
      supabase.from('circle_memberships').select('circle_id,user_id'),
    ])
    if (circleResult.error || membershipResult.error) { setError('Your batches and groups could not be loaded. Please try again.'); setLoading(false); return }
    const memberships = (membershipResult.data || []) as Array<{ circle_id: string; user_id: string }>
    const next = ((circleResult.data || []) as CircleRow[]).map((circle) => ({ ...circle, owned: circle.owner_id === uid, joined: circle.owner_id === uid || memberships.some((m) => m.circle_id === circle.id && m.user_id === uid), memberCount: new Set([circle.owner_id, ...memberships.filter((m) => m.circle_id === circle.id).map((m) => m.user_id)]).size }))
    setCircles(next)
    void loadExtras(uid, next)
    try { window.localStorage.setItem(`goalcircle-circles-${uid}`, JSON.stringify(next.filter((circle) => circle.joined).slice(0, 30))) } catch { /* storage full */ }
    setLoading(false)
  }, [router, loadExtras])


  useEffect(() => { void Promise.resolve().then(loadCircles) }, [loadCircles])
  // Discover only lists public circles. Private batches are reached by invite link.
  const publicCircles = useMemo(() => circles.filter((circle) => circle.visibility === 'public'), [circles])
  const displayed = useMemo(() => (tab === 'discover' ? publicCircles.filter((circle) => category === 'all' || circle.category === category) : circles.filter((circle) => circle.joined)).filter((circle) => matches(circle.name)), [category, circles, matches, publicCircles, tab])

  const toggleMembership = async (circle: CircleView) => {
    if (!userId || circle.owned) return
    if (circle.joined && !(await confirmAction(`Leave “${circle.name}”? The mentor will be told, and won't see your check-ins any more.`))) return
    setBusyId(circle.id); setError(null)
    const result = circle.joined
      ? await supabase.from('circle_memberships').delete().eq('circle_id', circle.id).eq('user_id', userId)
      : await supabase.from('circle_memberships').insert({ circle_id: circle.id, user_id: userId, role: 'member' })
    if (result.error) setError('Your membership change could not be saved.')
    else setCircles((items) => items.map((item) => item.id === circle.id ? { ...item, joined: !circle.joined, memberCount: Math.max(1, item.memberCount + (circle.joined ? -1 : 1)) } : item))
    setBusyId(null)
  }

  const deleteCircle = async (circle: CircleView) => {
    if (!userId || !circle.owned) return
    if (!(await confirmAction(`Delete “${circle.name}” for every member? This cannot be undone.`))) return
    setBusyId(circle.id); setError(null)
    // .select() returns the deleted row, so a silent "0 rows deleted" shows as an error instead of doing nothing.
    const { data: deleted, error: deleteError } = await supabase.from('circles').delete().eq('id', circle.id).eq('owner_id', userId).select('id')
    if (deleteError || !deleted?.length) setError(deleteError ? 'It could not be deleted. Please try again.' : 'Only the person who started it can delete it.')
    else setCircles((items) => items.filter((item) => item.id !== circle.id))
    setBusyId(null)
  }

  const createCircle = async (event: React.FormEvent) => {
    event.preventDefault(); if (!userId || !name.trim()) return
    setBusyId('create'); setError(null)
    const { data, error: createError } = await supabase.from('circles').insert({ owner_id: userId, name: name.trim(), description: description.trim() || null, category: newVisibility === 'private' ? 'learning' : newCategory, emoji: 'circle', member_count: 1, visibility: newVisibility, exam: newExam || null }).select('id,owner_id,name,description,category,emoji,created_at,visibility,exam').single()
    if (createError || !data) { setError('The group could not be created. Please try again.'); setBusyId(null); return }
    const { error: membershipError } = await supabase.from('circle_memberships').insert({ circle_id: data.id, user_id: userId, role: 'owner' })
    if (membershipError) setError('The group was created, but something went wrong. Please reopen Communities.')
    setCircles((items) => [{ ...(data as CircleRow), memberCount: 1, joined: true, owned: true }, ...items])
    setName(''); setDescription(''); setNewExam(''); setShowCreate(false); setBusyId(null)
    router.push(`/circles/${data.id}`)
  }

  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center justify-between gap-3"><h1 className="text-[26px] font-bold tracking-tight">Communities</h1><div className="flex items-center gap-2"><HelpButton /><Link href="/feed" className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-600">Feed</Link></div></header>
    <div className="relative mb-5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" aria-label="Search communities, batches and groups" placeholder="Search communities, batches and groups" className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-[15px] dark:border-slate-700 dark:bg-slate-900" />
    </div>

    {mine.filter((c) => matches(describe(c.key).name)).length > 0 && <section aria-labelledby="challenges-h" className="mb-6">
      <h2 id="challenges-h" className="text-base font-semibold">This week&apos;s challenges</h2>
      <p className="mb-3 text-sm text-slate-500">Your progress updates as you tick things off.</p>
      <div className="space-y-2.5">{mine.filter((c) => matches(describe(c.key).name)).map((row) => <ChallengeCard key={row.key} row={row} onChange={updateRow} />)}</div>
    </section>}

    {mine.filter((c) => matches(describe(c.key).name)).length > 0 && <section aria-labelledby="mine-h" className="mb-6">
      <h2 id="mine-h" className="mb-3 text-base font-semibold">Your communities</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {mine.filter((c) => matches(describe(c.key).name)).map((row) => <CommunityLink key={row.key} row={row} line={todayLine(row)} />)}
      </ul>
    </section>}

    <section aria-labelledby="groups-h" className="mb-6">
    <div className="mb-3 flex items-center justify-between gap-3"><h2 id="groups-h" className="whitespace-nowrap text-base font-semibold">Batches and groups</h2><div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm font-semibold"><Link href="/circles/join" className="text-slate-600 dark:text-slate-300">Join with a code</Link><Link href="/circles/new" className="inline-flex items-center gap-1 text-slate-900 dark:text-white"><Plus className="h-4 w-4" />Start</Link></div></div>
    {publicCircles.length > 0 && <div className="mb-3 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"><button onClick={() => setTab('my')} className={`rounded-lg py-2 text-sm font-semibold ${tab === 'my' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Yours ({circles.filter((c) => c.joined).length})</button><button onClick={() => setTab('discover')} className={`rounded-lg py-2 text-sm font-semibold ${tab === 'discover' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Open groups</button></div>}
    {tab === 'discover' && <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold ${category === item.id ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-[#101B2D]'}`}><CategoryIcon category={item.id} />{item.label}</button>)}</div>}
    {!loading && tab === 'my' && userId && circles.some((circle) => circle.joined && circle.visibility !== 'private') && <CircleChallenges userId={userId} circles={circles.filter((circle) => circle.joined).map((circle) => ({ id: circle.id, name: circle.name }))} />}
    {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
    <div className="space-y-3">
      {loading && [1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />)}
      {!loading && displayed.length === 0 && <EmptyState title={query.trim() ? 'Nothing matches your search' : tab === 'my' ? 'No batches or groups yet' : 'No open groups yet'} message={tab === 'my' ? 'Got a link or code from your mentor? Use Join with a code. Teaching or training? Start a batch for your students.' : 'Start the first one.'} actionLabel="Start a batch" onAction={() => router.push('/circles/new')} />}
      {displayed.map((circle) => <article key={circle.id} className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#101B2D]"><Link href={`/circles/${circle.id}`} aria-label={`Open ${circle.name}`} className="absolute inset-0 rounded-3xl" /><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><CircleAvatar name={circle.name} url={circle.avatarUrl} size={52} /><div className="min-w-0"><Link href={`/circles/${circle.id}`} className="group flex items-center gap-1"><h2 className="truncate text-base font-bold group-hover:underline">{circle.name}</h2>{circle.owned && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Mentor</span>}<ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></Link><p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">{circle.visibility === 'private' && <LockKeyhole className="h-3 w-3" />}{examLabel(circle.exam) || categories.find((c) => c.id === circle.category)?.label}{', '}{circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</p></div></div><div className="relative z-10 flex shrink-0 gap-1.5">{!circle.owned && !circle.joined
  ? <button onClick={() => void toggleMembership(circle)} disabled={busyId === circle.id} className="inline-flex items-center gap-1 rounded-xl bg-slate-900 dark:bg-slate-50 px-3 py-1.5 text-xs font-bold text-white dark:text-slate-900 disabled:opacity-60">{busyId === circle.id ? 'Saving…' : 'Join'}</button>
  : <div className="relative">
    {/* Leave and Delete live behind a menu so they can't be tapped by accident. */}
    <button type="button" onClick={() => setMenuFor(menuFor === circle.id ? null : circle.id)} aria-label={`More options for ${circle.name}`} aria-expanded={menuFor === circle.id} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4" /></button>
    {menuFor === circle.id && <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuFor(null)} className="fixed inset-0 z-10 cursor-default" />}
    {menuFor === circle.id && <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#101B2D]">
      {circle.owned
        ? <button type="button" onClick={() => { setMenuFor(null); void deleteCircle(circle) }} disabled={busyId === circle.id} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" />Delete</button>
        : <button type="button" onClick={() => { setMenuFor(null); void toggleMembership(circle) }} disabled={busyId === circle.id} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><LogOut className="h-4 w-4" />Leave</button>}
    </div>}
  </div>}</div></div>{circle.description && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{circle.description}</p>}
      {circle.today && <TodayLine circle={circle} />}</article>)}
      {!loading && tab === 'my' && displayed.length > 0 && displayed.length < 3 && <div className="rounded-3xl border border-dashed border-slate-300 p-5 text-sm leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {circles.some((circle) => circle.owned)
          ? <>
            {/* Mentors: how to fill their batch. */}
            <p className="font-semibold text-slate-800 dark:text-slate-100">Add your students</p>
            <p className="mt-1">Open your batch and tap <span className="font-semibold">Invite</span> to share the link in your WhatsApp group. Students join in one tap.</p>
          </>
          : <>
            {/* Students: how to join, and how a teacher would start. */}
            <p className="font-semibold text-slate-800 dark:text-slate-100">Joining another batch?</p>
            <p className="mt-1">Open the invite link your mentor shared on WhatsApp. You&apos;ll be added in one tap.</p>
            <p className="mt-4 font-semibold text-slate-800 dark:text-slate-100">Teaching a batch?</p>
            <p className="mt-1">Create a private batch, post one task a day, and see who checked in. <Link href="/circles/new" className="font-semibold text-slate-900 underline underline-offset-2 dark:text-white">Start a batch</Link></p>
          </>}
      </div>}
    </div>
    </section>

    {explore.filter((c) => matches(describe(c.key).name)).length > 0 && <section aria-labelledby="explore-h" className="mb-6">
      <h2 id="explore-h" className="mb-3 text-base font-semibold">Explore more</h2>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {explore.filter((c) => matches(describe(c.key).name)).map((row) => <CommunityLink key={row.key} row={row} line={row.members > 0 ? `${describe(row.key).line}. ${row.members.toLocaleString('en-IN')} ${row.members === 1 ? 'member' : 'members'}` : describe(row.key).line} />)}
      </ul>
    </section>}
    {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#101B2D]"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Start a group</h2><button onClick={() => setShowCreate(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={createCircle} className="space-y-3"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="UPSC daily sprints" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold dark:border-slate-700 dark:bg-[#07101F]" /></label><div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who can join">{([['private', 'Private batch', 'Invite link only', LockKeyhole], ['public', 'Public group', 'Anyone can join', Globe2]] as const).map(([value, label, hint, Icon]) => <button type="button" role="radio" aria-checked={newVisibility === value} key={value} onClick={() => setNewVisibility(value)} className={`rounded-2xl border p-3 text-left ${newVisibility === value ? 'border-slate-900 ring-1 ring-slate-900 dark:border-white dark:ring-white' : 'border-slate-200 dark:border-slate-700'}`}><Icon className={`mb-1 h-4 w-4 ${newVisibility === value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} /><span className="block text-sm font-bold">{label}</span><span className="block text-[11px] text-slate-500">{hint}</span></button>)}</div>{newVisibility === 'public' && <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Category<select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Exclude<Category, 'all'>)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-[#07101F]">{categories.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}<label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Exam<select value={newExam} onChange={(e) => setNewExam(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-[#07101F]"><option value="">No exam</option>{EXAMS.map((exam) => <option key={exam.id} value={exam.id}>{exam.label}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Description <span className="font-semibold text-slate-400">(optional)</span><textarea rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={newVisibility === 'private' ? 'e.g. Daily answer writing for Mains 2027' : 'What will members accomplish together?'} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-[#07101F]" /></label><button disabled={busyId === 'create'} className="w-full rounded-xl bg-slate-900 dark:bg-slate-50 py-3 text-sm font-bold text-white dark:text-slate-900 disabled:opacity-60">{busyId === 'create' ? 'Creating…' : 'Create group'}</button></form></div></div>}
  </main>
}

/** Today's task on a batch card: progress for mentors, your own status for students. */
function TodayLine({ circle }: { circle: CircleView }) {
  const today = circle.today!
  const students = Math.max(0, circle.memberCount - 1)
  let right: React.ReactNode = null
  if (circle.owned) right = today.task ? <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">{today.checkedIn} of {students} checked in</span> : <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-white">Post task</span>
  else if (today.task) right = today.mine === 'done' || today.mine === 'partial'
    ? <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Checked in</span>
    : today.mine === 'missed'
      ? <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Missed</span>
      : <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white dark:bg-white dark:text-slate-900">Check in</span>
  return <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-slate-500">Today</p>
      <p className="line-clamp-2 text-sm font-semibold">{today.task ?? (circle.owned ? 'No task posted yet' : 'No task from your mentor yet')}</p>
      {!circle.owned && today.task && today.members ? <p className="text-xs text-slate-500">{today.checkedIn} of {today.members} checked in</p> : null}
    </div>
    {right}
  </div>
}

/** A community in a list: its icon or exam name, and what is happening there today. */
function CommunityLink({ row, line }: { row: CommunityRow; line: string }) {
  const d = describe(row.key)
  const Icon = d.icon
  return <li><Link href={`/communities/${encodeURIComponent(row.key)}`} className="flex items-center gap-3 px-4 py-3.5">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{d.short ? <span className="text-[11px] font-bold">{d.short.slice(0, 5)}</span> : <Icon className="h-5 w-5" />}</span>
    <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{d.name}</span><span className="block text-sm text-slate-500">{line}</span></span>
    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
  </Link></li>
}
