'use client'

import React, { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { Bolt, Flame, Moon, Sun, Timer, TrendingUp, Trophy } from 'lucide-react'

type Timeframe = 'weekly' | 'monthly' | 'allTime'
type Category = 'all' | 'fitness' | 'work' | 'learning'

interface LeaderboardUser {
  rank: number
  id: string
  name: string
  handle: string
  avatar: string
  category: Category
  categoryLabel: string
  streakDays: number
  totalHours: number
  cheers: number
  isCurrentUser?: boolean
}

const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    id: '1',
    name: 'Aarav Sharma',
    handle: '@aarav_builds',
    avatar: 'AS',
    category: 'work',
    categoryLabel: 'Deep Work Coding',
    streakDays: 28,
    totalHours: 84,
    cheers: 142,
  },
  {
    rank: 2,
    id: '2',
    name: 'Priya Patel',
    handle: '@priya_runs',
    avatar: 'PP',
    category: 'fitness',
    categoryLabel: 'Marathon Prep',
    streakDays: 24,
    totalHours: 72,
    cheers: 118,
  },
  {
    rank: 3,
    id: '3',
    name: 'Rohan Mehta',
    handle: '@rohan_reads',
    avatar: 'RM',
    category: 'learning',
    categoryLabel: 'Tech & AI Reading',
    streakDays: 21,
    totalHours: 68,
    cheers: 95,
  },
  {
    rank: 4,
    id: '4',
    name: 'Ananya Gupta',
    handle: '@ananya_design',
    avatar: 'AG',
    category: 'work',
    categoryLabel: 'UI System Design',
    streakDays: 19,
    totalHours: 54,
    cheers: 76,
  },
  {
    rank: 5,
    id: '5',
    name: 'Vikram Singh',
    handle: '@vikram_fit',
    avatar: 'VS',
    category: 'fitness',
    categoryLabel: 'Strength & Core',
    streakDays: 18,
    totalHours: 51,
    cheers: 62,
  },
  {
    rank: 6,
    id: '6',
    name: 'Neha Verma',
    handle: '@neha_study',
    avatar: 'NV',
    category: 'learning',
    categoryLabel: 'Civil Services Prep',
    streakDays: 16,
    totalHours: 48,
    cheers: 58,
  },
  {
    rank: 12,
    id: 'me',
    name: 'You',
    handle: '@you',
    avatar: 'YO',
    category: 'work',
    categoryLabel: 'GoalYaar Dev',
    streakDays: 14,
    totalHours: 42,
    cheers: 39,
    isCurrentUser: true,
  },
]

