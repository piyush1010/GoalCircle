'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, Check, PauseCircle, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface Goal {
  id: string
  user_id: string
  title: string
  category: string | null
  status: string | null
  is_completed: boolean | null
  current_streak: number | null
  pause_count: number | null
  pause_until: string | null
  target_date: string | null
  created_at: string
}

interface Post {
  id: string
  caption: string | null
  media_url?: string | null
  media_urls?: string[] | null
  proof_type?: string | null
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
  const [userId, setUserId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const loadGoalDetails = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user.id || null)
      await supabase.rpc('resume_expired_goal_pauses')
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goalError) throw goalError
      setGoal(goalData)
      setEditTitle(goalData.title)
      setEditTargetDate(goalData.target_date || '')

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

  const saveGoal = async () => {
    if (!goal || goal.user_id !== userId || editTitle.trim().length < 3) return
    setUpdating(true); setMessage(null)
    const { error } = await supabase.from('goals').update({ title: editTitle.trim(), target_date: editTargetDate || null, updated_at: new Date().toISOString() }).eq('id', goal.id).eq('user_id', userId)
    setUpdating(false)
    if (error) { setMessage('Goal changes could not be saved.'); return }
    setGoal({ ...goal, title: editTitle.trim(), target_date: editTargetDate || null }); setEditing(false); setMessage('Goal updated')
  }

  const deleteGoal = async () => {
    if (!goal || goal.user_id !== userId || !window.confirm('Delete this goal and all of its progress posts? This cannot be undone.')) return
    setUpdating(true)
    const { error } = await supabase.from('goals').delete().eq('id', goal.id).eq('user_id', userId)
    if (error) { setMessage('Goal could not be deleted.'); setUpdating(false); return }
    router.replace('/dashboard'); router.refresh()
  }

  const pauseGoal = async () => {
    if (!goal || goal.user_id !== userId || !window.confirm('Use this goal’s one-time seven-day pause? It cannot be used again.')) return
    setUpdating(true); setMessage(null)
    const { data, error } = await supabase.rpc('pause_goal_for_week', { target_goal_id: goal.id })
    setUpdating(false)
    if (error) { setMessage(error.message || 'Goal could not be paused.'); return }
    setGoal({ ...goal, status: 'paused', pause_count: 1, pause_until: String(data) }); setMessage('Goal paused for seven days. Take care of yourself.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-4 flex items-center justify-center">
        <p className="text-xs text-slate-500 animate-pulse">Loading goal timeline...</p>
      </div>
    )
  }

  if (!goal) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 p-4 max-w-md mx-auto flex flex-col items-center justify-center space-y-3">
        <p className="text-sm font-bold">Goal not found</p>
        <Link href="/dashboard" className="text-xs text-amber-400 underline">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  const isCompleted = Boolean(goal.is_completed || goal.status === 'completed')
  const isOwner = goal.user_id === userId
  const isPaused = goal.status === 'paused' && Boolean(goal.pause_until && new Date(goal.pause_until) > new Date())

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100 pb-24 pt-4 px-4 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => router.back()} className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          ← Back
        </button>
        <div className="flex items-center gap-1">{isOwner && <><button onClick={() => setEditing(true)} aria-label="Edit goal" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 dark:border-slate-700"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void deleteGoal()} aria-label="Delete goal" className="grid h-8 w-8 place-items-center rounded-lg border border-rose-200 text-rose-500 dark:border-rose-900"><Trash2 className="h-3.5 w-3.5" /></button></>}<span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">{goal.category || 'Personal'}</span></div>
      </div>

      {/* Goal Summary Card */}
      <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-5 space-y-4 mb-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            {editing ? <div className="space-y-2"><input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={100} className="w-full rounded-xl border border-amber-500 bg-slate-50 px-3 py-2 text-sm font-bold outline-none dark:bg-slate-950" /><label className="block text-[10px] font-bold uppercase text-slate-500">Achievement date<input type="date" value={editTargetDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setEditTargetDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs normal-case dark:border-slate-700 dark:bg-slate-950" /></label><div className="flex gap-2"><button onClick={() => void saveGoal()} disabled={updating} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black text-slate-950"><Check className="h-3.5 w-3.5" />Save</button><button onClick={() => setEditing(false)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold dark:border-slate-700"><X className="h-3.5 w-3.5" />Cancel</button></div></div> : <h1 className="text-lg font-black">{goal.title}</h1>}
            <p className="mt-1 text-[11px] font-bold text-amber-400">
              🔥 {goal.current_streak || 0} day streak
            </p>
            {goal.target_date && <p className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-500"><CalendarDays className="h-3 w-3" />Target {new Date(`${goal.target_date}T00:00:00`).toLocaleDateString()}</p>}
            {isPaused && <p className="mt-1 text-[10px] font-bold text-sky-500">Paused until {new Date(goal.pause_until as string).toLocaleDateString()}</p>}
          </div>
          {!isPaused && <button
            onClick={toggleGoalCompletion}
            disabled={updating}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isCompleted
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {isCompleted ? '🎉 Completed' : 'Mark Complete'}
          </button>}
        </div>

        {message && <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300">{message}</p>}
        {isOwner && !isCompleted && !isPaused && Number(goal.pause_count || 0) === 0 && <button onClick={() => void pauseGoal()} disabled={updating} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-xs font-black text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300"><PauseCircle className="h-4 w-4" />Use one-time 7-day compassionate pause</button>}

        {/* Milestone Statistics */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 dark:bg-slate-950 dark:border-slate-800/60 text-center">
            <p className="text-lg font-black text-amber-400">{posts.length}</p>
            <p className="text-[10px] text-slate-500">Progress Updates</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 dark:bg-slate-950 dark:border-slate-800/60 text-center">
            <p className="text-lg font-black text-emerald-400">{isCompleted ? '100%' : 'In Progress'}</p>
            <p className="text-[10px] text-slate-500">Current Status</p>
          </div>
        </div>
      </div>

      {/* Progress Posts Timeline */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold px-1">Goal Timeline</h2>

        {posts.length === 0 ? (
          <div className="bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800/80 rounded-2xl p-6 text-center space-y-2">
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
            <div key={p.id} className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(p.created_at).toLocaleDateString()}
              </span>
              {p.caption && <p className="text-xs text-slate-700 dark:text-slate-200">{p.caption}</p>}
              {p.media_url && (p.proof_type === 'video' ? <video src={p.media_url} controls preload="metadata" playsInline className="max-h-96 w-full rounded-xl bg-slate-950 object-contain" /> : <div className="relative h-44 overflow-hidden rounded-xl"><Image src={p.media_url} alt="Goal proof" fill unoptimized className="object-cover" /></div>)}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
