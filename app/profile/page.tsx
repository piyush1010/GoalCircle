'use client'

import ProfileEditor from '@/components/ProfileEditor'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import type { User } from '@supabase/supabase-js'
import ProfileAvatar from '@/components/ProfileAvatar'
import GuideTour, { type TourStep } from '@/components/GuideTour'

const WELCOME_TOUR: TourStep[] = [
  { title: 'Your profile', text: 'A quick tour of where everything is.' },
  { target: 'nav-home', title: 'Home', text: 'Your goals and everything due today.' },
  { target: 'nav-communities', title: 'Communities', text: 'Your batches and study groups, the feed, and people with the same goal.' },
  { target: 'nav-add', title: 'The + button', text: 'Log today, start the focus timer, add a task, set a new goal or join a batch.' },
  { target: 'nav-progress', title: 'Progress', text: 'Your month, each exam’s coverage and each goal’s run.' },
  { title: 'Profile and settings', text: 'Open them any time from your photo at the top of Home. Tap the ? on this page to see this tour again.' },
]
import { ChevronDown, ChevronRight, CircleHelp, Settings as SettingsIcon } from 'lucide-react'
import Link from 'next/link'
import TodoWidget from '@/components/TodoWidget'
import { usePrepActive } from '@/lib/prep/active'

