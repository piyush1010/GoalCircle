'use client'

import React, { useState } from 'react'

interface Goal {
  id: string
  title: string
  category: string
  streak: number
  targetMinutes: number
  loggedMinutes: number
  completed: boolean
}

export default function DashboardPage() {
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Read 20 pages daily',
      category: 'Learning',
      streak: 5,
      targetMinutes: 30,
      loggedMinutes: 30,
      completed: true,
    },
    {
      id: '2',
      title: 'Run 5km Every Morning',
      category: 'Fitness',
      streak: 12,
      targetMinutes: 45,
      loggedMinutes: 15,
      completed: false,
    },
    {
      id: '3',
      title: 'Deep Work / Coding Session',
      category: 'Productivity',
      streak: 3,
      targetMinutes: 60,
      loggedMinutes: 0,
      completed: false,
    },
  ])

  const completedCount = goals.filter((g) => g.completed).length
  const progressPercent = Math.round((completedCount / goals.length) * 100)

  const toggleGoal = (id: string) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g))
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 pt-4 px-4 max-w-md mx-auto transition-colors duration-200">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            GoalCircle
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Daily Accountability Dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-sm font-bold text-amber-500 shadow-sm">
            🎯
          </div>
        </div>
      </div>

      {/* TODAY'S PACE CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Today's Pace
          </span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-500">
            {progressPercent}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {completedCount} of {goals.length} Completed
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Keep the momentum going!
            </p>
          </div>

          {/* PROGRESS RING BADGE */}
          <div className="w-12 h-12 rounded-full border-4 border-amber-500 border-t-slate-200 dark:border-t-slate-800 flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-500 shadow-inner">
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* TODAY'S GOALS SECTION */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
            Today's Goals
          </h3>
          <button className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:underline">
            + New Goal
          </button>
        </div>

        <div className="space-y-3">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className={`p-4 rounded-xl border transition-all ${
                goal.completed
                  ? 'bg-amber-500/10 border-amber-500/30 dark:bg-amber-500/10 dark:border-amber-500/30'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleGoal(goal.id)}
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center border text-xs font-bold transition ${
                      goal.completed
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {goal.completed && '✓'}
                  </button>

                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        goal.completed
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {goal.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
                        {goal.category}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold flex items-center gap-0.5">
                        🔥 {goal.streak}d streak
                      </span>
                    </div>
                  </div>
                </div>

                {!goal.completed && (
                  <button className="px-2.5 py-1 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition">
                    ▶ Timer
                  </button>
                )}
              </div>

              {/* PROGRESS BAR FOR TIME LOGGED */}
              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1 font-medium">
                  <span>Time Logged</span>
                  <span>
                    {goal.loggedMinutes} / {goal.targetMinutes} mins
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (goal.loggedMinutes / goal.targetMinutes) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WEEKLY HEATMAP */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Consistency Heatmap (Last 7 Days)
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
            const isCompleted = idx < 5
            return (
              <div key={idx} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition ${
                    isCompleted
                      ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted && '✓'}
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {day}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}