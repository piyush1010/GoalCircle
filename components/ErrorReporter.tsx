'use client'

import { useEffect } from 'react'
import { reportError } from '@/lib/errorReporting'

/** Catches errors that escape React (event handlers, timers, promises) and reports them. */
export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => reportError(event.error ?? event.message)
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason)
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection) }
  }, [])
  return null
}
