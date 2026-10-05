'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function FeedPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  
  // New Goal Modal state
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState(30)
  
  // Quick Log Modal state
  const [selectedGoal, setSelectedGoal] = useState<any>(null)
  const [logMinutes, setLogMinutes] = useState(25)
  const [logNote, setLogNote] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadFeedData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!isMounted) return

      if (session?.user) {
        setUser(session.user)
        await Promise.all([
          fetchGoals(session.user.id),
          fetchFocusLogs()
        ])
      }
      if (isMounted) setLoading(false)
    }

    loadFeedData()

    return () => {
      isMounted = false
    }
  }, [])

  const fetchGoals = async (userId: string) => {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setGoals(data)
    }
  }

  const fetchFocusLogs = async () => {
    const { data, error } = await supabase
      .from('focus_logs')
      .select('*, goals(title)')
      .order('logged_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setLogs(data)
    }
  }

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newGoalTitle.trim()) return

    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: user.id,
        title: newGoalTitle.trim(),
        target_days: Number(newGoalTarget),
      })
      .select()

    if (!error && data) {
      setGoals((prev) => [data[0], ...prev])
      setNewGoalTitle('')
      setShowAddGoal(false)
    } else {
      console.error('Error creating goal:', error)
    }
  }

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedGoal) return

    const { error: logError } = await supabase.from('focus_logs').insert({
      user_id: user.id,
      goal_id: selectedGoal.id,
      minutes_logged: Number(logMinutes),
      note: logNote.trim() || 'Logged progress towards goal!',
    })

    if (!logError) {
      // Update goal streak locally and in Supabase
      const newStreak = (selectedGoal.current_streak || 0) + 1
      await supabase
        .from('goals')
        .update({ current_streak: newStreak, updated_at: new Date().toISOString() })
        .eq('id', selectedGoal.id)

      setGoals((prev) =>
        prev.map((g) => (g.id === selectedGoal.id ? { ...g, current_streak: newStreak } : g))
      )

      setSelectedGoal(null)
      setLogNote('')
      fetchFocusLogs()
    } else {
      console.error('Error logging focus session:', logError)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto space-y-6">
      {/* TOP HEADER */}
      <div className="flex justify-between items-center pt-2">
        <div>
          <h1 className="text-xl font-black text-white tracking-wide">GoalCircle</h1>
          <p className="text-[10px] uppercase font-extrabold text-amber-500">Activity & Goal Feed</p>
        </div>
        <button
          onClick={() => setShowAddGoal(true)}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-xs transition shadow-lg shadow-amber-500/20"
        >
          + New Goal
        </button>
      </div>

      {/* ACTIVE GOALS CAROUSEL/LIST */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Your Active Goals</h2>
        {goals.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
            <p className="text-xs text-slate-400">No active goals found in PostgreSQL.</p>
            <button
              onClick={() => setShowAddGoal(true)}
              className="text-xs text-amber-500 font-bold underline"
            >
              Create your first goal
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-sm font-bold text-white">{goal.title}</h3>
                  <p className="text-xs text-slate-400">
                    Target: <span className="text-amber-400 font-bold">{goal.target_days} Days</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs font-black text-amber-500">{goal.current_streak || 0} 🔥</p>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Streak</p>
                  </div>
                  <button
                    onClick={() => setSelectedGoal(goal)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition"
                  >
                    + Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PUBLIC ACTIVITY FEED */}
      <div className="space-y-3">
        <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Community Activity Feed</h2>
        {logs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
            <p className="text-xs text-slate-500">No activity logged yet today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-lg">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-amber-500 uppercase tracking-wide">
                    {log.goals?.title || 'Goal Progress'}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-200">{log.note}</p>
                <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md inline-block">
                  +{log.minutes_logged} mins logged
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: ADD GOAL */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-base font-black text-white">Create New Goal</h3>
            <form onSubmit={handleCreateGoal} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Goal Title</label>
                <input
                  type="text"
                  placeholder="e.g. Read 20 pages daily"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Duration (Days)</label>
                <input
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  min={1}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition"
                >
                  Create Goal
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddGoal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG PROGRESS */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4">
            <h3 className="text-base font-black text-white">Log Progress: {selectedGoal.title}</h3>
            <form onSubmit={handleLogProgress} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Minutes Spent</label>
                <input
                  type="number"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Session Note</label>
                <input
                  type="text"
                  placeholder="What did you achieve during this session?"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition"
                >
                  Submit Log
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGoal(null)}
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