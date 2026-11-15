'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Plus } from 'lucide-react'
import ChallengeCard from '@/components/communities/ChallengeCard'
import { CATEGORY_COMMUNITIES, describe, examCode, isExamCommunity, todayLine, type CommunityRow } from '@/lib/communities'
import { confirmAction } from '@/lib/confirm'
import { supabase } from '@/utils/supabase'

interface Goal { id: string; title: string; current_streak: number | null }
interface Group { id: string; name: string; description: string | null }

/** One community: what's happening today, this week's challenge, your own goals in it, and open groups. */
export default function CommunityPage() {
  const router = useRouter()
  const key = decodeURIComponent(String(useParams().key ?? ''))
  const known = isExamCommunity(key) || key in CATEGORY_COMMUNITIES
  const [userId, setUserId] = useState<string | null>(null)
  const [row, setRow] = useState<CommunityRow | null | undefined>(undefined)
  const [goals, setGoals] = useState<Goal[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [planId, setPlanId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace(`/login?next=/communities/${encodeURIComponent(key)}`); return }
    const uid = session.user.id
    setUserId(uid)
    const { data, error: e } = await supabase.rpc('community_overview')
    if (e) { setRow(null); return }
    setRow(((data || []) as CommunityRow[]).find((r) => r.key === key) ?? null)
    if (isExamCommunity(key)) {
      const { data: t } = await supabase.from('prep_exam_templates').select('id').eq('code', examCode(key)).maybeSingle()
      setPlanId((t as { id: string } | null)?.id ?? null)
    } else {
      const [mineResult, groupResult] = await Promise.all([
        supabase.from('goals').select('id,title,current_streak').eq('user_id', uid).eq('category', key).in('status', ['active', 'paused']).order('created_at'),
        supabase.from('circles').select('id,name,description').eq('visibility', 'public').eq('category', key).order('created_at', { ascending: false }).limit(5),
      ])
      setGoals((mineResult.data || []) as Goal[])
      setGroups((groupResult.data || []) as Group[])
    }
  }, [key, router])

  useEffect(() => { if (known) void Promise.resolve().then(load) }, [known, load])

  const setMember = async (join: boolean) => {
    if (!userId || !row) return
    if (!join && !(await confirmAction(`Leave ${describe(key).name}? It won't show on Communities any more. Your goals stay as they are.`))) return
    setBusy(true); setError(null)
    const { error: e } = await supabase.from('community_members').upsert({ user_id: userId, community: key, state: join ? 'joined' : 'hidden' }, { onConflict: 'user_id,community' })
    if (!e && !join && row.in_challenge) await supabase.rpc('community_challenge_set', { target_community: key, take_part: false })
    setBusy(false)
    if (e) { setError('That didn’t save. Please try again.'); return }
    if (!join) { router.push('/circles'); return }
    setRow({ ...row, member: true, joined: true, members: row.members + 1 })
  }

  const top = <div className="flex h-10 items-center"><button type="button" onClick={() => { if (window.history.length > 1) router.back(); else router.push('/circles') }} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button></div>
  const shell = 'mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4'
  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'

  if (!known || row === null) return <main className={shell}>{top}
    <div className="pt-10 text-center">
      <h1 className="text-lg font-bold">This community isn&apos;t open to you yet</h1>
      <p className="mt-1 text-sm text-slate-500">{isExamCommunity(key) ? 'Add this exam to your plan, and its community opens for you.' : 'It may have moved. Have a look at the others.'}</p>
      <Link href={isExamCommunity(key) ? '/prep/plan?exams=1' : '/circles'} className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">{isExamCommunity(key) ? 'Add an exam' : 'See communities'}</Link>
    </div>
  </main>
  if (!row) return <main className={shell}>{top}<div className="mt-4 h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-busy="true" /></main>

  const d = describe(key)
  const Icon = d.icon
  return <main className={shell}>
    {top}
    <header className="mt-2 flex items-center gap-3">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{d.short ? <span className="text-xs font-bold">{d.short.slice(0, 5)}</span> : <Icon className="h-6 w-6" />}</span>
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">{d.name}</h1>
        <p className="text-sm text-slate-500">{row.members.toLocaleString('en-IN')} {row.members === 1 ? 'member' : 'members'}. {d.line}.</p>
      </div>
    </header>

    <p className="mt-5 text-[15px] text-slate-700 dark:text-slate-200">{todayLine(row)}.</p>

    {!row.member && <button type="button" disabled={busy} onClick={() => void setMember(true)} className="mt-4 h-12 w-full rounded-2xl bg-slate-900 text-[15px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">Join {d.name}</button>}
    {error && <p role="alert" className="mt-3 text-sm font-medium text-rose-600">{error}</p>}

    <section className="mt-6">
      <h2 className="mb-3 text-base font-semibold">This week&apos;s challenge</h2>
      <ChallengeCard row={row} onChange={setRow} showWhere={false} />
    </section>

    {isExamCommunity(key)
      ? <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Your preparation</h2>
          <Link href={planId ? `/prep/plan?exam=${planId}` : '/prep/plan'} className={`${card} flex items-center gap-3 p-4`}>
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Open your {d.name} plan</span><span className="block text-sm text-slate-500">{row.topic ? `Today's community topic, ${row.topic}, is on your Today list.` : 'Your syllabus, revisions and batch'}</span></span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </Link>
        </section>
      : <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Your {d.name.toLowerCase()} goals</h2>
          {goals.length === 0
            ? <Link href="/start" className={`${card} flex items-center gap-3 p-4`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><Plus className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Add a goal</span><span className="block text-sm text-slate-500">The challenge counts the days you check in on it.</span></span>
              </Link>
            : <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
                {goals.map((goal) => <li key={goal.id}><Link href={`/goal/${goal.id}`} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{goal.title}</span>{(goal.current_streak ?? 0) > 1 && <span className="block text-sm text-slate-500">{goal.current_streak} days in a row</span>}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link></li>)}
              </ul>}
          {groups.length > 0 && <>
            <h2 className="mb-3 mt-6 text-base font-semibold">Open groups</h2>
            <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
              {groups.map((group) => <li key={group.id}><Link href={`/circles/${group.id}`} className="flex items-center gap-3 px-4 py-3.5">
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{group.name}</span>{group.description && <span className="block truncate text-sm text-slate-500">{group.description}</span>}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link></li>)}
            </ul>
          </>}
        </section>}

    {row.member && <button type="button" disabled={busy} onClick={() => void setMember(false)} className="mt-8 w-full py-2 text-center text-sm font-medium text-slate-500 disabled:opacity-50">Leave this community</button>}
  </main>
}