export default function ProfilePage() {
  const router = useRouter()
  const preparing = usePrepActive()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  const [totalGoals, setTotalGoals] = useState(0)
  const [completedGoals, setCompletedGoals] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [handle, setHandle] = useState('')
  const [showQuickGuide, setShowQuickGuide] = useState(false)


  const fetchUserStats = async (userId: string) => {
    // 1. Fetch Goals Count & Streaks
    const { data: goals, error } = await supabase
      .from('goals')
      .select('is_completed, current_streak')
      .eq('user_id', userId)

    if (!error && goals) {
      setTotalGoals(goals.length)
      
      // Calculate max current streak across active goals
      const maxStreak = goals.reduce((max, g) => Math.max(max, g.current_streak || 0), 0)
      setCurrentStreak(maxStreak)
    }

    // 2. Days showed up: the same rule as the ring on Today (a check-in that isn't "Missed",
    //    focus time, or a batch check-in), counted once per day.
    const [posts, logs, batch] = await Promise.all([
      supabase.from('posts').select('created_at').eq('user_id', userId).or('checkin_status.is.null,checkin_status.neq.missed'),
      supabase.from('focus_logs').select('logged_at').eq('user_id', userId),
      supabase.from('circle_task_checkins').select('status,circle_tasks(task_date)').eq('user_id', userId).in('status', ['done', 'partial']),
    ])
    const dayKey = (value: string) => { const d = new Date(value); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` }
    const days = new Set<string>([
      ...(posts.data || []).map((row) => dayKey(row.created_at)),
      ...(logs.data || []).map((row) => dayKey(row.logged_at)),
      ...((batch.data || []) as unknown as Array<{ circle_tasks: { task_date: string } | null }>).filter((row) => row.circle_tasks).map((row) => dayKey(`${row.circle_tasks!.task_date}T12:00:00`)),
    ])
    setCompletedGoals(days.size)
  }

  useEffect(() => {
    let isMounted = true

    const loadProfileData = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push('/login')
        return
      }

      if (!isMounted) return

      const currentUser = session.user
      setUser(currentUser)

      const userMeta = currentUser.user_metadata || {}
      const forceGuide = new URLSearchParams(window.location.search).get('guide') === '1'
      if (forceGuide) setShowQuickGuide(true)
      if (new URLSearchParams(window.location.search).get('edit') === '1') setShowEditModal(true)
      setFullName(userMeta.full_name || userMeta.name || currentUser.email?.split('@')[0] || 'User')
      setHandle(userMeta.handle || `@${currentUser.email?.split('@')[0] || 'member'}`)

      await Promise.all([
        fetchUserStats(currentUser.id),
      ])

      if (isMounted) setLoading(false)
    }

    loadProfileData()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleQuickGuideComplete = async () => {
    if (!user) {
      setShowQuickGuide(false)
      return
    }
    localStorage.setItem(`goalcircle.quick-guide.${user.id}`, '1')
    setShowQuickGuide(false)
    setUser((current) => current ? ({
      ...current,
      user_metadata: {
        ...current.user_metadata,
        goalcircle_quick_guide_seen: true,
      },
    }) : current)
    await supabase.auth.updateUser({
      data: {
        goalcircle_quick_guide_seen: true,
      },
    })
  }

  if (loading) {
    return <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-6" aria-busy="true">
      <div className="h-8 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div className="mt-5 h-52 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </main>
  }

  const userMeta = user?.user_metadata || {}
  const displayName = userMeta.full_name || userMeta.name || user?.email?.split('@')[0] || 'User'
  const displayHandle = String(userMeta.handle || `@${user?.email?.split('@')[0] || 'member'}`)
  const avatarUrl = userMeta.avatar_url || null
  const card = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
  const stats: [string, string][] = [
    [String(totalGoals), totalGoals === 1 ? 'goal' : 'goals'],
    [String(currentStreak), currentStreak === 1 ? 'day in a row' : 'days in a row'],
    [String(completedGoals), completedGoals === 1 ? 'day you showed up' : 'days you showed up'],
  ]

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setShowQuickGuide(true)} aria-label="Show me around" className="grid h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><CircleHelp className="h-5 w-5" /></button>
          <Link href="/settings" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><SettingsIcon className="h-5 w-5" />Settings</Link>
        </div>
      </div>

      <GuideTour name="welcome" steps={WELCOME_TOUR} open={showQuickGuide} onDone={() => void handleQuickGuideComplete()} />

      <section aria-label="You" className={`${card} mt-5 p-5`}>
        <div className="flex items-center gap-4">
          <ProfileAvatar value={avatarUrl} name={displayName} size={64} className="rounded-full" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{displayName}</h2>
            <p className="truncate text-sm text-slate-500">{displayHandle.startsWith('@') ? displayHandle : `@${displayHandle}`}</p>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {stats.map(([value, label]) => <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd className="text-2xl font-bold tabular-nums">{value}</dd>
            <dd className="text-sm leading-snug text-slate-500">{label}</dd>
          </div>)}
        </dl>
        <button type="button" onClick={() => setShowEditModal(true)} className="mt-5 h-11 w-full rounded-xl border border-slate-200 text-[15px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Edit profile</button>
      </section>

      {/* For people preparing for an exam, the feed and small to-dos live here instead of the main bar and Today */}
      {preparing && user?.id && <div className={`${card} mt-4 divide-y divide-slate-100 dark:divide-slate-800`}>
        <Link href="/feed" className="flex items-center gap-3 px-4 py-3.5">
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Feed</span><span className="block text-sm text-slate-500">Check-ins from people you follow</span></span>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
        </Link>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Quick tasks for today</span><span className="block text-sm text-slate-500">Small one-off things, like filling in a form</span></span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="px-2 pb-2"><TodoWidget userId={user.id} /></div>
        </details>
      </div>}

      {/* MODAL: EDIT PROFILE (the only place to edit profile details) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setShowEditModal(false)}>
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-3 text-base font-bold">Edit profile</h3>
            <ProfileEditor onCancel={() => setShowEditModal(false)} onSaved={(saved) => {
              setFullName(saved.fullName); setHandle(`@${saved.username}`)
              setUser((prev) => prev ? ({ ...prev, user_metadata: { ...prev.user_metadata, full_name: saved.fullName, handle: `@${saved.username}`, avatar_url: saved.avatarUrl } }) : prev)
              setShowEditModal(false)
            }} />
          </div>
        </div>
      )}
    </main>
  )
}
