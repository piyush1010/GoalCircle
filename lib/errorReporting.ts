'use client'

import { supabase } from '@/utils/supabase'

// Noise that isn't a GoalYaar bug: browser extensions, aborted requests, resize loops.
const IGNORE = [/ResizeObserver loop/i, /Script error\.?$/i, /AbortError/i, /The user aborted a request/i, /chrome-extension:\/\//i, /Load failed$/i, /Failed to fetch$/i]
const recent = new Map<string, number>()

/** Send an error to the owner's dashboard. Never throws; skips repeats within a minute. */
export function reportError(error: unknown, extra?: { digest?: string }) {
  try {
    const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : JSON.stringify(error))
    const message = `${err.name && err.name !== 'Error' ? `${err.name}: ` : ''}${err.message || 'Unknown error'}`.slice(0, 500)
    if (IGNORE.some((pattern) => pattern.test(message) || pattern.test(err.stack || ''))) return
    const last = recent.get(message) || 0
    if (Date.now() - last < 60_000) return
    recent.set(message, Date.now())
    void supabase.rpc('log_client_error', {
      message,
      stack: (err.stack || '').slice(0, 4000) || null,
      path: typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : null,
      digest: extra?.digest ?? null,
    }).then(() => undefined, () => undefined)
  } catch { /* reporting must never break the app */ }
}
