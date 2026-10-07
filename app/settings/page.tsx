'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme, type Theme } from '@/components/ThemeProvider'
import AvatarEditor from '@/components/AvatarEditor'
import { supabase } from '@/utils/supabase'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [onboardingNext] = useState(() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    const requestedNext = params.get('next')
    return params.get('onboarding') === '1' && requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : null
  })

  // Profile Form States
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  // Preference & App States
  const [defaultLandingPage, setDefaultLandingPage] = useState(() => {
    if (typeof window === 'undefined') return '/dashboard'
    return localStorage.getItem('defaultLandingPage') || '/dashboard'
  })
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [isPublicProfile, setIsPublicProfile] = useState(true)

  // Status & Feedback States
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [passwordResetSent, setPasswordResetSent] = useState(false)

  // Load profile settings
  useEffect(() => {
    async function fetchProfileData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (data) {
            setFullName(data.full_name || '')
            setUsername(data.username || '')
            setBio(data.bio || '')
            setAvatarUrl(data.avatar_url || user.user_metadata?.avatar_url || null)
            if (typeof data.is_public === 'boolean') setIsPublicProfile(data.is_public)
          }
        }
      } catch (err) {
        console.error('Error fetching settings profile:', err)
      }
    }
    fetchProfileData()
  }, [])

  const handleThemeChange = (mode: Theme) => {
    setTheme(mode)
  }

  const handleAvatarSaved = async (nextAvatar: string) => {
    if (!userId) return
    setAvatarUrl(nextAvatar)
    const [{ error: profileError }, { error: authError }] = await Promise.all([
      supabase.from('profiles').upsert({ id: userId, avatar_url: nextAvatar, updated_at: new Date().toISOString() }),
      supabase.auth.updateUser({ data: { avatar_url: nextAvatar } }),
    ])
    setSaveMessage(profileError || authError ? 'Avatar could not be saved.' : 'Profile picture updated!')
  }

  // Save Landing Preference
  const handleLandingPageChange = (route: string) => {
    setDefaultLandingPage(route)
    localStorage.setItem('defaultLandingPage', route)
  }

  // Save Settings to Supabase
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveMessage('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName,
            username: username.replace('@', ''),
            bio,
            avatar_url: avatarUrl,
            is_public: isPublicProfile,
            is_onboarded: true,
            updated_at: new Date().toISOString(),
          })

        if (!error) {
          await supabase.auth.updateUser({ data: { full_name: fullName, handle: `@${username.replace('@', '')}`, avatar_url: avatarUrl } })
          setSaveMessage('Settings saved successfully!')
          if (onboardingNext) {
            router.replace(onboardingNext)
            return
          }
          setTimeout(() => setSaveMessage(''), 3000)
        } else {
          setSaveMessage('Failed to save settings.')
        }
      }
    } catch (err) {
      console.error('Error updating settings:', err)
      setSaveMessage('Error saving settings.')
    } finally {
      setIsSaving(false)
    }
  }

  // Password Reset Email Trigger
  const handlePasswordReset = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      setPasswordResetSent(true)
      setTimeout(() => setPasswordResetSent(false), 4000)
    }
  }

  // Export User Goal & History Data (JSON)
  const handleExportData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: goals } = await supabase.from('goals').select('*').eq('user_id', user.id)
      const exportObject = {
        user: { id: user.id, email: user.email, fullName, username },
        exportedAt: new Date().toISOString(),
        goals: goals || [],
      }

      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `goalcircle_export_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="p-4 max-w-md mx-auto space-y-5 pb-28 text-slate-800 dark:text-slate-200 select-none">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          ⚙️ App Settings
        </h1>
        <button
          onClick={() => router.back()}
          className="text-xs font-bold text-amber-500 hover:underline"
        >
          ← Back
        </button>
      </div>

      {/* SECTION 1: ACCOUNT DETAILS */}
      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
          👤 Account Information
        </label>

        {userId && <AvatarEditor userId={userId} value={avatarUrl} name={fullName || username || 'GoalCircle member'} onSaved={(value) => void handleAvatarSaved(value)} />}

        <div className="border-t border-slate-100 pt-3 dark:border-slate-800" />

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Piyush Kaushik"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="piyushkaushik10"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Bio / Goal Vision
          </label>
          <textarea
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Building daily consistency, tracking habits, and completing GoalCircle challenges."
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 transition resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            disabled={isSaving}
            className="py-2 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition shadow-sm active:scale-95"
          >
            {isSaving ? 'Saving...' : 'Save Profile Details'}
          </button>
          {saveMessage && (
            <span className="text-xs font-bold text-amber-500">{saveMessage}</span>
          )}
        </div>
      </form>

      {/* SECTION 2: THEME & LANDING VIEW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-2">
            🎨 Theme Preference
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleThemeChange(mode)}
                className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border active:scale-95 ${
                  theme === mode
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-500'
                }`}
              >
                {mode === 'light' ? '☀️ Light' : mode === 'dark' ? '🌙 Dark' : '💻 System'}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Default View on Launch
          </label>
          <select
            value={defaultLandingPage}
            onChange={(e) => handleLandingPageChange(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="/dashboard">📊 Dashboard (Matrix & Habits)</option>
            <option value="/feed">🔥 Activity Feed</option>
            <option value="/circles">👥 Circles & Social</option>
            <option value="/profile">👤 Profile Page</option>
          </select>
        </div>
      </div>

      {/* SECTION 3: NOTIFICATIONS & REMINDERS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
          🔔 Notifications & Reminders
        </label>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Push Notifications</h3>
            <p className="text-[10px] text-slate-400">Streak saver nudges & activity alerts</p>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              notificationsEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          >
            <span
              className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                notificationsEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {notificationsEnabled && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Streak Saver Reminder</span>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* SECTION 4: PRIVACY & DATA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
          🔒 Privacy & Data Export
        </label>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Public Matrix & Badges</h3>
            <p className="text-[10px] text-slate-400">Allow members in Circles to view your streak matrix</p>
          </div>
          <button
            type="button"
            onClick={() => setIsPublicProfile(!isPublicProfile)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              isPublicProfile ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'
            }`}
          >
            <span
              className={`block w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${
                isPublicProfile ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Export Goal Data</h3>
            <p className="text-[10px] text-slate-400">Download active goals & streak logs as JSON</p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl transition"
          >
            📥 Export
          </button>
        </div>
      </div>

      {/* SECTION 5: ACCOUNT SECURITY & SIGN OUT */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
        <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1">
          Security & Account Actions
        </label>

        <button
          type="button"
          onClick={handlePasswordReset}
          className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition mb-2"
        >
          <span>🔑 Reset Password via Email</span>
          <span>{passwordResetSent ? 'Sent! ✓' : '→'}</span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-2.5 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between transition"
        >
          <span>🚪 Log Out of GoalCircle</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