export default function LeaderboardPage() {
  const { theme, setTheme } = useTheme()
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [users, setUsers] = useState<LeaderboardUser[]>(INITIAL_LEADERBOARD)

  // Boost / Cheer Handler
  const handleBoost = (id: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, cheers: u.cheers + 1 } : u))
    )
  }

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (activeCategory === 'all') return true
    return u.category === activeCategory
  })

  const topThree = filteredUsers.filter((u) => u.rank <= 3)
  const remainingList = filteredUsers.filter((u) => u.rank > 3)
  const currentUser = users.find((u) => u.isCurrentUser)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 max-w-md mx-auto space-y-4 pb-32 transition-colors duration-200 select-none">
      
      {/* HEADER & THEME TOGGLE */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" /> Leaderboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Community standings & consistency rankings
          </p>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 rounded-xl border text-xs font-bold transition bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-400 shadow-xs"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

      {/* WEEKLY SPRINT COUNTDOWN BANNER */}
      <div className="p-3 bg-amber-500/5 border border-amber-500/30 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-amber-500" />
          <div>
            <span className="text-xs font-extrabold text-amber-500 uppercase tracking-wider block">
              Weekly Sprint #38
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Ends in 2 days, 14 hours
            </span>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider">
          Live
        </span>
      </div>

      {/* TIMEFRAME SELECTOR */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <button
          onClick={() => setTimeframe('weekly')}
          className={`py-1.5 text-xs font-extrabold rounded-xl transition ${
            timeframe === 'weekly'
              ? 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Weekly Sprint
        </button>
        <button
          onClick={() => setTimeframe('monthly')}
          className={`py-1.5 text-xs font-extrabold rounded-xl transition ${
            timeframe === 'monthly'
              ? 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          28-Day Matrix
        </button>
        <button
          onClick={() => setTimeframe('allTime')}
          className={`py-1.5 text-xs font-extrabold rounded-xl transition ${
            timeframe === 'allTime'
              ? 'bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All-Time
        </button>
      </div>

      {/* CATEGORY FILTER CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Circles' },
          { id: 'work', label: 'Deep Work' },
          { id: 'fitness', label: 'Fitness' },
          { id: 'learning', label: 'Learning' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id as Category)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-extrabold shrink-0 flex items-center gap-1.5 transition ${
              activeCategory === cat.id
                ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* TOP 3 PODIUM SECTION */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-2 items-end">
          {/* #2 SILVER */}
          {topThree[1] && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs relative pt-5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-bold text-xs flex items-center justify-center border-2 border-slate-50 dark:border-slate-950">
                2
              </span>
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{topThree[1].avatar}</span>
              <h3 className="text-xs font-bold truncate text-slate-900 dark:text-white mt-1">
                {topThree[1].name}
              </h3>
              <p className="inline-flex items-center gap-1 text-xs text-amber-500 font-bold"><Flame className="h-3 w-3" />{topThree[1].streakDays}d streak</p>
              <p className="text-[11px] text-slate-400 font-extrabold mt-0.5">{topThree[1].totalHours} hrs</p>
            </div>
          )}

          {/* #1 GOLD */}
          {topThree[0] && (
            <div className="bg-white dark:bg-slate-900 border-2 border-amber-500 rounded-2xl p-3 text-center shadow-md relative pt-6 -translate-y-2">
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center border-2 border-slate-50 dark:border-slate-950 shadow-sm">
                1
              </span>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-700 dark:text-amber-300">{topThree[0].avatar}</span>
              <h3 className="text-xs font-bold truncate text-slate-900 dark:text-white mt-1">
                {topThree[0].name}
              </h3>
              <p className="inline-flex items-center gap-1 text-xs text-amber-500 font-bold"><Flame className="h-3 w-3" />{topThree[0].streakDays}d streak</p>
              <p className="text-[11px] text-slate-400 font-extrabold mt-0.5">{topThree[0].totalHours} hrs</p>
            </div>
          )}

          {/* #3 BRONZE */}
          {topThree[2] && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-center shadow-xs relative pt-5">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-amber-700/80 text-white font-bold text-xs flex items-center justify-center border-2 border-slate-50 dark:border-slate-950">
                3
              </span>
              <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">{topThree[2].avatar}</span>
              <h3 className="text-xs font-bold truncate text-slate-900 dark:text-white mt-1">
                {topThree[2].name}
              </h3>
              <p className="inline-flex items-center gap-1 text-xs text-amber-500 font-bold"><Flame className="h-3 w-3" />{topThree[2].streakDays}d streak</p>
              <p className="text-[11px] text-slate-400 font-extrabold mt-0.5">{topThree[2].totalHours} hrs</p>
            </div>
          )}
        </div>
      )}

      {/* RANKINGS LIST */}
      <div className="space-y-2 pt-1">
        {remainingList.map((user) => (
          <div
            key={user.id}
            className={`p-3 rounded-2xl border transition flex items-center justify-between shadow-xs ${
              user.isCurrentUser
                ? 'bg-amber-500/10 border-amber-500/50'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-5 text-center text-xs font-bold text-slate-400">
                #{user.rank}
              </span>
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">
                {user.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {user.name}
                  </h4>
                  {user.isCurrentUser && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-[11px] font-bold uppercase">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">
                  {user.categoryLabel} • <span className="inline-flex items-center gap-0.5 text-amber-500 font-bold"><Flame className="h-3 w-3" />{user.streakDays}d</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-900 dark:text-white">
                  {user.totalHours}h
                </span>
                <span className="text-[11px] font-bold text-slate-400">logged</span>
              </div>
              <button
                onClick={() => handleBoost(user.id)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition active:scale-95 flex items-center gap-1"
                title="Cheer user"
              >
                <Bolt className="h-3.5 w-3.5" />
                <span className="text-xs">{user.cheers}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* PINNED CURRENT USER STANDING BAR */}
      {currentUser && (
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-amber-500/40 z-30">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 text-xs font-bold">
                #{currentUser.rank}
              </span>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Your Current Standing
                </span>
                <span className="text-xs text-slate-400">
                  {currentUser.totalHours} hours logged • {currentUser.streakDays}d streak
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-amber-500">
              <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Top 15%</span>
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
