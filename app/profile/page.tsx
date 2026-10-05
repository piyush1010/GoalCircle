'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import type { User } from '@supabase/supabase-js'

interface DayLog {
  date: string
  dayLabel: string
  minutes: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Real-time Supabase Stats
  const [totalGoals, setTotalGoals] = useState(0)
  const [completedGoals, setCompletedGoals] = useState(0)
  const [currentStreak, setCurrentStreak] = useState(0)

  // Consistency Matrix Data (Last 30 Days)
  const [matrixDays, setMatrixDays] = useState<DayLog[]>([])
  const [hoveredDay, setHoveredDay] = useState<DayLog | null>(null)

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [fullName, setFullName] = useState('')
  const [handle, setHandle] = useState('')
  const [saving, setSaving] = useState(false)

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

  const fetchConsistencyMatrix = async (userId: string) => {
    // Generate array for last 30 days
    const days: DayLog[] = []
    const today = new Date()

    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(today.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' })
      days.push({ date: dateStr, dayLabel, minutes: 0 })
    }

    // Fetch Focus Logs for user
    const { data: logs, error } = await supabase
      .from('focus_logs')
      .select('minutes_logged, logged_at')
      .eq('user_id', userId)

    if (!error && logs) {
      // Map minutes logged into corresponding days
      const minutesByDate: Record<string, number> = {}
      logs.forEach(log => {
        const dateKey = new Date(log.logged_at).toISOString().split('T')[0]
        minutesByDate[dateKey] = (minutesByDate[dateKey] || 0) + (log.minutes_logged || 0)
      })

      days.forEach(day => {
        day.minutes = minutesByDate[day.date] || 0
      })
    }

    setMatrixDays(days)
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
        fetchConsistencyMatrix(currentUser.id),
      ])

      if (isMounted) setLoading(false)
    }

    loadProfileData()

    return () => {
      isMounted = false
    }
  }, [router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const formattedHandle = handle.startsWith('@') ? handle : `@${handle}`

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        handle: formattedHandle,
      }
    })

    if (!error) {
      setUser((prev) => prev ? ({
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          full_name: fullName,
          handle: formattedHandle,
        }
      }) : prev)
      setHandle(formattedHandle)
      setShowEditModal(false)
    } else {
      console.error('Failed to update profile:', error)
    }

    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Helper for matrix color intensity
  const getIntensityClass = (minutes: number) => {
    if (minutes === 0) return 'bg-slate-800/80 border-slate-800'
    if (minutes < 15) return 'bg-amber-900/60 border-amber-800 text-amber-200'
    if (minutes < 30) return 'bg-amber-600 border-amber-500 text-slate-950'
    return 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow-sm shadow-amber-500/30'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
      </div>
    )
  }

  const userMeta = user?.user_metadata || {}
  const displayName = userMeta.full_name || userMeta.name || user?.email?.split('@')[0] || 'User'
  const displayHandle = userMeta.handle || `@${user?.email?.split('@')[0] || 'member'}`
  const avatarUrl = userMeta.avatar_url || null

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-28 max-w-md mx-auto space-y-5">
      
      {/* HEADER WITH SETTINGS BUTTON */}
      <div className="flex justify-between items-center pt-2">
        <h1 className="text-xl font-black text-white tracking-wide">Profile</h1>
        <button
          onClick={() => router.push('/settings')}
          className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl text-slate-300 transition shadow-md flex items-center gap-1.5 text-xs font-bold"
          title="Settings"
        >
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[11px]">Settings</span>
        </button>
      </div>

      {/* USER CARD & STATS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-xl">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/50 shadow-md"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 font-black text-xl">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-base font-black text-white">{displayName}</h2>
            <p className="text-xs font-semibold text-amber-500">{displayHandle}</p>
          </div>
        </div>

        {/* STAT PILLS WITH LIVE SUPABASE DATA */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-base font-black text-amber-500">{totalGoals}</p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">Goals</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-base font-black text-amber-500">{currentStreak} 🔥</p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">Streak</p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 space-y-0.5">
            <p className="text-base font-black text-emerald-400">{completedGoals}</p>
            <p className="text-[9px] font-extrabold uppercase text-slate-400">Done</p>
          </div>
        </div>

        <button
          onClick={() => setShowEditModal(true)}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-200 font-extrabold text-xs rounded-xl transition"
        >
          Edit Profile
        </button>
      </div>

      {/* CONSISTENCY MATRIX (LAST 30 DAYS WITH TOOLTIPS & LABELS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-black uppercase text-slate-300 tracking-wider">
            Consistency Matrix
          </h2>
          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
            Last 30 Days
          </span>
        </div>

        {/* Hover/Tap Active Tooltip Indicator */}
        <div className="h-5 text-center">
          {hoveredDay ? (
            <p className="text-[10px] font-bold text-slate-300 animate-fade-in">
              <span className="text-amber-400">{hoveredDay.date}</span>: {hoveredDay.minutes} mins logged
            </p>
          ) : (
            <p className="text-[10px] text-slate-500">Tap or hover any square to inspect activity</p>
          )}
        </div>

        {/* Grid Display (6 Columns x 5 Rows) */}
        <div className="grid grid-cols-6 gap-2 pt-1">
          {matrixDays.map((day, idx) => (
            <div
              key={idx}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => setHoveredDay(day)}
              className={`h-9 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 ${getIntensityClass(
                day.minutes
              )}`}
            >
              <span className="text-[8px] opacity-60 font-bold">{day.dayLabel}</span>
              {day.minutes > 0 && (
                <span className="text-[9px] font-black">{day.minutes}m</span>
              )}
            </div>
          ))}
        </div>

        {/* Matrix Legend */}
        <div className="flex items-center justify-end gap-1.5 text-[9px] text-slate-400 pt-1">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-800"></div>
          <div className="w-2.5 h-2.5 rounded bg-amber-900/60 border border-amber-800"></div>
          <div className="w-2.5 h-2.5 rounded bg-amber-600 border border-amber-500"></div>
          <div className="w-2.5 h-2.5 rounded bg-amber-400 border border-amber-300"></div>
          <span>More</span>
        </div>
      </div>

      {/* MEMORY REELS (DYNAMIC MONTH CALCULATIONS) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <h2 className="text-xs font-black uppercase text-slate-300 tracking-wider">
          Memory Reels
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-center">
            <div className="text-2xl">🎬</div>
            <h3 className="text-xs font-extrabold text-white">{currentMonthName} Recap</h3>
            <p className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 py-1 px-2 rounded-lg">
              Generated Automatically
            </p>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-center opacity-70">
            <div className="text-2xl">✨</div>
            <h3 className="text-xs font-extrabold text-slate-300">{nextMonthName} Recap</h3>
            <p className="text-[9px] text-amber-400 font-bold bg-amber-500/10 py-1 px-2 rounded-lg">
              Unlocks in {daysRemainingInMonth} days
            </p>
          </div>
        </div>
      </div>

      {/* SIGN OUT AT BOTTOM */}
      <div className="pt-2 text-center">
        <button
          onClick={handleSignOut}
          className="text-xs font-extrabold text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 px-6 py-2.5 rounded-2xl transition"
        >
          Sign Out of GoalCircle
        </button>
      </div>

      {/* MODAL: EDIT PROFILE */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-white">Edit Profile Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Handle</label>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
