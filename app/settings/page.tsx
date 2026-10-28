'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDisplayPreferences, useTheme, type Theme } from '@/components/ThemeProvider'
import InstallAppCard from '@/components/InstallAppCard'
import FeedbackCard from '@/components/FeedbackCard'
import { resetTours } from '@/components/GuideTour'
import GoalieToggle from '@/components/GoalieToggle'
import PushToggle from '@/components/PushToggle'
import { supabase } from '@/utils/supabase'
import { Bell, Download, KeyRound, LogOut, Monitor, Moon, Palette, Settings, Shield, Sun, Type, UserRound } from 'lucide-react'
import { readReminderPreferences, saveReminderPreferences } from '@/lib/notifications/reminderPreferences'
import { readDailyReminder, saveDailyReminder } from '@/lib/notifications/dailyReminder'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useDisplayPreferences()
  // Profile Form States
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
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
    // The server copy wins (it may have been turned on from the "remind me" prompt).
    void readDailyReminder().then((server) => {
      if (!server) return
      setNotificationsEnabled(server.enabled); setReminderTime(server.time)
    })
    return () => window.clearTimeout(loadPreferences)
  }, [])

  const handleThemeChange = (mode: Theme) => {
    setTheme(mode)
  }

  // One daily reminder: sent to your phone if you haven't checked in by that hour
  // (needs Phone notifications), and shown in the app if it's open.
  const handleNotificationsToggle = async () => {
    const next = !notificationsEnabled
    setNotificationsEnabled(next)
    saveReminderPreferences({ enabled: next, time: reminderTime, quietHoursEnabled, quietHoursStart, quietHoursEnd })
    const saved = await saveDailyReminder(next, reminderTime)
    if (!next) { setSaveMessage('Daily reminder turned off.'); return }
    const pushOn = typeof Notification !== 'undefined' && Notification.permission === 'granted'
    setSaveMessage(!saved ? `Reminder set for ${formatHour(reminderTime)} on this device.` : pushOn ? `We’ll remind you at ${formatHour(reminderTime)} if you haven’t checked in.` : `Reminder set for ${formatHour(reminderTime)}. Turn on Phone notifications so it reaches you when the app is closed.`)
  }

  const handleReminderTimeChange = (time: string) => {
    setReminderTime(time)
    saveReminderPreferences({ enabled: notificationsEnabled, time, quietHoursEnabled, quietHoursStart, quietHoursEnd })
    void saveDailyReminder(notificationsEnabled, time)
    if (notificationsEnabled) setSaveMessage(`Reminder time changed to ${formatHour(time)}.`)
  }

  const saveQuietHours = (enabled: boolean, start = quietHoursStart, end = quietHoursEnd) => {
    setQuietHoursEnabled(enabled); setQuietHoursStart(start); setQuietHoursEnd(end)
    saveReminderPreferences({ enabled: notificationsEnabled, time: reminderTime, quietHoursEnabled: enabled, quietHoursStart: start, quietHoursEnd: end })
    setSaveMessage(enabled ? `Quiet hours set from ${start} to ${end}.` : 'Quiet hours turned off.')
  }

  // Save Settings to Supabase
  const togglePublicProfile = async () => {
    if (!userId) return
    const next = !isPublicProfile
    setIsPublicProfile(next)
    const { error } = await supabase.from('profiles').update({ is_public: next, updated_at: new Date().toISOString() }).eq('id', userId)
    if (error) { setIsPublicProfile(!next); setSaveMessage('That change was not saved.') }
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
    <div className="p-4 max-w-xl mx-auto space-y-5 pb-28 text-slate-800 dark:text-slate-200 select-none">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-4 w-4 text-amber-500" /> App Settings
        </h1>
        <button
          onClick={() => router.back()}
          className="text-xs font-bold text-amber-500 hover:underline"
        >
          ← Back
        </button>
      </div>

      {/* Profile details live on the Profile page only */}
      <button type="button" onClick={() => router.push('/profile?edit=1')} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-500 dark:border-slate-800 dark:bg-slate-900">
        <UserRound className="h-5 w-5 text-amber-500" />
        <span className="flex-1"><span className="block text-sm font-bold">Edit profile</span><span className="block text-xs text-slate-500">Photo, name, username and bio</span></span>
        <span className="text-amber-500">→</span>
      </button>
      {saveMessage && <p role="status" className="text-xs font-bold text-amber-500">{saveMessage}</p>}

      {/* SECTION 2: THEME & LANDING VIEW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2">
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
          <label className="mb-2 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
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
                <span className={`block font-bold ${option.value === 'small' ? 'text-xs' : option.value === 'large' ? 'text-xl' : 'text-base'}`}>{option.sample}</span>
                <span className="mt-0.5 block text-xs font-bold">{option.label}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-4 text-slate-400">Changes apply across GoalYaar and stay on this device.</p>
        </div>

      </div>

      {/* SECTION 3: NOTIFICATIONS & REMINDERS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="flex items-center gap-1.5 text-xs uppercase font-extrabold text-slate-400 tracking-wider">
          <Bell className="h-3.5 w-3.5" /> Notifications & Reminders
        </label>
        <PushToggle embedded />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily reminder</h3>
            <p className="text-xs text-slate-500">Once a day, only if you haven&apos;t checked in yet</p>
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
            <label htmlFor="reminder-hour" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Remind me at</label>
            <select
              id="reminder-hour"
              value={`${reminderTime.slice(0, 2)}:00`}
              onChange={(e) => handleReminderTimeChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              {Array.from({ length: 18 }, (_, index) => index + 6).map((hour) => { const value = `${String(hour).padStart(2, '0')}:00`; return <option key={value} value={value}>{formatHour(value)}</option> })}
            </select>
          </div>
        )}
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="flex items-center justify-between"><div><h3 className="text-xs font-bold text-slate-900 dark:text-white">Quiet hours</h3><p className="text-xs text-slate-400">Pause reminders and social prompts overnight</p></div><button type="button" onClick={() => saveQuietHours(!quietHoursEnabled)} aria-pressed={quietHoursEnabled} className={`relative h-6 w-11 rounded-full transition-colors ${quietHoursEnabled ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}><span className={`absolute top-1 block h-4 w-4 rounded-full bg-white transition-transform ${quietHoursEnabled ? 'left-6' : 'left-1'}`} /></button></div>
          {quietHoursEnabled && <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-500">From<input type="time" value={quietHoursStart} onChange={(event) => saveQuietHours(true, event.target.value, quietHoursEnd)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950" /></label><label className="text-xs font-bold text-slate-500">Until<input type="time" value={quietHoursEnd} onChange={(event) => saveQuietHours(true, quietHoursStart, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950" /></label></div>}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">The daily reminder reaches your phone when Phone notifications are on. Each goal can also go in your phone&apos;s calendar when you create it.</p>
      </div>

      <InstallAppCard />

      {/* SECTION 4: PRIVACY & DATA */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <label className="flex items-center gap-1.5 text-xs uppercase font-extrabold text-slate-400 tracking-wider">
          <Shield className="h-3.5 w-3.5" /> Privacy & Data Export
        </label>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Show my progress to my circles</h3>
            <p className="text-xs text-slate-500">People in your circles can see your streak calendar</p>
          </div>
          <button
            type="button"
            onClick={() => void togglePublicProfile()}
            role="switch"
            aria-checked={isPublicProfile}
            aria-label="Show my progress to my circles"
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Download my data</h3>
            <p className="text-xs text-slate-500">A copy of your goals and progress, as a file</p>
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

      <button
        type="button"
        onClick={() => { resetTours(); router.push('/profile?guide=1') }}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-500 dark:border-slate-800 dark:bg-slate-900"
      >
        <span>
          <span className="block text-sm font-bold">Show me around again</span>
          <span className="block text-xs text-slate-500">Replay Goalie&apos;s tours on every page.</span>
        </span>
        <span className="text-amber-500">→</span>
      </button>


      <GoalieToggle />

      <FeedbackCard />

      {/* SECTION 5: ACCOUNT SECURITY & SIGN OUT */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-2">
        <label className="block text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-1">
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
          <span className="inline-flex items-center gap-2"><LogOut className="h-4 w-4" />Log Out of GoalYaar</span>
          <span>→</span>
        </button>
      </div>
    </div>
  )
}

function formatHour(time: string) {
  const hour = Number(time.slice(0, 2))
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
}
