'use client'

import React, { useState, useEffect } from 'react'

export default function FocusRoom({ roomName = 'Silent Pomodoro', initialMinutes = 25 }) {
  const [timeLeft, setTimeLeft] = useState(initialMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    }
    return () => clearInterval(timer)
  }, [isRunning, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-center">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Live Focus Room
        </span>
        <span className="text-xs text-slate-400">👥 4 In Circle Working</span>
      </div>

      <h3 className="text-sm font-bold text-white">{roomName}</h3>

      <div className="text-4xl font-black text-amber-400 tracking-wider my-2 font-mono">
        {formatTime(timeLeft)}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition text-xs"
        >
          {isRunning ? 'Pause' : 'Start Focus Session'}
        </button>
        <button
          onClick={() => {
            setIsRunning(false)
            setTimeLeft(initialMinutes * 60)
          }}
          className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs"
        >
          Reset
        </button>
      </div>
    </div>
  )
}