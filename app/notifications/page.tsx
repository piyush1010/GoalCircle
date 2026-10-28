'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Bolt, Check, CheckCheck, Flame, Hand, HeartHandshake, MessageCircle, UsersRound, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'

interface NotificationItem {
  id: string
  recipient_id: string
  actor_id: string | null
  kind: 'boost' | 'comment' | 'follow' | 'nudge' | 'circle_invite' | 'streak' | 'accountability_invite' | 'challenge_invite' | 'weekly_recap' | 'goal_collaboration_invite' | 'goal_collaboration_accepted' | 'circle_task' | 'circle_post' | 'circle_leave' | 'circle_reply'
  post_id: string | null
  circle_id: string | null
  goal_id: string | null
  message: string | null
  is_read: boolean
  created_at: string
}

interface PartnerRequest { id: string; requester_id: string; partner_id: string; status: string; created_at: string }
interface CollaborationRequest { goal_id: string; user_id: string; invited_by: string; status: string; created_at: string; goal?: { title?: string } | null }

const details = {
  boost: { icon: Bolt, title: 'Your progress was boosted', copy: 'sent encouragement on your latest update.' },
  comment: { icon: MessageCircle, title: 'New encouragement', copy: 'commented on your progress.' },
  follow: { icon: HeartHandshake, title: 'New accountability friend', copy: 'started following your goals.' },
  nudge: { icon: Hand, title: 'Friendly nudge', copy: 'nudged you to keep your momentum going.' },
  circle_invite: { icon: UsersRound, title: 'Circle invitation', copy: 'invited you to an accountability circle.' },
  streak: { icon: Flame, title: 'Streak milestone', copy: 'Your consistency is paying off.' },
  accountability_invite: { icon: HeartHandshake, title: 'Accountability invitation', copy: 'invited you to become an accountability partner.' },
  challenge_invite: { icon: UsersRound, title: 'Challenge invitation', copy: 'invited you to a circle challenge.' },
  weekly_recap: { icon: CheckCheck, title: 'Weekly recap ready', copy: 'Your latest consistency recap is ready.' },
  goal_collaboration_invite: { icon: UsersRound, title: 'Shared-goal invitation', copy: 'invited you to work on a goal together.' },
  goal_collaboration_accepted: { icon: Check, title: 'Collaborator joined', copy: 'accepted your shared-goal invitation.' },
  circle_task: { icon: CheckCheck, title: 'New task from your mentor', copy: 'set a new task in your circle.' },
  circle_post: { icon: UsersRound, title: 'New notice in your circle', copy: 'posted a new notice in your circle.' },
  circle_leave: { icon: UsersRound, title: 'A student left your circle', copy: 'left your circle.' },
  circle_reply: { icon: MessageCircle, title: 'Your mentor replied', copy: 'replied to your check-in.' },
}

