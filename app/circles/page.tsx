'use client'

import { confirmAction } from '@/lib/confirm'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, BriefcaseBusiness, ChevronRight, Dumbbell, Globe2, LockKeyhole, LogOut, MoreHorizontal, Plus, Repeat2, Target, Trash2, Users, X, type LucideIcon } from 'lucide-react'
import { EXAMS, examLabel } from '@/lib/exams'
import GoalieMessage from '@/components/GoalieMessage'
import { supabase } from '@/utils/supabase'
import CircleChallenges from '@/components/CircleChallenges'

type Category = 'all' | 'work' | 'fitness' | 'learning' | 'habits'
interface CircleRow { id: string; owner_id: string; name: string; description: string | null; category: Exclude<Category, 'all'>; emoji: string; created_at: string; visibility: 'public' | 'private'; exam: string | null }
interface CircleView extends CircleRow { memberCount: number; joined: boolean; owned: boolean }
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
  const [name, setName] = useState('')
  const [newCategory, setNewCategory] = useState<Exclude<Category, 'all'>>('habits')
  const [description, setDescription] = useState('')
  const [newVisibility, setNewVisibility] = useState<'private' | 'public'>('private')
  const [newExam, setNewExam] = useState('')

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
    if (circleResult.error || membershipResult.error) { setError('Circles could not be loaded. Please try again.'); setLoading(false); return }
    const memberships = (membershipResult.data || []) as Array<{ circle_id: string; user_id: string }>
    const next = ((circleResult.data || []) as CircleRow[]).map((circle) => ({ ...circle, owned: circle.owner_id === uid, joined: circle.owner_id === uid || memberships.some((m) => m.circle_id === circle.id && m.user_id === uid), memberCount: new Set([circle.owner_id, ...memberships.filter((m) => m.circle_id === circle.id).map((m) => m.user_id)]).size }))
    setCircles(next)
    try { window.localStorage.setItem(`goalcircle-circles-${uid}`, JSON.stringify(next.filter((circle) => circle.joined).slice(0, 30))) } catch { /* storage full */ }
    setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadCircles) }, [loadCircles])
  // Discover only lists public circles. Private batches are reached by invite link.
  const publicCircles = useMemo(() => circles.filter((circle) => circle.visibility === 'public'), [circles])
  const displayed = useMemo(() => tab === 'discover' ? publicCircles.filter((circle) => category === 'all' || circle.category === category) : circles.filter((circle) => circle.joined), [category, circles, publicCircles, tab])

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
    if (deleteError || !deleted?.length) setError(deleteError ? `The circle could not be deleted: ${deleteError.message}` : 'The circle could not be deleted. Only the owner can delete it.')
    else setCircles((items) => items.filter((item) => item.id !== circle.id))
    setBusyId(null)
  }

  const createCircle = async (event: React.FormEvent) => {
    event.preventDefault(); if (!userId || !name.trim()) return
    setBusyId('create'); setError(null)
    const { data, error: createError } = await supabase.from('circles').insert({ owner_id: userId, name: name.trim(), description: description.trim() || null, category: newVisibility === 'private' ? 'learning' : newCategory, emoji: 'circle', member_count: 1, visibility: newVisibility, exam: newExam || null }).select('id,owner_id,name,description,category,emoji,created_at,visibility,exam').single()
    if (createError || !data) { setError(createError?.message || 'The circle could not be created.'); setBusyId(null); return }
    const { error: membershipError } = await supabase.from('circle_memberships').insert({ circle_id: data.id, user_id: userId, role: 'owner' })
    if (membershipError) setError('The circle was created, but its membership record needs repair.')
    setCircles((items) => [{ ...(data as CircleRow), memberCount: 1, joined: true, owned: true }, ...items])
    setName(''); setDescription(''); setNewExam(''); setShowCreate(false); setBusyId(null)
    router.push(`/circles/${data.id}`)
  }

  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800"><div><h1 className="text-xl font-bold">Circles</h1><p className="text-[11px] text-slate-500">Small groups for shared accountability</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950"><Plus className="h-4 w-4" />Create</button></header>
    {publicCircles.length > 0 && <div className="mb-3 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"><button onClick={() => setTab('my')} className={`rounded-lg py-2 text-xs font-bold ${tab === 'my' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>My circles ({circles.filter((c) => c.joined).length})</button><button onClick={() => setTab('discover')} className={`rounded-lg py-2 text-xs font-bold ${tab === 'discover' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Discover</button></div>}
    {tab === 'discover' && <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold ${category === item.id ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-[#101b2d]'}`}><CategoryIcon category={item.id} />{item.label}</button>)}</div>}
    {!loading && tab === 'my' && userId && circles.some((circle) => circle.joined && circle.visibility !== 'private') && <CircleChallenges userId={userId} circles={circles.filter((circle) => circle.joined).map((circle) => ({ id: circle.id, name: circle.name }))} />}
    {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
    <div className="space-y-3">
      {loading && [1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />)}
      {!loading && displayed.length === 0 && <GoalieMessage title={tab === 'my' ? 'No circles yet' : 'No circles to discover yet'} message={tab === 'my' ? 'Got an invite link from your mentor? Open it to join. Mentor? Create a private batch for your students.' : 'Create the first accountability circle.'} actionLabel="Create a circle" onAction={() => setShowCreate(true)} />}
      {displayed.map((circle) => <article key={circle.id} className="relative rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#101b2d]"><Link href={`/circles/${circle.id}`} aria-label={`Open ${circle.name}`} className="absolute inset-0 rounded-3xl" /><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><CategoryIcon category={circle.category} className="h-5 w-5" /></div><div className="min-w-0"><Link href={`/circles/${circle.id}`} className="group flex items-center gap-1"><h2 className="truncate text-sm font-bold group-hover:text-amber-600">{circle.name}</h2><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></Link><p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-400">{circle.visibility === 'private' && <LockKeyhole className="h-3 w-3" />}{examLabel(circle.exam) || categories.find((c) => c.id === circle.category)?.label} · {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</p></div></div><div className="relative z-10 flex shrink-0 gap-1.5">{!circle.owned && !circle.joined
  ? <button onClick={() => void toggleMembership(circle)} disabled={busyId === circle.id} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 disabled:opacity-60">{busyId === circle.id ? 'Saving…' : 'Join'}</button>
  : <div className="relative">
    {/* Leave and Delete live behind a menu so they can't be tapped by accident. */}
    <button type="button" onClick={() => setMenuFor(menuFor === circle.id ? null : circle.id)} aria-label={`More options for ${circle.name}`} aria-expanded={menuFor === circle.id} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><MoreHorizontal className="h-4 w-4" /></button>
    {menuFor === circle.id && <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuFor(null)} className="fixed inset-0 z-10 cursor-default" />}
    {menuFor === circle.id && <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#101b2d]">
      {circle.owned
        ? <button type="button" onClick={() => { setMenuFor(null); void deleteCircle(circle) }} disabled={busyId === circle.id} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><Trash2 className="h-4 w-4" />Delete circle</button>
        : <button type="button" onClick={() => { setMenuFor(null); void toggleMembership(circle) }} disabled={busyId === circle.id} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"><LogOut className="h-4 w-4" />Leave circle</button>}
    </div>}
  </div>}</div></div>{circle.description && <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{circle.description}</p>}</article>)}
    </div>
    {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#101b2d]"><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Create a circle</h2><button onClick={() => setShowCreate(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={createCircle} className="space-y-3"><label className="block text-xs font-bold uppercase text-slate-500">Name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="UPSC daily sprints" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold normal-case dark:border-slate-700 dark:bg-[#07101f]" /></label><div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Who can join">{([['private', 'Private batch', 'Invite link only', LockKeyhole], ['public', 'Public group', 'Anyone can join', Globe2]] as const).map(([value, label, hint, Icon]) => <button type="button" role="radio" aria-checked={newVisibility === value} key={value} onClick={() => setNewVisibility(value)} className={`rounded-2xl border p-3 text-left ${newVisibility === value ? 'border-amber-500 bg-amber-500/10' : 'border-slate-200 dark:border-slate-700'}`}><Icon className={`mb-1 h-4 w-4 ${newVisibility === value ? 'text-amber-500' : 'text-slate-400'}`} /><span className="block text-sm font-bold">{label}</span><span className="block text-[11px] text-slate-500">{hint}</span></button>)}</div>{newVisibility === 'public' && <label className="block text-xs font-bold uppercase text-slate-500">Category<select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Exclude<Category, 'all'>)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm normal-case dark:border-slate-700 dark:bg-[#07101f]">{categories.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>}<label className="block text-xs font-bold uppercase text-slate-500">Exam<select value={newExam} onChange={(e) => setNewExam(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm normal-case dark:border-slate-700 dark:bg-[#07101f]"><option value="">No exam</option>{EXAMS.map((exam) => <option key={exam.id} value={exam.id}>{exam.label}</option>)}</select></label><label className="block text-xs font-bold uppercase text-slate-500">Description <span className="font-semibold normal-case text-slate-400">(optional)</span><textarea rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={newVisibility === 'private' ? 'e.g. Daily answer writing for Mains 2027' : 'What will members accomplish together?'} className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case dark:border-slate-700 dark:bg-[#07101f]" /></label><button disabled={busyId === 'create'} className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 disabled:opacity-60">{busyId === 'create' ? 'Creating…' : 'Create circle'}</button></form></div></div>}
  </main>
}
