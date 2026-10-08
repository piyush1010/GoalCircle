'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface NotificationItem {
  id: string
  recipient_id: string
  actor_id: string | null
  kind: 'boost' | 'comment' | 'follow' | 'nudge' | 'circle_invite' | 'streak'
  post_id: string | null
  circle_id: string | null
  message: string | null
  is_read: boolean
  created_at: string
}

const details = {
  boost: { icon: '⚡', title: 'Your progress was boosted', copy: 'sent encouragement on your latest update.' },
  comment: { icon: '💬', title: 'New encouragement', copy: 'commented on your progress.' },
  follow: { icon: '🤝', title: 'New accountability friend', copy: 'started following your goals.' },
  nudge: { icon: '👉', title: 'Friendly nudge', copy: 'nudged you to keep your momentum going.' },
  circle_invite: { icon: '👥', title: 'Circle invitation', copy: 'invited you to an accountability circle.' },
  streak: { icon: '🔥', title: 'Streak milestone', copy: 'Your consistency is paying off.' },
}

const relativeTime = (value: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/notifications'); return }
    const { data, error: notificationsError } = await supabase.from('notifications').select('id,recipient_id,actor_id,kind,post_id,circle_id,message,is_read,created_at').order('created_at', { ascending: false }).limit(50)
    if (notificationsError) { setError('Notifications are not available in this preview yet.'); setLoading(false); return }
    const rows = (data || []) as NotificationItem[]
    const actorIds = [...new Set(rows.flatMap((item) => item.actor_id ? [item.actor_id] : []))]
    const { data: profiles } = actorIds.length ? await supabase.from('profiles').select('id,full_name,username').in('id', actorIds) : { data: [] }
    setActorNames(Object.fromEntries(((profiles || []) as Array<Record<string, unknown>>).map((profile) => [String(profile.id), String(profile.full_name || profile.username || 'A GoalCircle friend')])))
    setNotifications(rows); setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadNotifications) }, [loadNotifications])

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id)
    if (!unreadIds.length) return
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    if (!updateError) setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 px-4 pb-28 pt-5 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" /> Notifications
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Stay updated on your goals and circles
          </p>
        </div>

        <button
          onClick={markAllAsRead}
          className="text-xs font-bold text-amber-500 hover:underline"
        >
          Mark all read
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {loading && [1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />)}
        {!loading && error && <div className="rounded-2xl border border-rose-300 bg-white p-6 text-center dark:border-rose-900 dark:bg-slate-900"><p className="text-sm font-black">Could not load notifications</p><p className="mt-1 text-xs text-slate-500">{error}</p><button onClick={() => void loadNotifications()} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950">Retry</button></div>}
        {!loading && !error && notifications.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-9 text-center dark:border-slate-700"><Bell className="mx-auto mb-3 h-8 w-8 text-amber-500" /><h2 className="font-black">All quiet for now</h2><p className="mt-1 text-xs text-slate-500">Boosts, comments, follows, nudges, and circle invitations will appear here.</p></div>}
        {notifications.map((item) => (
          <Link
            key={item.id}
            href={item.post_id ? `/feed?post=${item.post_id}` : item.circle_id ? `/circles` : '/profile'}
            className={`border rounded-2xl p-4 shadow-sm flex items-start gap-3 transition ${
              item.is_read
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="text-xl shrink-0 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              {details[item.kind].icon}
            </div>

            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {details[item.kind].title}
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">
                  {relativeTime(item.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                {item.message || `${item.actor_id ? actorNames[item.actor_id] || 'A GoalCircle friend' : 'GoalCircle'} ${details[item.kind].copy}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {!loading && notifications.some((item) => !item.is_read) && <div className="flex justify-center"><button onClick={() => void markAllAsRead()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-black dark:border-slate-700"><CheckCheck className="h-4 w-4" />Mark everything read</button></div>}
    </main>
  )
}
