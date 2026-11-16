'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDisplayPreferences, useTheme, type Theme } from '@/components/ThemeProvider'
import InstallAppCard from '@/components/InstallAppCard'
import FeedbackCard from '@/components/FeedbackCard'
import DeleteAccount from '@/components/DeleteAccount'
import BlockedPeople from '@/components/BlockedPeople'
import DayEndSetting from '@/components/DayEndSetting'
import { resetTours } from '@/components/GuideTour'
import PushToggle from '@/components/PushToggle'
import PrepSettingsCard from '@/components/prep/PrepSettingsCard'
import PageGuideToggle from '@/components/PageGuideToggle'
import { supabase } from '@/utils/supabase'
import { ArrowLeft, BarChart3, Bell, Check, ChevronRight, Compass, Download, Info, KeyRound, LogOut, Monitor, Moon, Shield, Sun, UserRound } from 'lucide-react'
import Link from 'next/link'
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
  const [saveMessage, setSaveMessage] = useState('')
  const [passwordResetSent, setPasswordResetSent] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Only the GoalYaar team sees the Insights link (the page itself also checks).
  useEffect(() => { void supabase.rpc('is_app_admin').then(({ data }) => setIsAdmin(data === true), () => undefined) }, [])

  // Load profile settings
  useEffect(() => {
    async function fetchProfileData() {
      try {
        // getSession works offline and never throws when signed out (getUser can).
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        if (!user) { router.replace('/login?next=/settings'); return }
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
  }, [router])

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
      // Everything you created: goals and check-ins, focus time, exam preparation, and community posts and answers.
      const tables = ['goals', 'posts', 'focus_logs', 'todo_items', 'circle_task_checkins', 'prep_plans', 'prep_profiles', 'prep_events', 'prep_topic_state',
        'prep_mistakes', 'prep_mock_tests', 'prep_pyq_attempts', 'prep_answer_logs', 'prep_current_affairs', 'prep_answer_reviews',
        'community_posts', 'community_comments'] as const
      const results = await Promise.all(tables.map(async (table) => {
        const rows: unknown[] = []
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase.from(table).select('*').eq('user_id', user.id).range(from, from + 999)
          if (error || !data) break
          rows.push(...data)
          if (data.length < 1000) break
        }
        return [table, rows] as const
      }))
      // Syllabus titles, so ticks and revisions are readable without the app.
      const states = (results.find(([t]) => t === 'prep_topic_state')?.[1] ?? []) as Array<{ node_id: string }>
      const titles: Record<string, string> = {}
      const ids = [...new Set(states.map((s) => s.node_id))]
      for (let i = 0; i < ids.length; i += 300) {
        const { data } = await supabase.from('prep_syllabus_nodes').select('id,title').in('id', ids.slice(i, i + 300))
        for (const n of data ?? []) titles[n.id as string] = n.title as string
      }
      const exportObject = {
        user: { id: user.id, email: user.email, fullName, username },
        exportedAt: new Date().toISOString(),
        ...Object.fromEntries(results),
        syllabusTitles: titles,
      }

      const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `goalyaar_export_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const card = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900'
  const heading = 'mb-2 mt-7 px-1 text-sm font-semibold text-slate-500'
  const row = 'flex w-full items-center gap-3 px-4 py-3.5 text-left'
  const toggle = (on: boolean) => `relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-slate-900 dark:bg-slate-400' : 'bg-slate-200 dark:bg-slate-700'}`
  const knob = (on: boolean) => `absolute top-1 block h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`

  return (
    <main className="mx-auto max-w-xl px-4 pb-28 pt-4 text-slate-800 dark:text-slate-200">
      <div className="flex h-10 items-center gap-2">
        <button type="button" onClick={() => { if (window.history.length > 1) router.back(); else router.push('/profile') }} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button>
      </div>
      <h1 className="mt-1 text-[26px] font-bold tracking-tight text-slate-900 dark:text-white">Settings</h1>
      {saveMessage && <p role="status" className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{saveMessage}</p>}

      {isAdmin && <Link href="/admin" className={`${card} mt-4 flex items-center gap-3`}><BarChart3 className="h-5 w-5 text-slate-400" /><span className="flex-1 text-[15px] font-semibold">Insights for the team</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>}

      <h2 className={heading}>Account</h2>
      <div className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
        <Link href="/profile?edit=1" className={row}><UserRound className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Edit profile</span><span className="block text-sm text-slate-500">Photo, name, username and bio</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
        <button type="button" onClick={() => void handlePasswordReset()} className={row}><KeyRound className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Change password</span><span className="block text-sm text-slate-500">{passwordResetSent ? 'Check your email for the link.' : 'We email you a link to set a new one.'}</span></span>{passwordResetSent ? <Check className="h-4 w-4 text-emerald-600" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}</button>
      </div>

      <h2 className={heading}>Reminders</h2>
      <div className={`${card} space-y-4`}>
        <PushToggle embedded />
        <div className="flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Bell className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Daily reminder</span><span className="block text-sm text-slate-500">Once a day, only if you haven&apos;t checked in</span></span>
          <button type="button" role="switch" aria-checked={notificationsEnabled} aria-label="Daily reminder" onClick={() => void handleNotificationsToggle()} className={toggle(notificationsEnabled)}><span className={knob(notificationsEnabled)} /></button>
        </div>
        {notificationsEnabled && <div className="flex items-center justify-between gap-3 pl-8">
          <label htmlFor="reminder-hour" className="text-[15px]">Remind me at</label>
          <select id="reminder-hour" value={`${reminderTime.slice(0, 2)}:00`} onChange={(e) => handleReminderTimeChange(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
            {Array.from({ length: 18 }, (_, index) => index + 6).map((hour) => { const value = `${String(hour).padStart(2, '0')}:00`; return <option key={value} value={value}>{formatHour(value)}</option> })}
          </select>
        </div>}
        <div className="flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Moon className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Quiet hours</span><span className="block text-sm text-slate-500">No reminders or nudges overnight</span></span>
          <button type="button" role="switch" aria-checked={quietHoursEnabled} aria-label="Quiet hours" onClick={() => saveQuietHours(!quietHoursEnabled)} className={toggle(quietHoursEnabled)}><span className={knob(quietHoursEnabled)} /></button>
        </div>
        {quietHoursEnabled && <div className="grid grid-cols-2 gap-2 pl-8">
          <label className="text-sm text-slate-500">From<input type="time" value={quietHoursStart} onChange={(event) => saveQuietHours(true, event.target.value, quietHoursEnd)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
          <label className="text-sm text-slate-500">Until<input type="time" value={quietHoursEnd} onChange={(event) => saveQuietHours(true, quietHoursStart, event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" /></label>
        </div>}
      </div>
      <div className="mt-2.5"><DayEndSetting /></div>

      <div className="mt-7"><PrepSettingsCard /></div>

      <h2 className={heading}>Appearance</h2>
      <div className={`${card} space-y-4`}>
        <div>
          <p className="mb-2 text-[15px] font-semibold">Theme</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
            {([['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Same as phone', Monitor]] as const).map(([mode, label, Icon]) => <button key={mode} type="button" role="radio" aria-checked={theme === mode} onClick={() => handleThemeChange(mode as Theme)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${theme === mode ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}><Icon className="h-4 w-4" />{label}</button>)}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="mb-2 text-[15px] font-semibold">Text size</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Text size">
            {([['small', 'Small', 'text-xs'], ['standard', 'Standard', 'text-base'], ['large', 'Large', 'text-xl']] as const).map(([value, label, size]) => <button type="button" key={value} role="radio" aria-checked={fontSize === value} onClick={() => setFontSize(value)}
              className={`rounded-xl border px-2 py-2 text-center transition ${fontSize === value ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
              <span className={`block font-bold ${size}`}>A</span><span className="block text-xs font-semibold">{label}</span></button>)}
          </div>
          <p className="mt-2 text-sm text-slate-500">Applies on this device.</p>
        </div>
      </div>

      <h2 className={heading}>Privacy</h2>
      <div className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
        <div className={row}>
          <Shield className="h-5 w-5 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Show my progress to my batches</span><span className="block text-sm text-slate-500">People in your batches and groups can see your streak calendar</span></span>
          <button type="button" role="switch" aria-checked={isPublicProfile} aria-label="Show my progress to my batches" onClick={() => void togglePublicProfile()} className={toggle(isPublicProfile)}><span className={knob(isPublicProfile)} /></button>
        </div>
        <button type="button" onClick={() => void handleExportData()} className={row}><Download className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Download my data</span><span className="block text-sm text-slate-500">Goals, check-ins, focus time, exam preparation and community posts, in one file</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
        <BlockedPeople className={row} />
        <Link href="/about" className={row}><Info className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1 text-[15px] font-semibold">About GoalYaar and privacy</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>
      </div>

      <h2 className={heading}>Help</h2>
      <div className="space-y-2.5">
        <div className={`${card} divide-y divide-slate-100 p-0 dark:divide-slate-800`}>
          <button type="button" onClick={() => { resetTours(); router.push('/profile?guide=1') }} className={row}><Compass className="h-5 w-5 shrink-0 text-slate-400" /><span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">Show me around again</span><span className="block text-sm text-slate-500">The quick tips on each page come back</span></span><ChevronRight className="h-4 w-4 text-slate-400" /></button>
        </div>
        <PageGuideToggle />
        <InstallAppCard />
        <FeedbackCard />
      </div>

      <button type="button" onClick={() => void handleSignOut()} className={`${card} mt-7 flex w-full items-center justify-center gap-2 text-[15px] font-semibold text-rose-600 dark:text-rose-400`}><LogOut className="h-4 w-4" />Sign out</button>
      <div className="mt-2.5"><DeleteAccount /></div>
    </main>
  )
}

function formatHour(time: string) {
  const hour = Number(time.slice(0, 2))
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`
}
