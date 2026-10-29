'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { REMINDER_CHANGED_EVENT, readReminderPreferences, type ReminderPreferences } from '@/lib/notifications/reminderPreferences'

const LAST_REMINDER_KEY = 'goalcircle-last-reminder-date'

export default function ReminderManager() {
  const router = useRouter()
  const preferences = useRef<ReminderPreferences>(readReminderPreferences())

  useEffect(() => {
    const updatePreferences = () => { preferences.current = readReminderPreferences() }
    // Local fallback reminder. It must never throw: it runs at the top of every page.
    const checkReminder = async () => {
      try {
        const current = preferences.current
        if (!current.enabled || !('Notification' in window) || Notification.permission !== 'granted') return
        const now = new Date()
        const today = now.toISOString().slice(0, 10)
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        const inQuietHours = current.quietHoursEnabled && (
          current.quietHoursStart <= current.quietHoursEnd
            ? currentTime >= current.quietHoursStart && currentTime < current.quietHoursEnd
            : currentTime >= current.quietHoursStart || currentTime < current.quietHoursEnd
        )
        if (inQuietHours) return
        if (currentTime < current.time || localStorage.getItem(LAST_REMINDER_KEY) === today) return
        // Mark first, so a failure below can never repeat on every load.
        localStorage.setItem(LAST_REMINDER_KEY, today)
        const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
        // Phone notifications are on: the server already sends the daily reminder, so don't send a second one.
        if (registration && await registration.pushManager?.getSubscription().catch(() => null)) return
        const options = { body: 'Add today’s progress to protect your momentum.', tag: `goalcircle-reminder-${today}`, icon: '/goalyaar-icon-192.png', data: { url: '/check-in' } }
        // Android only allows notifications through the service worker; new Notification() throws there.
        if (registration) { await registration.showNotification('Your goals are waiting', options); return }
        const notification = new Notification('Your goals are waiting', options)
        notification.onclick = () => { window.focus(); router.push('/check-in') }
      } catch (error) {
        console.warn('GoalYaar reminder skipped:', error)
      }
    }

    updatePreferences()
    void checkReminder()
    const interval = window.setInterval(() => void checkReminder(), 30_000)
    window.addEventListener('storage', updatePreferences)
    window.addEventListener(REMINDER_CHANGED_EVENT, updatePreferences)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('storage', updatePreferences)
      window.removeEventListener(REMINDER_CHANGED_EVENT, updatePreferences)
    }
  }, [router])

  return null
}
