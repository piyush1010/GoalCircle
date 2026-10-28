import { NextResponse } from 'next/server'
import { sendPush, type PushTarget } from '@/lib/server/webpush'

// Called by the database (see supabase/migrations/202610290001_push_notifications.sql) whenever a
// notification is created. Delivers it to every phone that person allowed notifications on.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PushRequest {
  notification: { id: string; kind: string; message: string | null; post_id: string | null; circle_id: string | null; goal_id: string | null }
  actor: string | null
  circle: string | null
  subscriptions: PushTarget[]
}

function compose({ notification: n, actor, circle }: PushRequest) {
  const who = actor || 'Someone'
  const where = circle || 'your circle'
  const titles: Record<string, string> = {
    boost: `${who} boosted your progress 🔥`,
    comment: `${who} commented on your post`,
    follow: `${who} started following you`,
    nudge: n.circle_id ? `Reminder from ${where} 👋` : `${who} nudged you 👋`,
    circle_task: `New task in ${where}`,
    circle_post: `New notice in ${where}`,
    circle_leave: `A student left ${where}`,
    accountability_invite: `${who} wants to be your accountability partner`,
    challenge_invite: `${who} challenged you`,
    goal_collaboration_invite: `${who} invited you to a shared goal`,
    goal_collaboration_accepted: `${who} joined your shared goal`,
    streak: 'Keep your streak alive 🔥',
    weekly_recap: 'Your week on GoalYaar',
  }
  const fallbackBody: Record<string, string> = {
    boost: 'Tap to see it.', comment: 'Tap to read and reply.', follow: 'Tap to see their profile.',
    nudge: 'One small step today?',
  }
  const url = n.kind === 'goal_collaboration_invite' ? '/notifications'
    : n.post_id ? `/feed?post=${n.post_id}`
    : n.goal_id ? `/goal/${n.goal_id}`
    : n.circle_id ? `/circles/${n.circle_id}`
    : '/notifications'
  return {
    title: titles[n.kind] || 'GoalYaar',
    body: n.message ? (n.kind === 'accountability_invite' || n.kind.startsWith('goal_collaboration') ? `${who} ${n.message}` : n.message) : (fallbackBody[n.kind] || 'Open GoalYaar to see it.'),
    url,
    // One notification per circle or post, so 3 nudges don't stack into 3 alerts.
    tag: `${n.kind}-${n.circle_id || n.post_id || n.goal_id || n.id}`,
  }
}

async function forget(endpoint: string, secret: string) {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!base || !key) return
  await fetch(`${base}/rest/v1/rpc/forget_push_subscription`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_endpoint: endpoint, push_secret: secret }),
  }).catch(() => undefined)
}

export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!secret || !publicKey || !privateKey) return NextResponse.json({ error: 'Push is not configured' }, { status: 503 })
  if (request.headers.get('x-push-secret') !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: PushRequest
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  const targets = (body.subscriptions || []).filter((target) => target?.endpoint?.startsWith('https://')).slice(0, 20)
  if (!body.notification || !targets.length) return NextResponse.json({ sent: 0 })

  const payload = compose(body)
  const keys = { publicKey, privateKey, subject: 'https://goalcircle-ivory.vercel.app' }
  const results = await Promise.all(targets.map(async (target) => {
    try {
      const status = await sendPush(target, payload, keys)
      if (status === 404 || status === 410) await forget(target.endpoint, secret)
      return status
    } catch { return 0 }
  }))
  return NextResponse.json({ sent: results.filter((status) => status >= 200 && status < 300).length, results })
}
