'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Safe Supabase Client Initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface MemoryReel {
  id: string
  title: string
  date: string
  thumbnailUrl: string
  duration: string
}

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Profile Information
  const [fullName, setFullName] = useState<string>('Piyush Kaushik')
  const [username, setUsername] = useState<string>('@piyushkaushik10')
  const [bio, setBio] = useState<string>('Building habits, tracking goals, and staying accountable.')

  // Avatar State: Photo Upload vs Neutral Emoji Presets
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [selectedPresetAvatar, setSelectedPresetAvatar] = useState<string>('🎯')
  const [isEditingAvatar, setIsEditingAvatar] = useState(false)

  // Gender-neutral and race-neutral avatar options
  const avatarPresets = ['🎯', '🔥', '🚀', '⚡', '🌟', '🏆', '💎', '🧘', '🎨', '🧠', '🤖']

  // Memory Journey Reels
  const [reels] = useState<MemoryReel[]>([
    {
      id: '1',
      title: '30-Day Fitness Challenge Recap',
      date: 'Sep 2026',
      thumbnailUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&auto=format&fit=crop&q=60',
      duration: '0:45',
    },
    {
      id: '2',
      title: 'Reading Atomic Habits Journey',
      date: 'Aug 2026',
      thumbnailUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400&auto=format&fit=crop&q=60',
      duration: '0:30',
    },
    {
      id: '3',
      title: 'Deep Work Session Highlights',
      date: 'Jul 2026',
      thumbnailUrl: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&auto=format&fit=crop&q=60',
      duration: '1:12',
    },
  ])

  // Fetch Supabase User & Profile Data on Mount
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (data && !error) {
            if (data.full_name) setFullName(data.full_name)
            if (data.username) setUsername(`@${data.username.replace('@', '')}`)
            if (data.bio) setBio(data.bio)
            if (data.avatar_url) setAvatarUrl(data.avatar_url)
          }
        }
      } catch (err) {
        console.error('Error fetching Supabase profile:', err)
      }
    }
    loadUserProfile()
  }, [])

  // Handle Photo Upload from Gallery
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAvatarUrl(url)
      setIsEditingAvatar(false)
    }
  }

  // Handle Supabase Sign Out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Error signing out:', err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-24 pt-4 px-4 max-w-md mx-auto transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          👤 My Profile
        </h1>
        <Link
          href="/settings"
          className="text-xs font-bold text-amber-600 dark:text-amber-500 hover:underline transition flex items-center gap-1"
        >
          ⚙️ Settings
        </Link>
      </div>

      {/* PROFILE HEADER & AVATAR EDITING */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center mb-6 shadow-md dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-amber-500 flex items-center justify-center text-3xl font-bold text-amber-500 overflow-hidden mx-auto shadow-md shadow-amber-500/10">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{selectedPresetAvatar}</span>
            )}
          </div>
          <button
            onClick={() => setIsEditingAvatar(!isEditingAvatar)}
            className="absolute bottom-0 right-0 bg-amber-500 text-slate-950 p-1.5 rounded-full text-xs font-bold shadow hover:bg-amber-400 transition"
            title="Change Avatar"
          >
            📷
          </button>
        </div>

        <h2 className="text-lg font-black text-slate-900 dark:text-white">{fullName}</h2>
        <p className="text-xs text-amber-600 dark:text-amber-500 font-semibold mb-2">{username}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto font-medium">
          {bio}
        </p>

        {/* AVATAR PICKER & PHOTO UPLOAD CONTROLS */}
        {isEditingAvatar && (
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition-all">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Choose Neutral Avatar Icon:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {avatarPresets.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    setSelectedPresetAvatar(emoji)
                    setAvatarUrl(null)
                    setIsEditingAvatar(false)
                  }}
                  className={`w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border flex items-center justify-center text-lg ${
                    selectedPresetAvatar === emoji && !avatarUrl
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Or upload custom image:</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-xs px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition"
              >
                Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-center">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
          <span className="block text-lg font-black text-slate-900 dark:text-white">12</span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Goals
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
          <span className="block text-lg font-black text-amber-600 dark:text-amber-500">🔥 5</span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Streaks
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm transition-colors">
          <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">8</span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Completed
          </span>
        </div>
      </div>

      {/* 28-DAY CONSISTENCY MATRIX */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            28-Day Consistency Matrix
          </span>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500">25 Active Days</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, idx) => {
            const isActive = idx !== 6 && idx !== 13 && idx !== 20
            return (
              <div
                key={idx}
                className={`aspect-square rounded-md transition ${
                  isActive
                    ? 'bg-amber-500 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-100 dark:bg-slate-800/80'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* MEMORY JOURNEY REELS */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
            🎬 Memory Journey Reels
          </h3>
          <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold">Auto-Generated</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="relative aspect-[9/16] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group cursor-pointer shadow-sm"
            >
              <img
                src={reel.thumbnailUrl}
                alt={reel.title}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />
              
              <div className="absolute top-2 right-2 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                {reel.duration}
              </div>

              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">
                  {reel.title}
                </p>
                <span className="text-[9px] text-amber-400 font-medium">
                  {reel.date}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACCOUNT ACTIONS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm transition-colors">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-3">
          Account Actions
        </span>
        <div className="space-y-2">
          <Link
            href="/settings"
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition"
          >
            <span>✏️ Edit Profile Settings</span>
            <span className="text-slate-400 dark:text-slate-500">→</span>
          </Link>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-between p-2.5 rounded-lg bg-rose-50 dark:bg-slate-950 border border-rose-200 dark:border-slate-800 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:border-rose-300 dark:hover:border-rose-900/50 transition"
          >
            <span>🚪 Sign Out</span>
            <span className="text-rose-400 dark:text-slate-500">→</span>
          </button>
        </div>
      </div>
    </div>
  )
}