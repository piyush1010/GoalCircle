'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'

type TimerMode = 'work' | 'shortBreak' | 'longBreak' | 'deepWork'

interface FocusSessionLog {
  id: string
  goalTitle: string
  durationMinutes: number
  notes: string
  timestamp: string
}

const TIMER_PRESETS: Record<TimerMode, { label: string; minutes: number; emoji: string }> = {
  work: { label: 'Pomodoro', minutes: 25, emoji: '⏱️' },
  shortBreak: { label: 'Short Break', minutes: 5, emoji: '☕' },
  longBreak: { label: 'Long Break', minutes: 15, emoji: '🧘' },
  deepWork: { label: 'Deep Work', minutes: 45, emoji: '⚡' },
}

const AMBIENT_SOUNDS = [
  { id: 'lofi', name: 'Lofi Beats', emoji: '🎧', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'rain', name: 'Rain & Thunder', emoji: '🌧️', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'cafe', name: 'Coffee Shop', emoji: '☕', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'white', name: 'White Noise', emoji: '🌊', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
]

export default function FocusRoomPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  // Timer State
  const [timerMode, setTimerMode] = useState<TimerMode>('work')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)

  // Goal & Reflection State
  const [selectedGoal, setSelectedGoal] = useState('Read 30 Pages Daily')
  const [sessionNotes, setSessionNotes] = useState('')
  const [todayMinutes, setTodayMinutes] = useState(75)
  const [weeklyHours, setWeeklyHours] = useState(4.5)
  const [completedSessionsCount, setCompletedSessionsCount] = useState(3)

  // Audio & Soundscape State
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null)
  const [volume, setVolume] = useState(0.5)
  const [showCompletionModal, setShowCompletionModal] = useState(false)

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({})
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize Audio Volume
  useEffect(() => {
    Object.values(audioRefs.current).forEach((audio) => {
      if (audio) audio.volume = volume
    })
  }, [volume])

  // Timer Countdown Logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setIsRunning(false)
            playCompletionChime()
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRunning])

  // Timer Mode Preset Switcher
  const handleModeChange = (mode: TimerMode) => {
    setIsRunning(false)
    setTimerMode(mode)
    setSecondsLeft(TIMER_PRESETS[mode].minutes * 60)
  }

  // Play Completion Chime using Web Audio API
  const playCompletionChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5) // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 1)
    } catch (e) {
      console.error(e)
    }
  }

  // Handle Session Completion
  const handleTimerComplete = () => {
    const elapsedMins = TIMER_PRESETS[timerMode].minutes
    if (timerMode === 'work' || timerMode === 'deepWork') {
      setTodayMinutes((prev) => prev + elapsedMins)
      setWeeklyHours((prev) => Number((prev + elapsedMins / 60).toFixed(1)))
      setCompletedSessionsCount((prev) => prev + 1)
    }
    setShowCompletionModal(true)
  }

  // Soundscape Toggle
  const toggleSoundscape = (soundId: string) => {
    if (activeSoundId === soundId) {
      audioRefs.current[soundId]?.pause()
      setActiveSoundId(null)
    } else {
      if (activeSoundId && audioRefs.current[activeSoundId]) {
        audioRefs.current[activeSoundId]?.pause()
      }
      setActiveSoundId(soundId)
      const audio = audioRefs.current[soundId]
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
    }
  }

  // Formatting Helper
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainder = secs % 60
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`
  }

  const totalPresetSeconds = TIMER_PRESETS[timerMode].minutes * 60
  const progressPercent = Math.min(100, Math.max(0, ((totalPresetSeconds - secondsLeft) / totalPresetSeconds) * 100))

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 select-none pb-28 ${isZenMode ? 'p-6 flex flex-col justify-center items-center' : 'p-4 max-w-md mx-auto space-y-5'}`}>
      
      {/* Hidden Audio Elements */}
      {AMBIENT_SOUNDS.map((sound) => (
        <audio
          key={sound.id}
          ref={(el) => { audioRefs.current[sound.id] = el }}
          src={sound.url}
          loop
          preload="none"
        />
      ))}

      {/* ZEN MODE OVERLAY VIEW */}
      {isZenMode ? (
        <div className="w-full max-w-sm text-center space-y-8 animate-fade-in">
          <div className="flex justify-between items-center w-full">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
              <span>⚡ Zen Focus Mode</span>
            </span>
            <button
              onClick={() => setIsZenMode(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-500 transition"
            >
              Exit Zen (✕)
            </button>
          </div>

          {/* Breathing Circular Ring Display */}
          <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="128" cy="128" r="110" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
              <circle
                cx="128"
                cy="128"
                r="110"
                className="stroke-amber-500 transition-all duration-1000"
                strokeWidth="8"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 * (1 - progressPercent / 100)}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute text-center">
              <span className="block text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {formatTime(secondsLeft)}
              </span>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider mt-1 block">
                {TIMER_PRESETS[timerMode].label}
              </span>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition active:scale-95"
            >
              {isRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button
              onClick={() => handleModeChange(timerMode)}
              className="px-4 py-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-2xl transition active:scale-95"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* STANDARD FOCUS ROOM HEADER */}
          <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                ⚡ Focus Room
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Deep work timer, ambient beats & streak logging
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsZenMode(true)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:border-amber-500 transition"
                title="Fullscreen Zen Mode"
              >
                🧘 Zen Mode
              </button>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-xl border text-xs font-bold transition bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-400"
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>

          {/* TIMER PRESET MODE TOGGLERS */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {(Object.keys(TIMER_PRESETS) as TimerMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`py-2 text-[10px] font-extrabold rounded-xl transition flex flex-col items-center gap-0.5 ${
                  timerMode === mode
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{TIMER_PRESETS[mode].emoji}</span>
                <span>{TIMER_PRESETS[mode].label}</span>
              </button>
            ))}
          </div>

          {/* MAIN TIMER DISPLAY & GOAL SELECTOR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-sm relative overflow-hidden space-y-4">
            
            {/* Active Goal Routing Selector */}
            <div className="max-w-xs mx-auto">
              <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-1">
                Active Goal Focus
              </label>
              <select
                value={selectedGoal}
                onChange={(e) => setSelectedGoal(e.target.value)}
                className="w-full text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 text-center"
              >
                <option value="Read 30 Pages Daily">📖 Read 30 Pages Daily</option>
                <option value="Morning 5km Run">🏃 Morning 5km Run</option>
                <option value="Deep Work Coding">💻 Deep Work Coding</option>
                <option value="Meditation & Yoga">🧘 Meditation & Yoga</option>
              </select>
            </div>

            {/* Circular Timer Visual */}
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="84" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                <circle
                  cx="96"
                  cy="96"
                  r="84"
                  className="stroke-amber-500 transition-all duration-1000"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 84}
                  strokeDashoffset={2 * Math.PI * 84 * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center">
                <span className="block text-4xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest mt-0.5 block">
                  {isRunning ? 'Focusing...' : 'Paused'}
                </span>
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex justify-center gap-3 pt-1">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
              >
                <span>{isRunning ? '⏸' : '▶'}</span>
                <span>{isRunning ? 'Pause Session' : 'Start Focus'}</span>
              </button>
              <button
                onClick={() => handleModeChange(timerMode)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition active:scale-95"
              >
                🔄 Reset
              </button>
            </div>
          </div>

          {/* AMBIENT SOUNDSCAPES CONTROLLER */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                🎧 Ambient Soundscapes
              </label>
              {activeSoundId && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-500 font-bold">Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-16 accent-amber-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {AMBIENT_SOUNDS.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => toggleSoundscape(sound.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                    activeSoundId === sound.id
                      ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{sound.emoji}</span>
                    <span>{sound.name}</span>
                  </span>
                  <span className="text-[10px]">{activeSoundId === sound.id ? '⏸ Playing' : '▶ Play'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SESSION REFLECTION & NOTES SCRATCHPAD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
            <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              📝 Session Reflection Scratchpad
            </label>
            <textarea
              rows={2}
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Jot down breakthroughs, key pages read, or code commits..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* FOCUS ANALYTICS GRID */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
              <span className="block text-base font-black text-slate-900 dark:text-white">{todayMinutes}m</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Today</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
              <span className="block text-base font-black text-amber-500">{weeklyHours} / 10h</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Weekly</span>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm">
              <span className="block text-base font-black text-emerald-500">🔥 {completedSessionsCount}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sessions</span>
            </div>
          </div>
        </>
      )}

      {/* SESSION COMPLETION MODAL */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs rounded-3xl p-5 border text-center space-y-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <span className="text-4xl block">🎉</span>
            <div>
              <h2 className="font-black text-base text-slate-900 dark:text-white">Session Completed!</h2>
              <p className="text-xs text-amber-500 font-bold mt-1">
                +{TIMER_PRESETS[timerMode].minutes} mins logged to {selectedGoal}
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              Your 28-day streak matrix and progress stats have been updated automatically.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  router.push('/feed')
                }}
                className="flex-1 bg-amber-500 text-slate-950 font-bold py-2 rounded-xl text-xs hover:bg-amber-400 transition"
              >
                View Feed
              </button>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-2 rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}