export const REMINDER_STORAGE_KEY = 'goalcircle-reminder-preferences'
export const REMINDER_CHANGED_EVENT = 'goalcircle-reminder-changed'

export interface ReminderPreferences {
  enabled: boolean
  time: string
}

export const defaultReminderPreferences: ReminderPreferences = {
  enabled: false,
  time: '20:00',
}

export function readReminderPreferences(): ReminderPreferences {
  if (typeof window === 'undefined') return defaultReminderPreferences
  try {
    const stored = JSON.parse(localStorage.getItem(REMINDER_STORAGE_KEY) || '{}') as Partial<ReminderPreferences>
    return {
      enabled: stored.enabled === true,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(stored.time || '') ? stored.time! : defaultReminderPreferences.time,
    }
  } catch {
    return defaultReminderPreferences
  }
}

export function saveReminderPreferences(preferences: ReminderPreferences) {
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent(REMINDER_CHANGED_EVENT, { detail: preferences }))
}
