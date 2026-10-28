'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleUserRound, HeartHandshake, Search, Target, UsersRound } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import ProfileAvatar from '@/components/ProfileAvatar'

type SearchTab = 'all' | 'goals' | 'circles' | 'people'
interface ProfileResult { id: string; full_name: string | null; username: string | null; avatar_url: string | null; bio: string | null }
interface GoalResult { id: string; title: string; category: string | null; current_streak: number | null; user_id: string }
interface CircleResult { id: string; name: string; description: string | null; category: string; member_count: number }

export default function SearchPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<ProfileResult[]>([])
  const [goals, setGoals] = useState<GoalResult[]>([])
  const [circles, setCircles] = useState<CircleResult[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [partnerRequests, setPartnerRequests] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) router.replace('/login?next=/search')
      else setUserId(data.session.user.id)
    })
  }, [router])

  useEffect(() => {
    if (!userId || query.trim().length < 2) return
    const timer = window.setTimeout(async () => {
      setLoading(true); setMessage(null)
      const term = query.trim().replace(/[,%()]/g, ' ')
      const [profileResult, goalResult, circleResult, followResult, partnerResult] = await Promise.all([
        supabase.from('profiles').select('id,full_name,username,avatar_url,bio').or(`full_name.ilike.%${term}%,username.ilike.%${term}%`).neq('id', userId).limit(12),
        supabase.from('goals').select('id,title,category,current_streak,user_id').eq('visibility', 'public').ilike('title', `%${term}%`).limit(12),
        supabase.from('circles').select('id,name,description,category,member_count').eq('visibility', 'public').or(`name.ilike.%${term}%,description.ilike.%${term}%`).limit(12),
        supabase.from('follows').select('following_id').eq('follower_id', userId),
        supabase.from('accountability_partners').select('partner_id').eq('requester_id', userId).in('status', ['pending', 'accepted']),
      ])
      if (profileResult.error || goalResult.error || circleResult.error) setMessage('Search could not be completed. Please retry.')
      setProfiles((profileResult.data || []) as ProfileResult[])
      setGoals((goalResult.data || []) as GoalResult[])
      setCircles((circleResult.data || []) as CircleResult[])
      setFollowing(new Set(((followResult.data || []) as Array<{ following_id: string }>).map((row) => row.following_id)))
      setPartnerRequests(new Set(((partnerResult.data || []) as Array<{ partner_id: string }>).map((row) => row.partner_id)))
      setLoading(false)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [query, userId])

  const resultCount = useMemo(() => activeTab === 'people' ? profiles.length : activeTab === 'goals' ? goals.length : activeTab === 'circles' ? circles.length : profiles.length + goals.length + circles.length, [activeTab, circles.length, goals.length, profiles.length])

  const toggleSupport = async (profileId: string) => {
    if (!userId) return
    const isFollowing = following.has(profileId)
    setFollowing((current) => { const next = new Set(current); if (isFollowing) next.delete(profileId); else next.add(profileId); return next })
    const result = isFollowing
      ? await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', profileId)
      : await supabase.from('follows').insert({ follower_id: userId, following_id: profileId })
    if (result.error) {
      setFollowing((current) => { const next = new Set(current); if (isFollowing) next.add(profileId); else next.delete(profileId); return next })
      setMessage('Support status could not be changed.')
    }
  }

  const requestPartner = async (profile: ProfileResult) => {
    if (!userId || partnerRequests.has(profile.id)) return
    const { error } = await supabase.from('accountability_partners').insert({ requester_id: userId, partner_id: profile.id })
    if (error) { setMessage('Partner invitation could not be sent.'); return }
    setPartnerRequests((current) => new Set(current).add(profile.id))
    setMessage(`Accountability invitation sent to ${profile.full_name || profile.username || 'this member'}.`)
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-4 px-4 pb-28 pt-5">
      <header className="border-b border-slate-200 pb-3 dark:border-slate-800"><h1 className="flex items-center gap-2 text-lg font-bold"><Search className="h-5 w-5 text-amber-500" />Discover</h1><p className="text-[11px] text-slate-500">Find people, public goals and accountability circles</p></header>
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm focus-within:border-amber-500 dark:border-slate-700 dark:bg-[#16181B]"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => { const next = event.target.value; setQuery(next); if (next.trim().length < 2) { setProfiles([]); setGoals([]); setCircles([]) } }} placeholder="Search by name, goal or circle" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <div className="flex gap-1.5 overflow-x-auto pb-1">{(['all', 'people', 'goals', 'circles'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize ${activeTab === tab ? 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-[#16181B]'}`}>{tab}</button>)}</div>
      {message && <p role="status" className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">{message}</p>}
      {query.trim().length < 2 && <div className="rounded-3xl border border-dashed border-slate-300 p-9 text-center dark:border-slate-700"><Search className="mx-auto mb-3 h-8 w-8 text-amber-500" /><h2 className="font-bold">Search GoalYaar</h2><p className="mt-1 text-xs text-slate-500">Enter at least two characters. Results come from real public profiles, goals and circles.</p></div>}
      {loading && <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div>}
      {!loading && query.trim().length >= 2 && resultCount === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-9 text-center dark:border-slate-700"><p className="text-sm font-bold">No matching results</p><p className="mt-1 text-xs text-slate-500">Try a shorter name or a broader goal category.</p></div>}
      {!loading && (activeTab === 'all' || activeTab === 'people') && profiles.length > 0 && <section className="space-y-2"><h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">People</h2>{profiles.map((profile) => <article key={profile.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-[#16181B]"><div className="flex items-center gap-3"><Link href={`/u/${profile.username || profile.id}`}><ProfileAvatar value={profile.avatar_url} name={profile.full_name || profile.username || 'Member'} size={42} className="rounded-full" /></Link><div className="min-w-0 flex-1"><Link href={`/u/${profile.username || profile.id}`} className="block truncate text-sm font-bold">{profile.full_name || 'GoalYaar member'}</Link><p className="truncate text-xs text-slate-500">@{profile.username || 'member'}{profile.bio ? ` · ${profile.bio}` : ''}</p></div><button onClick={() => void toggleSupport(profile.id)} className={`rounded-xl px-2.5 py-2 text-xs font-bold ${following.has(profile.id) ? 'border border-slate-200 text-slate-500 dark:border-slate-700' : 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900'}`}>{following.has(profile.id) ? 'Supporting' : 'Support'}</button></div><button onClick={() => void requestPartner(profile)} disabled={partnerRequests.has(profile.id)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold disabled:text-emerald-600 dark:border-slate-700"><HeartHandshake className="h-3.5 w-3.5" />{partnerRequests.has(profile.id) ? 'Partner invitation sent' : 'Invite as accountability partner'}</button></article>)}</section>}
      {!loading && (activeTab === 'all' || activeTab === 'goals') && goals.length > 0 && <section className="space-y-2"><h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Public goals</h2>{goals.map((goal) => <Link key={goal.id} href={`/goal/${goal.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#16181B]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10"><Target className="h-5 w-5 text-amber-500" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{goal.title}</span><span className="text-xs text-slate-500">{goal.category || 'Personal'} · {goal.current_streak || 0} day streak</span></span></Link>)}</section>}
      {!loading && (activeTab === 'all' || activeTab === 'circles') && circles.length > 0 && <section className="space-y-2"><h2 className="px-1 text-xs font-bold uppercase tracking-wider text-slate-400">Circles</h2>{circles.map((circle) => <Link key={circle.id} href="/circles" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-[#16181B]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10"><UsersRound className="h-5 w-5 text-amber-500" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{circle.name}</span><span className="block truncate text-xs text-slate-500">{circle.description || circle.category} · {circle.member_count || 0} members</span></span><CircleUserRound className="h-4 w-4 text-slate-400" /></Link>)}</section>}
    </main>
  )
}
