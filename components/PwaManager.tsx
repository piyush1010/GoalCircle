'use client'

import { useEffect } from 'react'
import { isInstalledApp, setInstallPrompt, type BeforeInstallPromptEvent } from '@/lib/pwa'

export default function PwaManager() {
  useEffect(() => {
    isInstalledApp() // remember, for this session, that we were opened from the Android app
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((error) => {
        console.warn('GoalYaar service worker registration failed:', error)
      })
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => setInstallPrompt(null)

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  return null
}
