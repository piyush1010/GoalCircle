'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ListTodo, Plus, Target, Trash2 } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface TodoItem {
  id: string
  title: string
  goal_id: string | null
  is_completed: boolean
}

interface GoalOption {
  id: string
  title: string
}

function localDateKey(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export default function TodoWidget({ userId }: { userId: string }) {
  const [items, setItems] = useState<TodoItem[]>([])
  const [goals, setGoals] = useState<GoalOption[]>([])
  const [title, setTitle] = useState('')
  const [goalId, setGoalId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = useMemo(() => localDateKey(), [])

  const loadWidget = useCallback(async () => {
    const [itemsResult, goalsResult] = await Promise.all([
      supabase
        .from('todo_items')
        .select('id,title,goal_id,is_completed')
        .eq('user_id', userId)
        .eq('due_date', today)
        .order('is_completed', { ascending: true })
        .order('position', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('goals')
        .select('id,title')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('created_at', { ascending: false }),
    ])

    if (itemsResult.error) {
      setError('Your Today list could not be loaded.')
    } else {
      setItems((itemsResult.data || []) as TodoItem[])
    }
    if (!goalsResult.error) setGoals((goalsResult.data || []) as GoalOption[])
    setLoading(false)
  }, [today, userId])

  useEffect(() => {
    void Promise.resolve().then(loadWidget)
  }, [loadWidget])

  const addItem = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle || saving) return
    setSaving(true)
    setError(null)

    const { data, error: insertError } = await supabase
      .from('todo_items')
      .insert({
        user_id: userId,
        goal_id: goalId || null,
        title: cleanTitle,
        due_date: today,
        position: items.length,
      })
      .select('id,title,goal_id,is_completed')
      .single()

    if (insertError || !data) {
      setError('Task could not be added. Please try again.')
    } else {
      setItems((current) => [...current, data as TodoItem])
      setTitle('')
      setGoalId('')
    }
    setSaving(false)
  }

  const toggleItem = async (item: TodoItem) => {
    const nextValue = !item.is_completed
    setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, is_completed: nextValue } : candidate))
    const { error: updateError } = await supabase
      .from('todo_items')
      .update({ is_completed: nextValue, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('user_id', userId)
    if (updateError) {
      setItems((current) => current.map((candidate) => candidate.id === item.id ? item : candidate))
      setError('Task could not be updated.')
    }
  }

  const deleteItem = async (item: TodoItem) => {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id))
    const { error: deleteError } = await supabase
      .from('todo_items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', userId)
    if (deleteError) {
      setItems((current) => [...current, item])
      setError('Task could not be removed.')
    }
  }

  const completedCount = items.filter((item) => item.is_completed).length
  const goalTitles = new Map(goals.map((goal) => [goal.id, goal.title]))

  return (
    <section aria-labelledby="today-list-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="today-list-title" className="flex items-center gap-2 text-sm font-bold">
            <ListTodo className="h-4 w-4 text-amber-500" /> Today
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">Small steps that move your goals forward.</p>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
          {completedCount}/{items.length} done
        </span>
      </div>

      <form onSubmit={addItem} className="mt-4 space-y-2">
        <div className="flex gap-2">
          <label htmlFor="todo-title" className="sr-only">Add a task for today</label>
          <input
            id="todo-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            placeholder="Add a small next step…"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none transition focus:border-amber-500 dark:border-slate-800 dark:bg-slate-950"
          />
          <button
            type="submit"
            disabled={!title.trim() || saving}
            aria-label="Add task"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 dark:bg-slate-50 text-white dark:text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {goals.length > 0 && (
          <label className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <Target className="h-3.5 w-3.5" />
            <span>Link to</span>
            <select
              value={goalId}
              onChange={(event) => setGoalId(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              <option value="">No goal</option>
              {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
          </label>
        )}
      </form>

      <div className="mt-4 space-y-2" aria-live="polite">
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((item) => <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-center dark:border-slate-800">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Your list is clear.</p>
            <p className="mt-1 text-xs text-slate-400">Add one achievable step for today.</p>
          </div>
        ) : items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => void toggleItem(item)}
              aria-label={item.is_completed ? `Mark ${item.title} incomplete` : `Mark ${item.title} complete`}
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition ${item.is_completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent dark:border-slate-700 dark:bg-slate-900'}`}
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-xs font-bold ${item.is_completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{item.title}</p>
              {item.goal_id && goalTitles.get(item.goal_id) && <p className="truncate text-[11px] text-amber-600 dark:text-amber-400">{goalTitles.get(item.goal_id)}</p>}
            </div>
            <button
              type="button"
              onClick={() => void deleteItem(item)}
              aria-label={`Delete ${item.title}`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-500">{error}</p>}
    </section>
  )
}
