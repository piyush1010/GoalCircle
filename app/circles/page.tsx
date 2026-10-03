'use client'

import React, { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

interface Circle {
  id: string
  name: string
  description?: string
  member_count: number
  is_joined: boolean
  category: string
}

export default function CirclesPage() {
  const router = useRouter()
  const [circles, setCircles] = useState<Circle[]>([
    {
      id: '1',
      name: '5 AM Club',
      description: 'Early risers building high-productivity morning routines.',
      member_count: 142,
      is_joined: true,
      category: 'ROUTINE',
    },
    {
      id: '2',
      name: 'Daily Coders & Builders',
      description: 'Shipping side projects, habit tracking, and code consistency.',
      member_count: 89,
      is_joined: false,
      category: 'TECH',
    },
    {
      id: '3',
      name: '30-Day Fitness Challenge',
      description: 'Daily workouts, progress updates, and mutual accountability.',
      member_count: 210,
      is_joined: false,
      category: 'FITNESS',
    },
  ])
  const [searchQuery, setSearchQuery] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const toggleJoinCircle = (circleId: string) => {
    setCircles((prev) =>
      prev.map((c) =>
        c.id === circleId
          ? {
              ...c,
              is_joined: !c.is_joined,
              member_count: c.is_joined ? c.member_count - 1 : c.member_count + 1,
            }
          : c
      )
    )
  }

  const filteredCircles = circles.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-4 max-w-md mx-auto space-y-5 pb-28 text-slate-800 dark:text-slate-200 select-none">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            👥 Accountability Circles
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Join groups & stay accountable together
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accountability circles..."
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Circles Roster */}
      <div className="space-y-3">
        {filteredCircles.map((circle) => (
          <div
            key={circle.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {circle.category}
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                👥 {circle.member_count} Members
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {circle.name}
              </h3>
              {circle.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {circle.description}
                </p>
              )}
            </div>

            <button
              onClick={() => toggleJoinCircle(circle.id)}
              className={`w-full py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2 border ${
                circle.is_joined
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-500'
              }`}
            >
              {circle.is_joined ? '✓ Joined Circle' : '+ Join Circle'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}