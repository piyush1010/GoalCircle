'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import BottomNav from '../../components/BottomNav'
import { supabase } from '@/utils/supabase'

interface Goal {
  id: string
  title: string
  description?: string
  category?: string
  daily_target?: string
  frequency?: string
  color?: string
  image_url?: string
  is_public: boolean
  circle_id?: string
  created_at?: string
}

export default function GoalsDashboardPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = async () => {
    const { data: userData } = await supabase.auth.getUser()

    if (userData?.user) {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setGoals(data)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(fetchGoals)
  }, [])

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    const { error } = await supabase.from('goals').delete().eq('id', goalId)
    if (!error) {
      setGoals(goals.filter(g => g.id !== goalId))
    } else {
      alert(`Could not delete goal: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-28 px-4 pt-6 max-w-md mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">My Active Goals</h1>
          <p className="text-xs text-slate-400 mt-0.5">Track commitments and update progress.</p>
        </div>
        
        {/* Button to navigate to create-goal */}
        <Link
          href="/create-goal"
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition flex items-center gap-1 shadow-lg shadow-amber-500/10"
        >
          <span>➕</span>
          <span>New Goal</span>
        </Link>
      </div>

      {/* Active Goals List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
            Loading goals...
          </div>
        ) : goals.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800/60 space-y-3">
            <p className="text-xs text-slate-400">No active goals yet.</p>
            <Link
              href="/create-goal"
              className="inline-block px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl"
            >
              Declare Your First Goal
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => (
              <div
                key={goal.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 relative overflow-hidden"
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: goal.color || '#f59e0b' }}
                />

                <div className="flex items-center gap-3 pl-1.5 flex-1 min-w-0">
                  {goal.image_url && (
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={goal.image_url} alt={goal.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">{goal.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-amber-400 font-mono rounded-full">
                        {goal.is_public ? '🌐 Public' : '🔒 Private Circle'}
                      </span>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{goal.description}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                  title="Delete Goal"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
