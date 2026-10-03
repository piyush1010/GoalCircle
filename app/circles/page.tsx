'use client'

import React, { useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'

type Category = 'all' | 'work' | 'fitness' | 'learning' | 'habits'

interface Circle {
  id: string
  name: string
  category: Category
  categoryLabel: string
  emoji: string
  membersCount: number
  groupStreak: number
  totalHoursLogged: number
  isJoined: boolean
  description: string
  recentActivity: string
}

const INITIAL_CIRCLES: Circle[] = [
  {
    id: '1',
    name: '100 Days of Code',
    category: 'work',
    categoryLabel: 'Deep Work',
    emoji: '💻',
    membersCount: 42,
    groupStreak: 28,
    totalHoursLogged: 612,
    isJoined: true,
    description: 'Daily 2-hour coding sprints, PR reviews, and build check-ins.',
    recentActivity: 'Aarav logged 2.5h on Next.js setup 12m ago',
  },
  {
    id: '2',
    name: 'Morning Runners Club',
    category: 'fitness',
    categoryLabel: 'Fitness',
    emoji: '🏃‍♀️',
    membersCount: 29,
    groupStreak: 18,
    totalHoursLogged: 340,
    isJoined: true,
    description: '5 AM wakeups, 5k daily runs, and weekend trail challenges.',
    recentActivity: 'Priya completed 6.2km run 1h ago',
  },
  {
    id: '3',
    name: 'Non-Fiction Readers',
    category: 'learning',
    categoryLabel: 'Learning',
    emoji: '📚',
    membersCount: 64,
    groupStreak: 45,
    totalHoursLogged: 890,
    isJoined: false,
    description: '30 pages a day. Summaries and discussions every Sunday.',
    recentActivity: 'Rohan shared notes on Atomic Habits 3h ago',
  },
  {
    id: '4',
    name: 'Deep Focus & Flow',
    category: 'work',
    categoryLabel: 'Deep Work',
    emoji: '⚡',
    membersCount: 88,
    groupStreak: 32,
    totalHoursLogged: 1240,
    isJoined: false,
    description: 'Silent Pomodoro sessions with strict anti-distraction rules.',
    recentActivity: 'Neha finished 4x Pomodoro cycles 30m ago',
  },
  {
    id: '5',
    name: 'Cold Shower & Hydration',
    category: 'habits',
    categoryLabel: 'Habits',
    emoji: '💧',
    membersCount: 51,
    groupStreak: 12,
    totalHoursLogged: 180,
    isJoined: false,
    description: '3L water daily + morning cold restart routines.',
    recentActivity: 'Vikram checked in for Day 12 4h ago',
  },
]

export default function CirclesPage() {
  const { theme, setTheme } = useTheme()
  const [circles, setCircles] = useState<Circle[]>(INITIAL_CIRCLES)
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // New Circle Form State
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🎯')
  const [newCategory, setNewCategory] = useState<Category>('work')
  const [newDesc, setNewDesc] = useState('')

  // Join/Leave Circle Handler
  const toggleJoin = (id: string) => {
    setCircles((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              isJoined: !c.isJoined,
              membersCount: c.isJoined ? c.membersCount - 1 : c.membersCount + 1,
            }
          : c
      )
    )
  }

  // Create Circle Handler
  const handleCreateCircle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const created: Circle = {
      id: Date.now().toString(),
      name: newName,
      category: newCategory,
      categoryLabel: newCategory === 'work' ? 'Deep Work' : newCategory === 'fitness' ? 'Fitness' : newCategory === 'learning' ? 'Learning' : 'Habits',
      emoji: newEmoji || '🎯',
      membersCount: 1,
      groupStreak: 1,
      totalHoursLogged: 0,
      isJoined: true,
      description: newDesc || 'New accountability circle created by you.',
      recentActivity: 'Circle created just now',
    }

    setCircles([created, ...circles])
    setNewName('')
    setNewDesc('')
    setShowCreateModal(false)
  }

  const filteredCircles = circles.filter((c) => {
    const matchesTab = activeTab === 'my' ? c.isJoined : true
    const matchesCategory = activeCategory === 'all' ? true : c.category === activeCategory
    return matchesTab && matchesCategory
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 max-w-md mx-auto space-y-4 pb-28 transition-colors duration-200 select-none">
      
      {/* HEADER & THEME TOGGLE */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            ⭕ Circles
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Shared accountability groups & squad streaks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition active:scale-95 shadow-xs"
          >
            + Create
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-xl border text-xs font-bold transition bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-400 shadow-xs"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* VIEW TOGGLE TABS */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <button
          onClick={() => setActiveTab('my')}
          className={`py-1.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'my'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          My Circles ({circles.filter((c) => c.isJoined).length})
        </button>
        <button
          onClick={() => setActiveTab('discover')}
          className={`py-1.5 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'discover'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Discover All
        </button>
      </div>

      {/* CATEGORY CHIPS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Categories', emoji: '🌐' },
          { id: 'work', label: 'Deep Work', emoji: '💻' },
          { id: 'fitness', label: 'Fitness', emoji: '🏃' },
          { id: 'learning', label: 'Learning', emoji: '📚' },
          { id: 'habits', label: 'Daily Habits', emoji: '💧' },
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
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* CIRCLES LIST */}
      <div className="space-y-3">
        {filteredCircles.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
            <span className="text-3xl">🔍</span>
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              No circles found
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {activeTab === 'my'
                ? "You haven't joined any circles in this category yet."
                : 'No active public circles match this filter.'}
            </p>
          </div>
        ) : (
          filteredCircles.map((circle) => (
            <div
              key={circle.id}
              className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3 transition hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                    {circle.emoji}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {circle.name}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold truncate">
                      {circle.categoryLabel} • {circle.membersCount} members
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleJoin(circle.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition active:scale-95 shrink-0 ${
                    circle.isJoined
                      ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  }`}
                >
                  {circle.isJoined ? 'Joined ✓' : '+ Join'}
                </button>
              </div>

              {/* Description */}
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {circle.description}
              </p>

              {/* Metrics Row */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-500 font-extrabold">🔥 Squad Streak:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {circle.groupStreak} days
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-bold">Total:</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {circle.totalHoursLogged} hrs
                  </span>
                </div>
              </div>

              {/* Activity Feed Snippet */}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="truncate">{circle.recentActivity}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE CIRCLE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                ✨ Create New Circle
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCircle} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Circle Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. UPSC Daily Sprints"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Emoji Icon
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={newEmoji}
                    onChange={(e) => setNewEmoji(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-center focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as Category)}
                    className="w-full px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="work">Deep Work</option>
                    <option value="fitness">Fitness</option>
                    <option value="learning">Learning</option>
                    <option value="habits">Habits</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Description / Rules
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Set expectations for squad members..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-sm"
                >
                  Create Circle
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  )
}