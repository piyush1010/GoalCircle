'use client'

import React from 'react'

interface HeatmapProps {
  logs: { completed_at: string }[]
  color?: string
}

export default function HabitHeatmap({ logs, color = 'bg-green-500' }: HeatmapProps) {
  const completedDates = new Set(logs.map(l => l.completed_at))
  
  // Generate last 90 days
  const days = Array.from({ length: 90 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (89 - i))
    return d.toISOString().split('T')[0]
  })

  return (
    <div className="p-4 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800">
      <h3 className="text-sm font-medium mb-3 text-slate-400">90-Day Consistency Grid</h3>
      <div className="grid grid-rows-7 grid-flow-col gap-1.5 overflow-x-auto pb-2">
        {days.map(date => {
          const isDone = completedDates.has(date)
          return (
            <div
              key={date}
              title={date}
              className={`w-3.5 h-3.5 rounded-sm transition-colors ${
                isDone ? color : 'bg-slate-800 hover:bg-slate-700'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}