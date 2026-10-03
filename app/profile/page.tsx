'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'

interface UserProfile {
  name: string
  handle: string
  bio: string
  avatarEmoji: string
  totalGoals: number
  streaks: number
  completed: number
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Piyush Kaushik',
  handle: '@piyushkaushik10',
  bio: 'Building habits, tracking goals, and staying accountable.',
  avatarEmoji: '🎯',
  totalGoals: 12,
  streaks: 5,
  completed: 8,
}

const MEMORY_REELS = [
  { id: '1', title: '100 Days Coding Sprint', duration: '0:45', thumbnail: '💻', date: 'Sep 15' },
  { id: '2', title: '5K Morning Run Streak', duration: '0:30', thumbnail: '🏃‍♂️', date: 'Sep 20' },
  { id: '3', title: 'Deep Focus Marathon', duration: '1:12', thumbnail: '⚡', date: 'Sep 28' },
]

export default function ProfilePage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [isEditing, setIsEditing] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Edit Form States
  const [editName, setEditName] = useState('')
  const [editHandle, setEditHandle] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editEmoji, setEditEmoji] = useState('')

  // Load profile from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('gc_user_profile')
    if (saved) {
      try {
        setProfile(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse saved profile:', e)
      }
    }
  }, [])

  // Start Editing
  const openEditModal = () => {
    setEditName(profile.name)
    setEditHandle(profile.handle)
    setEditBio(profile.bio)
    setEditEmoji(profile.avatarEmoji)
    setIsEditing(true)
  }

  // Save Profile Changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const updated: UserProfile = {
      ...profile,
      name: editName || profile.name,
      handle: editHandle.startsWith('@') ? editHandle : `@${editHandle || 'user'}`,
      bio: editBio,
      avatarEmoji: editEmoji || '🎯',
    }
    setProfile(updated)
    localStorage.setItem('gc_user_profile', JSON.stringify(updated))
    setIsEditing(false)
  }

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('gc_user_profile')
    localStorage.removeItem('gc_auth_token')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 max-w-md mx-auto space-y-4 pb-28 transition-colors duration-200 select-none">
      
      {/* HEADER & SETTINGS BUTTON */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          👤 My Profile
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-black text-slate-700 dark:text-slate-300 hover:border-amber-500 transition"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-xl border text-xs font-bold transition bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-amber-400"
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      {/* SETTINGS / LOGOUT DROPDOWN */}
      {showSettings && (
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={openEditModal}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition"
          >
            <span>✏️ Edit Profile Details</span>
            <span>→</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-500/10 text-xs font-bold text-rose-500 flex items-center justify-between transition"
          >
            <span>🚪 Log Out</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* PROFILE CARD */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-center space-y-3 relative">
        <button
          onClick={openEditModal}
          className="absolute top-4 right-4 text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl hover:bg-amber-500 hover:text-slate-950 transition"
        >
          Edit
        </button>

        <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-4xl shadow-inner">
          {profile.avatarEmoji}
        </div>

        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            {profile.name}
          </h2>
          <p className="text-xs font-bold text-amber-500">{profile.handle}</p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          {profile.bio}
        </p>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <p className="text-lg font-black text-slate-900 dark:text-white">
            {profile.totalGoals}
          </p>
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Total Goals
          </p>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <p className="text-lg font-black text-amber-500 flex items-center justify-center gap-0.5">
            🔥 {profile.streaks}
          </p>
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Streaks
          </p>
        </div>

        <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <p className="text-lg font-black text-emerald-500">
            {profile.completed}
          </p>
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Completed
          </p>
        </div>
      </div>

      {/* CONSISTENCY MATRIX */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-slate-900 dark:text-white">
            28-Day Consistency Matrix
          </span>
          <span className="font-extrabold text-amber-500 text-[10px]">
            25 Active Days
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {Array.from({ length: 28 }).map((_, i) => {
            const isActive = i !== 6 && i !== 13 && i !== 27
            return (
              <div
                key={i}
                className={`h-7 rounded-lg transition ${
                  isActive
                    ? 'bg-amber-500 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/60'
                }`}
                title={`Day ${i + 1}: ${isActive ? 'Completed' : 'Rest'}`}
              />
            )
          })}
        </div>
      </div>

      {/* MEMORY JOURNEY REELS */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            📹 Memory Journey Reels
          </span>
          <span className="text-[10px] font-extrabold text-slate-400">
            Auto-Generated
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MEMORY_REELS.map((reel) => (
            <div
              key={reel.id}
              className="relative aspect-3/4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 overflow-hidden group cursor-pointer flex flex-col justify-between p-2 shadow-xs"
            >
              <div className="flex items-center justify-end">
                <span className="px-1.5 py-0.5 rounded-md bg-slate-950/70 text-white text-[9px] font-mono font-bold backdrop-blur-xs">
                  {reel.duration}
                </span>
              </div>

              <div className="text-center my-auto text-2xl group-hover:scale-110 transition">
                {reel.thumbnail}
              </div>

              <div className="truncate">
                <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">
                  {reel.title}
                </p>
                <p className="text-[8px] font-bold text-slate-400">{reel.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                ✏️ Edit Profile
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-base font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Username / Handle
                  </label>
                  <input
                    type="text"
                    required
                    value={editHandle}
                    onChange={(e) => setEditHandle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Emoji Avatar
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-center focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}