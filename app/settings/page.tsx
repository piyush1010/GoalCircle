'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDisplayPreferences, useTheme, type Theme } from '@/components/ThemeProvider'
import AvatarEditor from '@/components/AvatarEditor'
import InstallAppCard from '@/components/InstallAppCard'
import { supabase } from '@/utils/supabase'
import { Bell, Download, KeyRound, LogOut, Monitor, Moon, Palette, Settings, Shield, Sun, Type, UserRound } from 'lucide-react'
import { readReminderPreferences, saveReminderPreferences } from '@/lib/notifications/reminderPreferences'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useDisplayPreferences()
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [reminderTime, setReminderTime] = useState('20:00')
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true)
  const [quietHoursStart, setQuietHoursStart] = useState('22:00')
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00')
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

  useEffect(() => {
    const reminderPreferences = readReminderPreferences()
    const loadPreferences = window.setTimeout(() => {
      setNotificationsEnabled(reminderPreferences.enabled)
      setReminderTime(reminderPreferences.time)
      setQuietHoursEnabled(reminderPreferences.quietHoursEnabled)
      setQuietHoursStart(reminderPreferences.quietHoursStart)
      setQuietHoursEnd(reminderPreferences.quietHoursEnd)
    }, 0)
    return () => window.clearTimeout(loadPreferences)
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

  const handleNotificationsToggle = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false)
      saveReminderPreferences({ enabled: false, time: reminderTime, quietHoursEnabled, quietHoursStart, quietHoursEnd })
      setSaveMessage('Daily reminder turned off.')
      return
    }

    if (!('Notification' in window)) {
      setSaveMessage('Notifications are not supported by this browser.')
      return
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
    if (permission !== 'granted') {
      setSaveMessage('Allow notifications in your browser to use reminders.')
      return
    }
    setNotificationsEnabled(true)
    saveReminderPreferences({ enabled: true, time: reminderTime, quietHoursEnabled, quietHoursStart, quietHoursEnd })
    setSaveMessage(`Daily reminder set for ${reminderTime}.`)
  }

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time)
    saveReminderPreferences({ enabled: notificationsEnabled, time, quietHoursEnabled, quietHoursStart, quietHoursEnd })
    if (notificationsEnabled) setSaveMessage(`Reminder time updated to ${time}.`)
  }

  const saveQuietHours = (enabled: boolean, start = quietHoursStart, end = quietHoursEnd) => {
    setQuietHoursEnabled(enabled); setQuietHoursStart(start); setQuietHoursEnd(end)
    saveReminderPreferences({ enabled: notificationsEnabled, time: reminderTime, quietHoursEnabled: enabled, quietHoursStart: start, quietHoursEnd: end })
    setSaveMessage(enabled ? `Quiet hours set from ${start} to ${end}.` : 'Quiet hours turned off.')
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
          <Settings className="h-4 w-4 text-amber-500" /> App Settings
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
        <label className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
          <UserRound className="h-3.5 w-3.5" /> Account Information
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
          <label className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-2">
            <Palette className="h-3.5 w-3.5" /> Theme Preference
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
                <span className="inline-flex items-center justify-center gap-1.5">{mode === 'light' ? <Sun className="h-3.5 w-3.5" /> : mode === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}{mode}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <Type className="h-3.5 w-3.5" /> Text Size
          </label>
          <div className="grid grid-cols-3 gap-2" aria-label="Choose text size">
            {([
              { value: 'small' as const, label: 'Small', sample: 'A' },
              { value: 'standard' as const, label: 'Standard', sample: 'A' },
              { value: 'large' as const, label: 'Large', sample: 'A' },
            ]).map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => setFontSize(option.value)}
                aria-pressed={fontSize === option.value}
                className={`rounded-xl border px-2 py-2.5 text-center transition ${fontSize === option.value ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}
              >
                <span className={`block font-black ${option.value === 'small' ? 'text-xs' : option.value === 'large' ? 'text-xl' : 'text-base'}`}>{option.sample}</span>
                <span className="mt-0.5 block text-[10px] font-bold">{option.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-slate-400">Changes apply across GoalCircle and stay on this device.</p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            View after sign-in
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
            <UserRound className="h-4 w-4 text-amber-500" />
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Profile Page</p>
              <p className="text-[10px] text-slate-400">Your goals, streaks, and account overview</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: NOTIFICATIONS & REMINDERS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
          <Bell className="h-3.5 w-3.5" /> Notifications & Reminders
        </label>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Daily browser reminder</h3>
            <p className="text-[10px] text-slate-400">A streak-saver prompt at your chosen time</p>
          </div>
          <button
            type="button"
            onClick={() => void handleNotificationsToggle()}
            aria-pressed={notificationsEnabled}
            aria-label={notificationsEnabled ? 'Turn off daily reminders' : 'Turn on daily reminders'}
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
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between"><div><h3 className="text-xs font-bold text-slate-900 dark:text-white">Quiet hours</h3><p className="text-[10px] text-slate-400">Pause reminders and social prompts overnight</p></div><button type="button" onClick={() => saveQuietHours(!quietHoursEnabled)} aria-pressed={quietHoursEnabled} className={`relative h-6 w-11 rounded-full transition-colors ${quietHoursEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}><span className={`absolute top-1 block h-4 w-4 rounded-full bg-white transition-transform ${quietHoursEnabled ? 'left-6' : 'left-1'}`} /></button></div>
          {quietHoursEnabled && <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-500">From<input type="time" value={quietHoursStart} onChange={(event) => saveQuietHours(true, event.target.value, quietHoursEnd)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950" /></label><label className="text-[10px] font-bold text-slate-500">Until<input type="time" value={quietHoursEnd} onChange={(event) => saveQuietHours(true, quietHoursStart, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950" /></label></div>}
        </div>
        <p className="text-[10px] leading-relaxed text-slate-400">You will receive one browser reminder after this time while GoalCircle is open. Background push delivery will be enabled in the next notification release.</p>
      </div>

      <InstallAppCard />

      {/* SECTION 4: PRIVACY & DATA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="flex items-center gap-1.5 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
          <Shield className="h-3.5 w-3.5" /> Privacy & Data Export
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
            <span className="inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" />Export</span>
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
          <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4" />Reset Password via Email</span>
          <span>{passwordResetSent ? 'Sent! ✓' : '→'}</span>
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full py-2.5 px-3 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between transition"
        >
          <span className="inline-flex items-center gap-2"><LogOut className="h-4 w-4" />Log Out of GoalCircle</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}
