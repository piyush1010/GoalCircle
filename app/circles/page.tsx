'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'

type Category = 'all' | 'work' | 'fitness' | 'learning' | 'habits'
interface CircleRow { id: string; owner_id: string; name: string; description: string | null; category: Exclude<Category, 'all'>; emoji: string; created_at: string }
interface CircleView extends CircleRow { memberCount: number; joined: boolean; owned: boolean }
const categories: Array<{ id: Category; label: string; emoji: string }> = [
  { id: 'all', label: 'All', emoji: '🌐' }, { id: 'work', label: 'Deep Work', emoji: '💻' },
  { id: 'fitness', label: 'Fitness', emoji: '🏃' }, { id: 'learning', label: 'Learning', emoji: '📚' },
  { id: 'habits', label: 'Daily Habits', emoji: '💧' },
]

export default function CirclesPage() {
  const router = useRouter()
  const [circles, setCircles] = useState<CircleView[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'my' | 'discover'>('my')
  const [category, setCategory] = useState<Category>('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🎯')
  const [newCategory, setNewCategory] = useState<Exclude<Category, 'all'>>('habits')
  const [description, setDescription] = useState('')

  const loadCircles = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/circles'); return }
    const uid = session.user.id; setUserId(uid)
    const [circleResult, membershipResult] = await Promise.all([
      supabase.from('circles').select('id,owner_id,name,description,category,emoji,created_at').order('created_at', { ascending: false }),
      supabase.from('circle_memberships').select('circle_id,user_id'),
    ])
    if (circleResult.error || membershipResult.error) { setError('Circles could not be loaded. Please try again.'); setLoading(false); return }
    const memberships = (membershipResult.data || []) as Array<{ circle_id: string; user_id: string }>
    setCircles(((circleResult.data || []) as CircleRow[]).map((circle) => ({ ...circle, owned: circle.owner_id === uid, joined: circle.owner_id === uid || memberships.some((m) => m.circle_id === circle.id && m.user_id === uid), memberCount: new Set([circle.owner_id, ...memberships.filter((m) => m.circle_id === circle.id).map((m) => m.user_id)]).size })))
    setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadCircles) }, [loadCircles])
  const displayed = useMemo(() => circles.filter((circle) => (tab === 'discover' || circle.joined) && (category === 'all' || circle.category === category)), [category, circles, tab])

  const toggleMembership = async (circle: CircleView) => {
    if (!userId || circle.owned) return
    setBusyId(circle.id); setError(null)
    const result = circle.joined
      ? await supabase.from('circle_memberships').delete().eq('circle_id', circle.id).eq('user_id', userId)
      : await supabase.from('circle_memberships').insert({ circle_id: circle.id, user_id: userId, role: 'member' })
    if (result.error) setError('Your membership change could not be saved.')
    else setCircles((items) => items.map((item) => item.id === circle.id ? { ...item, joined: !circle.joined, memberCount: Math.max(1, item.memberCount + (circle.joined ? -1 : 1)) } : item))
    setBusyId(null)
  }

  const createCircle = async (event: React.FormEvent) => {
    event.preventDefault(); if (!userId || !name.trim()) return
    setBusyId('create'); setError(null)
    const { data, error: createError } = await supabase.from('circles').insert({ owner_id: userId, name: name.trim(), description: description.trim() || null, category: newCategory, emoji: emoji.trim() || '🎯', member_count: 1 }).select('id,owner_id,name,description,category,emoji,created_at').single()
    if (createError || !data) { setError(createError?.message || 'The circle could not be created.'); setBusyId(null); return }
    const { error: membershipError } = await supabase.from('circle_memberships').insert({ circle_id: data.id, user_id: userId, role: 'owner' })
    if (membershipError) setError('The circle was created, but its membership record needs repair.')
    setCircles((items) => [{ ...(data as CircleRow), memberCount: 1, joined: true, owned: true }, ...items])
    setName(''); setDescription(''); setEmoji('🎯'); setShowCreate(false); setTab('my'); setBusyId(null)
  }

  return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-5">
    <header className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800"><div><h1 className="text-xl font-black">⭕ Circles</h1><p className="text-[11px] text-slate-500">Small groups for shared accountability</p></div><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950"><Plus className="h-4 w-4" />Create</button></header>
    <div className="mb-3 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"><button onClick={() => setTab('my')} className={`rounded-lg py-2 text-xs font-bold ${tab === 'my' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>My circles ({circles.filter((c) => c.joined).length})</button><button onClick={() => setTab('discover')} className={`rounded-lg py-2 text-xs font-bold ${tab === 'discover' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Discover</button></div>
    <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">{categories.map((item) => <button key={item.id} onClick={() => setCategory(item.id)} className={`shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold ${category === item.id ? 'border-amber-500 bg-amber-500/10 text-amber-600' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-[#101b2d]'}`}>{item.emoji} {item.label}</button>)}</div>
    {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
    <div className="space-y-3">
      {loading && [1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />)}
      {!loading && displayed.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><Users className="mx-auto mb-3 h-8 w-8 text-amber-500" /><h2 className="font-black">{tab === 'my' ? 'No circles joined yet' : 'No circles to discover yet'}</h2><p className="mt-1 text-xs text-slate-500">{tab === 'my' ? 'Discover a group or create the first one.' : 'Create the first real accountability circle.'}</p></div>}
      {displayed.map((circle) => <article key={circle.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-[#101b2d]"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-xl">{circle.emoji}</div><div className="min-w-0"><h2 className="truncate text-sm font-black">{circle.name}</h2><p className="mt-0.5 text-[10px] font-bold text-slate-400">{categories.find((c) => c.id === circle.category)?.label} · {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}</p></div></div><button onClick={() => void toggleMembership(circle)} disabled={circle.owned || busyId === circle.id} className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-black disabled:opacity-60 ${circle.joined ? 'border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-amber-500 text-slate-950'}`}>{circle.owned ? 'Owner' : busyId === circle.id ? 'Saving…' : circle.joined ? 'Joined ✓' : '+ Join'}</button></div>{circle.description && <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{circle.description}</p>}</article>)}
    </div>
    {showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#101b2d]"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">Create a circle</h2><button onClick={() => setShowCreate(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={createCircle} className="space-y-3"><label className="block text-[10px] font-black uppercase text-slate-500">Name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="UPSC daily sprints" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold normal-case dark:border-slate-700 dark:bg-[#07101f]" /></label><div className="grid grid-cols-[80px_1fr] gap-2"><label className="text-[10px] font-black uppercase text-slate-500">Icon<input maxLength={4} value={emoji} onChange={(e) => setEmoji(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-sm dark:border-slate-700 dark:bg-[#07101f]" /></label><label className="text-[10px] font-black uppercase text-slate-500">Category<select value={newCategory} onChange={(e) => setNewCategory(e.target.value as Exclude<Category, 'all'>)} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm normal-case dark:border-slate-700 dark:bg-[#07101f]">{categories.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label></div><label className="block text-[10px] font-black uppercase text-slate-500">Description<textarea rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will members accomplish together?" className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm normal-case dark:border-slate-700 dark:bg-[#07101f]" /></label><button disabled={busyId === 'create'} className="w-full rounded-xl bg-amber-500 py-3 text-sm font-black text-slate-950 disabled:opacity-60">{busyId === 'create' ? 'Creating…' : 'Create circle'}</button></form></div></div>}
  </main>
}
