'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({
    full_name: '',
    handle: '',
    avatar_url: '',
    bio: '',
    total_goals: 0,
    streaks: 0,
    completed: 0,
  })

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadUserData = async (currentUser: any) => {
      if (!isMounted) return
      setUser(currentUser)
      await fetchProfile(currentUser)
      if (isMounted) setLoading(false)
    }

    // 1. Listen for auth state changes (captures OAuth redirects & session sync)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      if (session?.user) {
        await loadUserData(session.user)
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setLoading(false)
          router.push('/login')
        }
      }
    })

    // 2. Direct session check fallback
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return

      if (session?.user) {
        await loadUserData(session.user)
      } else {
        // If there's an OAuth hash token in the URL, give Supabase a second to parse it
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          return
        }

        // Small delay to prevent premature redirection on fast clicks
        setTimeout(() => {
          if (isMounted && !user) {
            setLoading(false)
            router.push('/login')
          }
        }, 600)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  const fetchProfile = async (currentUser: any) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (data) {
        setProfile(data)
        setEditName(data.full_name || '')
        setEditBio(data.bio || '')
      } else {
        const defaultName =
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split('@')[0] ||
          'Goal Circles Member'

        const fallbackProfile = {
          full_name: defaultName,
          handle: `@${currentUser.email?.split('@')[0] || 'member'}`,
          avatar_url: currentUser.user_metadata?.avatar_url || '',
          bio: 'Building habits, tracking goals, and staying accountable.',
          total_goals: 0,
          streaks: 0,
          completed: 0,
        }

        setProfile(fallbackProfile)
        setEditName(defaultName)
        setEditBio(fallbackProfile.bio)
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setProfile((prev) => ({ ...prev, full_name: editName, bio: editBio }))
    setIsEditing(false)

    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: editName,
        bio: editBio,
        updated_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('gc_auth_token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-24 max-w-md mx-auto space-y-6">
      {/* HEADER & SIGN OUT */}
      <div className="flex justify-between items-center pt-2">
        <h1 className="text-xl font-black text-white tracking-wide">Profile</h1>
        <button
          onClick={handleSignOut}
          className="text-xs font-extrabold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 transition"
        >
          Sign Out
        </button>
      </div>

      {/* USER CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-2xl font-black text-amber-500 overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              profile.full_name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white truncate">{profile.full_name || 'Member'}</h2>
            <p className="text-xs text-amber-400 font-bold truncate">{profile.handle || '@member'}</p>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{profile.bio}</p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
          <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-800/80">
            <p className="text-[10px] uppercase font-black text-slate-500">Goals</p>
            <p className="text-sm font-black text-white">{profile.total_goals}</p>
          </div>
          <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-800/80">
            <p className="text-[10px] uppercase font-black text-slate-500">Streak</p>
            <p className="text-sm font-black text-amber-500">{profile.streaks} 🔥</p>
          </div>
          <div className="bg-slate-950/50 p-2 rounded-2xl border border-slate-800/80">
            <p className="text-[10px] uppercase font-black text-slate-500">Done</p>
            <p className="text-sm font-black text-emerald-400">{profile.completed}</p>
          </div>
        </div>

        {/* EDIT PROFILE FORM */}
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition"
          >
            Edit Profile
          </button>
        ) : (
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONSISTENCY MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Consistency Matrix</h3>
          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Last 30 Days</span>
        </div>
        <div className="grid grid-cols-10 gap-1.5 pt-1">
          {Array.from({ length: 30 }).map((_, i) => {
            const isActive = i % 3 === 0 || i % 5 === 0
            return (
              <div
                key={i}
                className={`h-6 rounded-md transition ${
                  isActive ? 'bg-amber-500 border border-amber-400' : 'bg-slate-950 border border-slate-800/60'
                }`}
                title={`Day ${i + 1}`}
              />
            )
          })}
        </div>
      </div>

      {/* MEMORY REELS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3 shadow-xl">
        <h3 className="text-xs font-black uppercase text-slate-300 tracking-wider">Memory Reels</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="aspect-video bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-3 text-center space-y-1">
            <span className="text-xl">🎥</span>
            <p className="text-[10px] font-bold text-slate-300">September Recap</p>
            <p className="text-[9px] text-slate-500">Generated automatically</p>
          </div>
          <div className="aspect-video bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center p-3 text-center text-slate-600">
            <span className="text-lg">✨</span>
            <p className="text-[10px] font-bold">October Recap</p>
            <p className="text-[9px]">Unlocks in 28 days</p>
          </div>
        </div>
      </div>
    </div>
  )
}