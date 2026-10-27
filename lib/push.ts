'use client'

import { supabase } from '@/utils/supabase'

/** Phone notifications through the browser's own push service (no app store needed). */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
export const PUSH_ASKED_KEY = 'goalcircle-push-asked'

export function pushSupported() {
  return typeof window !== 'undefined' && Boolean(VAPID_PUBLIC_KEY) && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

const toKey = (base64: string) => {
  const raw = atob(base64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

async function save(subscription: PushSubscription) {
  const json = subscription.toJSON()
  const { error } = await supabase.rpc('save_push_subscription', {
    target_endpoint: subscription.endpoint, key_p256dh: json.keys?.p256dh || '', key_auth: json.keys?.auth || '', agent: navigator.userAgent.slice(0, 200),
  })
  if (error) throw error
}

async function currentSubscription(create: boolean) {
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  if (existing || !create) return existing
  return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) })
}

/** Ask permission (if needed), subscribe this phone and save it. */
export async function enablePush(): Promise<'on' | 'blocked' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported'
  try { window.localStorage.setItem(PUSH_ASKED_KEY, String(Date.now())) } catch { /* storage unavailable */ }
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') return 'blocked'
  try {
    const subscription = await currentSubscription(true)
    if (!subscription) return 'error'
    await save(subscription)
    return 'on'
  } catch { return 'error' }
}

/** Turn notifications off for this phone. */
export async function disablePush() {
  if (!pushSupported()) return
  const subscription = await currentSubscription(false).catch(() => null)
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe().catch(() => undefined)
}

/** Is this phone currently subscribed? */
export async function pushIsOn() {
  if (!pushSupported() || Notification.permission !== 'granted') return false
  return Boolean(await currentSubscription(false).catch(() => null))
}

/**
 * On each app open: keep the saved address fresh for whoever is signed in. If notifications
 * were already allowed (for example for the old daily reminder) but this phone never
 * subscribed, subscribe now, since no permission prompt is needed.
 */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== 'granted') return
  const subscription = await currentSubscription(true).catch(() => null)
  if (subscription) await save(subscription).catch(() => undefined)
}
