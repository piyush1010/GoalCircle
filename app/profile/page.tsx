'use client'

import ProfileEditor from '@/components/ProfileEditor'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import type { User } from '@supabase/supabase-js'
import ProfileAvatar from '@/components/ProfileAvatar'
import GuideTour, { type TourStep } from '@/components/GuideTour'

const WELCOME_TOUR: TourStep[] = [
  { title: "Hi, I'm Goalie!", text: "I'll help you keep going, one small step at a time. Here's a one-minute tour." },
  { target: 'nav-create', title: 'Start here', text: "Create a goal, or post today's progress on one you already have." },
  { target: 'nav-feed', title: 'Feed', text: 'See progress from people you follow. Boost a win, comment or send a nudge.' },
  { target: 'nav-circles', title: 'Circles', text: "Join your mentor's batch with an invite link, or start a group with friends." },
  { target: 'nav-progress', title: 'Today', text: 'Your home: today’s goals and how many days you’ve shown up this month.' },
  { target: 'nav-profile', title: 'Profile', text: 'Your goals and settings. Tap the ? on this page any time to see this tour again.' },
]
import { CircleHelp, Film, Flame, Settings as SettingsIcon, Sparkles } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Real-time Supabase Stats
  const [totalGoals, setTotalGoals] = useState(0)
  const [completedGoals, setCompletedGoals] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [handle, setHandle] = useState('')
  const [showQuickGuide, setShowQuickGuide] = useState(false)

  // Memory Reels Dynamic Days
  const [daysRemainingInMonth, setDaysRemainingInMonth] = useState(0)
  const [currentMonthName, setCurrentMonthName] = useState('')
  const [nextMonthName, setNextMonthName] = useState('')

  const fetchUserStats = async (userId: string) => {
    // 1. Fetch Goals Count & Streaks
    const { data: goals, error } = await supabase
      .from('goals')
      .select('is_completed, current_streak')
      .eq('user_id', userId)

    if (!error && goals) {
      setTotalGoals(goals.length)
      setCompletedGoals(goals.filter(g => g.is_completed).length)
      
      // Calculate max current streak across active goals
      const maxStreak = goals.reduce((max, g) => Math.max(max, g.current_streak || 0), 0)
      setCurrentStreak(maxStreak)
    }
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

      const now = new Date()
      const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      setCurrentMonthName(now.toLocaleString('default', { month: 'long' }))
      setNextMonthName(
        new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('default', { month: 'long' })
      )
      setDaysRemainingInMonth(totalDaysInMonth - now.getDate())

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

  // Helper for matrix color intensity
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
      </div>
    )
  }

  const userMeta = user?.user_metadata || {}
  const displayName = userMeta.full_name || userMeta.name || user?.email?.split('@')[0] || 'User'
  const displayHandle = userMeta.handle || `@${user?.email?.split('@')[0] || 'member'}`
  const avatarUrl = userMeta.avatar_url || null

  return (
    <div className="min-h-screen p-4 pb-28 max-w-md mx-auto space-y-5 text-slate-900 dark:text-slate-100">
      
      {/* HEADER WITH SETTINGS BUTTON */}
      <div className="flex justify-between items-center pt-2">
        <h1 className="text-xl font-black tracking-wide">Profile</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickGuide(true)}
            className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-md transition hover:border-amber-500 hover:text-amber-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-amber-400"
            aria-label="Open quick guide"
            title="Quick guide"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-300 transition shadow-md flex items-center gap-1.5 text-xs font-bold"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4 text-amber-500" />
            <span className="text-[11px]">Settings</span>
          </button>
        </div>
      </div>

      <GuideTour name="welcome" steps={WELCOME_TOUR} open={showQuickGuide} onDone={() => void handleQuickGuideComplete()} />

      {/* USER CARD & STATS */}
      <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
        <div className="flex items-center gap-4">
          <ProfileAvatar value={avatarUrl} name={displayName} size={56} className="rounded-2xl border-2 border-amber-500/50 shadow-md" />
          <div>
            <h2 className="text-base font-black">{displayName}</h2>
            <p className="text-xs font-semibold text-amber-500">{displayHandle}</p>
          </div>
        </div>

        {/* STAT PILLS WITH LIVE SUPABASE DATA */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-base font-black text-amber-500">{totalGoals}</p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">Goals</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-2.5 space-y-0.5">
            <p className="inline-flex items-center justify-center gap-1 text-base font-black text-amber-500"><Flame className="h-4 w-4" />{currentStreak}</p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">Streak</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-base font-black text-emerald-400">{completedGoals}</p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">Done</p>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700/60 dark:text-slate-200 font-extrabold text-xs rounded-xl transition"
        >
          Edit Profile
        </button>
      </div>

      {/* MEMORY REELS (DYNAMIC MONTH CALCULATIONS) */}
      <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <h2 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
          Memory Reels
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 text-center">
            <Film className="mx-auto h-6 w-6 text-amber-500" />
            <h3 className="text-xs font-extrabold">{currentMonthName} Recap</h3>
            <p className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 py-1 px-2 rounded-lg">
              Generated Automatically
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl p-3.5 space-y-2 text-center opacity-70">
            <Sparkles className="mx-auto h-6 w-6 text-slate-400" />
            <h3 className="text-xs font-extrabold text-slate-300">{nextMonthName} Recap</h3>
            <p className="text-[9px] text-amber-400 font-bold bg-amber-500/10 py-1 px-2 rounded-lg">
              Unlocks in {daysRemainingInMonth} days
            </p>
          </div>
        </div>
      </div>

      {/* MODAL: EDIT PROFILE (the only place to edit profile details) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center" onClick={() => setShowEditModal(false)}>
          <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-3 text-base font-black">Edit profile</h3>
            <ProfileEditor onCancel={() => setShowEditModal(false)} onSaved={(saved) => {
              setFullName(saved.fullName); setHandle(`@${saved.username}`)
              setUser((prev) => prev ? ({ ...prev, user_metadata: { ...prev.user_metadata, full_name: saved.fullName, handle: `@${saved.username}`, avatar_url: saved.avatarUrl } }) : prev)
              setShowEditModal(false)
            }} />
          </div>
        </div>
      )}

    </div>
  )
}
