'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Bolt, Check, Clock3, Hand, LockKeyhole, MessageCircle, Pencil, Plus, Share2, Target, Trash2, X } from 'lucide-react'
import { supabase } from '@/utils/supabase'
import ProfileAvatar from '@/components/ProfileAvatar'

interface CommentItem { id: string; post_id: string; user_id: string; body: string; created_at: string }
interface FeedPost {
  id: string
  goalId: string
  userId: string
  userName: string
  username: string
  avatarUrl: string | null
  goalTitle: string
  streak: number
  caption: string
  mediaUrl: string | null
  mediaType: 'text' | 'image' | 'video' | 'focus'
  visibility: string
  minutes: number | null
  createdAt: string
  boostCount: number
  boosted: boolean
  comments: CommentItem[]
  isFollowing: boolean
}

const relativeTime = (value: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function FeedPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'circle'>('all')
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [nudgingPost, setNudgingPost] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editingCaption, setEditingCaption] = useState('')

  const loadFeed = useCallback(async () => {
    setLoading(true); setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace('/login?next=/feed'); return }
    const currentUserId = session.user.id
    setUserId(currentUserId)
    const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false)
    setUnreadCount(count || 0)

    const postsResult = await supabase.from('posts').select('id,user_id,goal_id,caption,media_url,proof_type,visibility,minutes_logged,created_at,goals(title,current_streak)').order('created_at', { ascending: false }).limit(30)
    if (postsResult.error) { setError('The community feed is not ready yet. Apply the social database migration, then retry.'); setLoading(false); return }
    const rows = (postsResult.data || []) as unknown as Array<Record<string, unknown>>
    const postIds = rows.map((row) => String(row.id))
    const authorIds = [...new Set(rows.map((row) => String(row.user_id)))]

    const [profilesResult, reactionsResult, commentsResult, followsResult] = await Promise.all([
      authorIds.length ? supabase.from('profiles').select('*').in('id', authorIds) : Promise.resolve({ data: [], error: null }),
      postIds.length ? supabase.from('post_reactions').select('post_id,user_id').in('post_id', postIds) : Promise.resolve({ data: [], error: null }),
      postIds.length ? supabase.from('post_comments').select('id,post_id,user_id,body,created_at').in('post_id', postIds).order('created_at', { ascending: true }).limit(150) : Promise.resolve({ data: [], error: null }),
      supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
    ])

    const profiles = new Map<string, Record<string, unknown>>(((profilesResult.data || []) as Array<Record<string, unknown>>).map((profile) => [String(profile.id), profile]))
    const reactions = (reactionsResult.data || []) as Array<{ post_id: string; user_id: string }>
    const comments = (commentsResult.data || []) as CommentItem[]
    const following = new Set<string>(((followsResult.data || []) as Array<{ following_id: string }>).map((item) => item.following_id))

    setPosts(rows.map((row) => {
      const authorId = String(row.user_id)
      const profile = profiles.get(authorId)
      const goalValue = row.goals as Record<string, unknown> | Array<Record<string, unknown>> | null
      const goal = Array.isArray(goalValue) ? goalValue[0] : goalValue
      const emailName = authorId === currentUserId ? session.user.email?.split('@')[0] : null
      return {
        id: String(row.id), goalId: String(row.goal_id), userId: authorId,
        userName: String(profile?.full_name || profile?.display_name || emailName || 'GoalCircle member'),
        username: String(profile?.username || profile?.handle || 'member').replace(/^@/, ''),
        avatarUrl: profile?.avatar_url ? String(profile.avatar_url) : null,
        goalTitle: String(goal?.title || 'Personal goal'), streak: Number(goal?.current_streak || 0),
        caption: String(row.caption || ''), mediaUrl: row.media_url ? String(row.media_url) : null,
        mediaType: String(row.proof_type || 'text') as FeedPost['mediaType'], visibility: String(row.visibility || 'public'),
        minutes: row.minutes_logged == null ? null : Number(row.minutes_logged), createdAt: String(row.created_at),
        boostCount: reactions.filter((item) => item.post_id === row.id).length,
        boosted: reactions.some((item) => item.post_id === row.id && item.user_id === currentUserId),
        comments: comments.filter((item) => item.post_id === row.id), isFollowing: authorId === currentUserId || following.has(authorId),
      }
    }))
    setLoading(false)
  }, [router])

  useEffect(() => { void Promise.resolve().then(loadFeed) }, [loadFeed])
  const displayedPosts = useMemo(() => activeTab === 'circle' ? posts.filter((post) => post.isFollowing) : posts, [activeTab, posts])

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 1800) }

  const toggleBoost = async (post: FeedPost) => {
    if (!userId) return
    const nextBoosted = !post.boosted
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, boosted: nextBoosted, boostCount: Math.max(0, item.boostCount + (nextBoosted ? 1 : -1)) } : item))
    const result = nextBoosted
      ? await supabase.from('post_reactions').insert({ post_id: post.id, user_id: userId, reaction: 'boost' })
      : await supabase.from('post_reactions').delete().eq('post_id', post.id).eq('user_id', userId).eq('reaction', 'boost')
    if (result.error) { setPosts((current) => current.map((item) => item.id === post.id ? post : item)); showToast('Could not save your boost.') }
    else if (nextBoosted) showToast('Boost sent ⚡')
  }

  const addComment = async (postId: string) => {
    if (!userId || !commentText.trim()) return
    const body = commentText.trim(); setCommentText('')
    const { data, error: commentError } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, body }).select('id,post_id,user_id,body,created_at').single()
    if (commentError || !data) { setCommentText(body); showToast('Comment was not saved.'); return }
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: [...post.comments, data as CommentItem] } : post)); showToast('Comment added')
  }

  const sharePost = async (post: FeedPost) => {
    const url = `${window.location.origin}/goal/${post.goalId}`
    if (navigator.share) { try { await navigator.share({ title: post.goalTitle, text: post.caption, url }); return } catch { return } }
    await navigator.clipboard.writeText(url); showToast('Goal link copied')
  }

  const nudgeFriend = async (post: FeedPost) => {
    if (!userId || post.userId === userId || nudgingPost) return
    setNudgingPost(post.id)
    const { error: nudgeError } = await supabase.rpc('send_nudge', { target_user_id: post.userId, target_post_id: post.id })
    setNudgingPost(null)
    showToast(nudgeError ? (nudgeError.message.includes('already nudged') ? 'You already nudged this friend today.' : 'Nudge could not be sent.') : `Nudge sent to ${post.userName} 👉`)
  }

  const saveCaption = async (post: FeedPost) => {
    const caption = editingCaption.trim()
    if (!userId || post.userId !== userId || !caption) return
    const { error: updateError } = await supabase.from('posts').update({ caption }).eq('id', post.id).eq('user_id', userId)
    if (updateError) { showToast('Caption could not be updated.'); return }
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, caption } : item)); setEditingPost(null); showToast('Caption updated')
  }

  const deletePost = async (post: FeedPost) => {
    if (!userId || post.userId !== userId || !window.confirm('Delete this progress post? This cannot be undone.')) return
    const { error: deleteError } = await supabase.from('posts').delete().eq('id', post.id).eq('user_id', userId)
    if (deleteError) { showToast('Post could not be deleted.'); return }
    setPosts((current) => current.filter((item) => item.id !== post.id)); showToast('Post deleted')
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl pb-28">
      {toast && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-white shadow-xl dark:bg-white dark:text-slate-950">{toast}</div>}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-50/90 px-4 pb-3 pt-5 backdrop-blur-xl dark:border-slate-800 dark:bg-[#07101f]/90">
        <div className="mb-4 flex items-center justify-between"><div><h1 className="text-xl font-black">⚡ Feed</h1><p className="text-[11px] text-slate-500 dark:text-slate-400">Community accountability and progress</p></div><div className="flex items-center gap-2"><Link href="/notifications" aria-label={`${unreadCount} unread notifications`} className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"><Bell className="h-4 w-4" />{unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{Math.min(unreadCount, 99)}</span>}</Link><Link href="/check-in" className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-black text-slate-950"><Plus className="h-3.5 w-3.5" />Check in</Link></div></div>
        <div className="grid grid-cols-2 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"><button onClick={() => setActiveTab('all')} className={`rounded-lg py-2 text-xs font-bold ${activeTab === 'all' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>All updates</button><button onClick={() => setActiveTab('circle')} className={`rounded-lg py-2 text-xs font-bold ${activeTab === 'circle' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>My circle</button></div>
      </header>

      <div className="space-y-4 px-3 py-4">
        {loading && [1, 2].map((item) => <div key={item} className="h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />)}
        {!loading && error && <div className="rounded-3xl border border-rose-200 bg-white p-7 text-center dark:border-rose-900/60 dark:bg-[#101b2d]"><Target className="mx-auto mb-3 h-7 w-7 text-rose-500" /><p className="text-sm font-black">Feed unavailable</p><p className="mt-1 text-xs text-slate-500">{error}</p><button onClick={() => void loadFeed()} className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950">Retry</button></div>}
        {!loading && !error && displayedPosts.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700"><Target className="mx-auto mb-3 h-8 w-8 text-amber-500" /><h2 className="font-black">No check-ins here yet</h2><p className="mb-4 mt-1 text-xs text-slate-500">Be the first to share real progress.</p><Link href="/check-in" className="inline-flex rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950">Post a check-in</Link></div>}
        {displayedPosts.map((post) => <article key={post.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700/70 dark:bg-[#101b2d]">
          <div className="flex items-center justify-between p-4"><Link href={`/u/${post.username}`} className="flex min-w-0 items-center gap-3"><ProfileAvatar value={post.avatarUrl} name={post.userName} size={40} className="rounded-full" /><div className="min-w-0"><p className="truncate text-xs font-black">{post.userName}</p><p className="truncate text-[10px] text-slate-500">@{post.username}</p></div></Link><div className="flex items-center gap-1">{post.userId === userId && <><button onClick={() => { setEditingPost(post.id); setEditingCaption(post.caption) }} aria-label="Edit caption" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-amber-500 dark:hover:bg-slate-800"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void deletePost(post)} aria-label="Delete post" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /></button></>}<span className="ml-1 text-[10px] font-semibold text-slate-400">{relativeTime(post.createdAt)}</span></div></div>
          <div className="mx-4 mb-3 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-[#07101f]"><span className="truncate text-xs font-bold"><Target className="mr-1.5 inline h-3.5 w-3.5 text-amber-500" />{post.goalTitle}</span><span className="flex shrink-0 items-center gap-2">{post.visibility === 'private' && <LockKeyhole className="h-3 w-3 text-slate-400" aria-label="Private post" />}{post.streak > 0 && <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">🔥 {post.streak}d</span>}</span></div>
          {post.mediaUrl && (post.mediaType === 'video' ? <div className="bg-slate-950"><video src={post.mediaUrl} controls preload="metadata" playsInline className="mx-auto max-h-[70vh] w-full object-contain" /></div> : <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-950"><Image src={post.mediaUrl} alt="Progress proof" fill unoptimized sizes="(max-width: 640px) 100vw, 576px" className="object-cover" /></div>)}
          <div className="p-4">{post.minutes != null && <div className="mb-2 inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300"><Clock3 className="h-3 w-3" />{post.minutes} focused minutes</div>}{editingPost === post.id ? <div className="flex gap-2"><input autoFocus value={editingCaption} onChange={(event) => setEditingCaption(event.target.value)} maxLength={500} className="min-w-0 flex-1 rounded-xl border border-amber-500 bg-slate-50 px-3 py-2 text-sm outline-none dark:bg-[#07101f]" /><button onClick={() => void saveCaption(post)} aria-label="Save caption" className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-slate-950"><Check className="h-4 w-4" /></button><button onClick={() => setEditingPost(null)} aria-label="Cancel editing" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 dark:border-slate-700"><X className="h-4 w-4" /></button></div> : <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{post.caption}</p>}
            <div className={`mt-4 grid ${post.userId === userId ? 'grid-cols-3' : 'grid-cols-4'} border-t border-slate-100 pt-3 dark:border-slate-800`}><button onClick={() => void toggleBoost(post)} className={`flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold ${post.boosted ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}><Bolt className="h-4 w-4" fill={post.boosted ? 'currentColor' : 'none'} />Boost {post.boostCount || ''}</button><button onClick={() => setOpenComments(openComments === post.id ? null : post.id)} className="flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold text-slate-500"><MessageCircle className="h-4 w-4" />Comment {post.comments.length || ''}</button>{post.userId !== userId && <button onClick={() => void nudgeFriend(post)} disabled={nudgingPost === post.id} className="flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold text-slate-500 disabled:opacity-50"><Hand className="h-4 w-4" />Nudge</button>}<button onClick={() => void sharePost(post)} className="flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-bold text-slate-500"><Share2 className="h-4 w-4" />Share</button></div>
            {openComments === post.id && <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">{post.comments.map((comment) => <p key={comment.id} className="rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-[#07101f]">{comment.body}</p>)}<div className="flex gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void addComment(post.id) } }} maxLength={500} placeholder="Add encouragement…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-[#07101f]" /><button onClick={() => void addComment(post.id)} disabled={!commentText.trim()} className="rounded-xl bg-amber-500 px-3 text-xs font-black text-slate-950 disabled:opacity-40">Post</button></div></div>}
          </div>
        </article>)}
      </div>
    </main>
  )
}
