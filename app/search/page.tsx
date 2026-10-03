'use client'

import React, { useState } from 'react'

interface SearchResult {
  id: string
  type: 'goal' | 'circle' | 'user'
  title: string
  subtitle: string
  meta?: string
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'goals' | 'circles' | 'users'>('all')

  const sampleResults: SearchResult[] = [
    {
      id: '1',
      type: 'goal',
      title: 'read 20 pages daily',
      subtitle: 'Target: Oct 31, 2026',
      meta: '🔥 5 day streak',
    },
    {
      id: '2',
      type: 'circle',
      title: '5 AM Club',
      subtitle: 'Early risers building high-productivity morning routines.',
      meta: '👥 142 members',
    },
    {
      id: '3',
      type: 'user',
      title: 'Aarav Sharma',
      subtitle: '@aarav_s',
      meta: '12 goals completed',
    },
  ]

  const filteredResults = sampleResults.filter((item) => {
    const matchesQuery =
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(query.toLowerCase())
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'goals' && item.type === 'goal') ||
      (activeTab === 'circles' && item.type === 'circle') ||
      (activeTab === 'users' && item.type === 'user')

    return matchesQuery && matchesTab
  })

  return (
    <div className="p-4 max-w-md mx-auto space-y-5 pb-28 text-slate-800 dark:text-slate-200 select-none">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          🔍 Search & Discover
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Find goals, circles, and accountability partners
        </p>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search goals, circles, or users..."
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'goals', 'circles', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
              activeTab === tab
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Results Feed */}
      <div className="space-y-3">
        {filteredResults.length > 0 ? (
          filteredResults.map((result) => (
            <div
              key={result.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {result.title}
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {result.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {result.subtitle}
                </p>
              </div>

              {result.meta && (
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                  {result.meta}
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
            <span className="text-2xl">🔎</span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              No results found for &quot;{query}&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}