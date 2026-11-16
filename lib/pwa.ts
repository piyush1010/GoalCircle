'use client'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let installPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function getInstallPrompt() {
  return installPrompt
}

export function setInstallPrompt(prompt: BeforeInstallPromptEvent | null) {
  installPrompt = prompt
  listeners.forEach((listener) => listener())
}

export function subscribeToInstallPrompt(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const APP_KEY = 'gy-android-app'

/**
 * True inside the installed app: the Android app from Google Play (it opens the site with an
 * android-app:// referrer, remembered for the session) or the site added to the home screen.
 */
export function isInstalledApp() {
  if (typeof window === 'undefined') return false
  let fromPlay = document.referrer.startsWith('android-app://')
  try {
    if (fromPlay) window.sessionStorage.setItem(APP_KEY, '1')
    else fromPlay = window.sessionStorage.getItem(APP_KEY) === '1'
  } catch { /* storage unavailable */ }
  return fromPlay || window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
