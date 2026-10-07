'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase'

interface Goal {
  id: string
  user_id: string
  title: string
  category: string | null
  status: string | null
  is_completed: boolean | null
  current_streak: number | null
  created_at: string
}

interface Post {
  id: string
  caption: string | null
  media_url?: string | null
  media_urls?: string[] | null
  created_at: string
}

export default function GoalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.id as string

  const [goal, setGoal] = useState<Goal | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const loadGoalDetails = useCallback(async () => {
    try {
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goalError) throw goalError
      setGoal(goalData)

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false })

      if (postsError) console.warn('Could not fetch posts for goal:', postsError)
      setPosts(postsData || [])
    } catch (err) {
      console.error('Error loading goal details:', err)
    } finally {
      setLoading(false)
    }
  }, [goalId])

  useEffect(() => {
    if (goalId) void Promise.resolve().then(loadGoalDetails)
  }, [goalId, loadGoalDetails])

  const toggleGoalCompletion = async () => {
    if (!goal) return
    const isCompleted = Boolean(goal.is_completed || goal.status === 'completed')
    const newStatus = isCompleted ? 'active' : 'completed'

    try {
      setUpdating(true)
      const { error } = await supabase
        .from('goals')
        .update({ status: newStatus, is_completed: !isCompleted })
        .eq('id', goal.id)

      if (error) throw error
      setGoal({ ...goal, status: newStatus, is_completed: !isCompleted })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update goal status')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex items-center justify-center">
        <p className="text-xs text-slate-500 animate-pulse">Loading goal timeline...</p>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
        <p className="text-sm font-bold">Goal not found</p>
        <Link href="/dashboard" className="text-xs text-amber-400 underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const isCompleted = Boolean(goal.is_completed || goal.status === 'completed')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 pt-4 px-4 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-white">
          ← Back
        </button>
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
          {goal.category || 'Personal'}
        </span>
      </div>

      {/* Goal Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 mb-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-black text-white">{goal.title}</h1>
            <p className="mt-1 text-[11px] font-bold text-amber-400">
              🔥 {goal.current_streak || 0} day streak
            </p>
          </div>
          <button
            onClick={toggleGoalCompletion}
            disabled={updating}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isCompleted
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isCompleted ? '🎉 Completed' : 'Mark Complete'}
          </button>
        </div>

        {/* Milestone Statistics */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 text-center">
            <p className="text-lg font-black text-amber-400">{posts.length}</p>
            <p className="text-[10px] text-slate-500">Progress Updates</p>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/60 text-center">
            <p className="text-lg font-black text-emerald-400">{isCompleted ? '100%' : 'In Progress'}</p>
            <p className="text-[10px] text-slate-500">Current Status</p>
          </div>
        </div>
      </div>

      {/* Progress Posts Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-white px-1">Goal Timeline</h2>

        {posts.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 text-center space-y-2">
            <p className="text-xs text-slate-400">No updates logged for this goal yet.</p>
            <Link
              href={`/check-in?goal=${goal.id}`}
              className="inline-block text-xs font-bold text-amber-400 hover:underline"
            >
              Log your first update →
            </Link>
          </div>
        ) : (
          posts.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
              {p.caption && <p className="text-xs text-slate-200">{p.caption}</p>}
              {p.media_url && (
                <img
                  src={p.media_url}
                  alt="Goal proof"
                  className="w-full h-44 object-cover rounded-xl"
                />
              )}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