function NotificationIcon({ kind }: { kind: NotificationItem['kind'] }) {
  const Icon = (details[kind] ?? details.nudge).icon
  return <Icon className="h-5 w-5 text-amber-500" />
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
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>([])
  const [collaborationRequests, setCollaborationRequests] = useState<CollaborationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNotifications = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/notifications'); return }
    const [{ data, error: notificationsError }, { data: requestData }, { data: collaborationData }] = await Promise.all([
      supabase.from('notifications').select('id,recipient_id,actor_id,kind,post_id,circle_id,goal_id,message,is_read,created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('accountability_partners').select('id,requester_id,partner_id,status,created_at').eq('partner_id', session.user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('goal_collaborators').select('goal_id,user_id,invited_by,status,created_at,goal:goals(title)').eq('user_id', session.user.id).eq('status', 'pending').order('created_at', { ascending: false }),
    ])
    if (notificationsError) { setError('Notifications are not available in this preview yet.'); setLoading(false); return }
    const rows = (data || []) as NotificationItem[]
    const requests = (requestData || []) as PartnerRequest[]
    const collaborations = (collaborationData || []) as unknown as CollaborationRequest[]
    const actorIds = [...new Set([...rows.flatMap((item) => item.actor_id ? [item.actor_id] : []), ...requests.map((item) => item.requester_id), ...collaborations.map((item) => item.invited_by)])]
    const { data: profiles } = actorIds.length ? await supabase.from('profiles').select('id,full_name,username').in('id', actorIds) : { data: [] }
    setActorNames(Object.fromEntries(((profiles || []) as Array<Record<string, unknown>>).map((profile) => [String(profile.id), String(profile.full_name || profile.username || 'A GoalYaar friend')])))
    setPartnerRequests(requests); setCollaborationRequests(collaborations); setNotifications(rows); setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadNotifications) }, [loadNotifications])

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id)
    if (!unreadIds.length) return
    const { error: updateError } = await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds)
    if (!updateError) setNotifications((current) => current.map((item) => ({ ...item, is_read: true })))
  }

  const respondToPartnerRequest = async (request: PartnerRequest, status: 'accepted' | 'declined') => {
    const { error: responseError } = await supabase.from('accountability_partners').update({ status, updated_at: new Date().toISOString() }).eq('id', request.id).eq('partner_id', request.partner_id)
    if (!responseError) setPartnerRequests((current) => current.filter((item) => item.id !== request.id))
  }

  const respondToCollaboration = async (request: CollaborationRequest, status: 'accepted' | 'declined') => {
    const { error: responseError } = await supabase.from('goal_collaborators').update({ status }).eq('goal_id', request.goal_id).eq('user_id', request.user_id).eq('status', 'pending')
    if (!responseError) {
      setCollaborationRequests((current) => current.filter((item) => item.goal_id !== request.goal_id))
      if (status === 'accepted') router.push(`/goal/${request.goal_id}`)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-5 px-4 pb-28 pt-5 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
        {!loading && error && <div className="rounded-2xl border border-rose-300 bg-white p-6 text-center dark:border-rose-900 dark:bg-slate-900"><p className="text-sm font-bold">Could not load notifications</p><p className="mt-1 text-xs text-slate-500">{error}</p><button onClick={() => void loadNotifications()} className="mt-4 rounded-xl bg-slate-900 dark:bg-slate-50 px-4 py-2 text-xs font-bold text-white dark:text-slate-900">Retry</button></div>}
        {!loading && partnerRequests.map((request) => <article key={request.id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 dark:bg-slate-950"><HeartHandshake className="h-5 w-5 text-amber-500" /></span><div className="min-w-0 flex-1"><h3 className="text-xs font-bold">Accountability invitation</h3><p className="mt-0.5 text-xs text-slate-500">{actorNames[request.requester_id] || 'A GoalYaar member'} wants to support your consistency.</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => void respondToPartnerRequest(request, 'accepted')} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 dark:bg-slate-50 py-2 text-xs font-bold text-white dark:text-slate-900"><Check className="h-3.5 w-3.5" />Accept</button><button onClick={() => void respondToPartnerRequest(request, 'declined')} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-bold dark:border-slate-700"><X className="h-3.5 w-3.5" />Decline</button></div></article>)}
        {!loading && collaborationRequests.map((request) => <article key={request.goal_id} className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 dark:bg-amber-500/10"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2 dark:bg-slate-950"><UsersRound className="h-5 w-5 text-amber-500" /></span><div className="min-w-0 flex-1"><h3 className="text-xs font-bold">Join a shared goal</h3><p className="mt-0.5 text-xs text-slate-500">{actorNames[request.invited_by] || 'A GoalYaar member'} invited you to collaborate on <span className="font-bold text-slate-700 dark:text-slate-200">{request.goal?.title || 'a goal'}</span>. You can add check-ins, while the owner keeps editing control.</p></div></div><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => void respondToCollaboration(request, 'accepted')} className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-900 dark:bg-slate-50 py-2 text-xs font-bold text-white dark:text-slate-900"><Check className="h-3.5 w-3.5" />Accept</button><button onClick={() => void respondToCollaboration(request, 'declined')} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 py-2 text-xs font-bold dark:border-slate-700"><X className="h-3.5 w-3.5" />Decline</button></div></article>)}
        {!loading && !error && notifications.length === 0 && partnerRequests.length === 0 && collaborationRequests.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-9 text-center dark:border-slate-700"><Bell className="mx-auto mb-3 h-8 w-8 text-amber-500" /><h2 className="font-bold">All quiet for now</h2><p className="mt-1 text-xs text-slate-500">Boosts, comments, follows, nudges, and circle invitations will appear here.</p></div>}
        {notifications.filter((item) => item.kind !== 'goal_collaboration_invite' || !collaborationRequests.some((request) => request.goal_id === item.goal_id)).map((item) => (
          <Link
            key={item.id}
            href={item.kind === 'goal_collaboration_invite' ? '/notifications' : item.post_id ? `/feed?post=${item.post_id}` : item.goal_id ? `/goal/${item.goal_id}` : item.circle_id ? `/circles/${item.circle_id}` : '/profile'}
            className={`border rounded-2xl p-4 shadow-sm flex items-start gap-3 transition ${
              item.is_read
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-80'
                : 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
              <NotificationIcon kind={item.kind} />
            </div>

            <div className="flex-1 space-y-0.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {(details[item.kind] ?? details.nudge).title}
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {relativeTime(item.created_at)}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                {item.message || `${item.actor_id ? actorNames[item.actor_id] || 'A GoalYaar friend' : 'GoalYaar'} ${(details[item.kind] ?? details.nudge).copy}`}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {!loading && notifications.some((item) => !item.is_read) && <div className="flex justify-center"><button onClick={() => void markAllAsRead()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold dark:border-slate-700"><CheckCheck className="h-4 w-4" />Mark everything read</button></div>}
    </main>
  )
}
