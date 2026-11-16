'use client'

import { useCallback, useEffect, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import Composer, { type Place } from '@/components/communities/Composer'
import PostCard from '@/components/communities/PostCard'
import { loadPosts, waitingFirst, type DiscussionPost } from '@/lib/discussions'

/**
 * Questions and posts from one or more communities, with a box to ask your own.
 * On a community page it's that community; in the feed it's every community you're in.
 */
export default function Discussion({ places, showCommunity = false, emptyTitle, emptyLine }: {
  places: Place[]; showCommunity?: boolean; emptyTitle: string; emptyLine: string
}) {
  const keys = places.map((p) => p.key).join(',')
  const [posts, setPosts] = useState<DiscussionPost[] | null>(null)
  const [more, setMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [writing, setWriting] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    const page = await loadPosts(keys ? keys.split(',') : [])
    if (page.error) { setError(true); setPosts([]); return }
    setPosts(waitingFirst(page.posts)); setMore(page.more)
  }, [keys])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const loadMore = async () => {
    if (!posts?.length) return
    setLoadingMore(true)
    const oldest = posts.reduce((min, p) => (p.created_at < min ? p.created_at : min), posts[0].created_at)
    const page = await loadPosts(keys.split(','), oldest)
    setLoadingMore(false)
    if (page.error) { setError(true); return }
    setPosts((cur) => [...(cur ?? []), ...page.posts]); setMore(page.more)
  }

  return <div className="space-y-3">
    {writing
      ? <Composer places={places} onCancel={() => setWriting(false)} onDone={(post) => { setWriting(false); setPosts((cur) => [post, ...(cur ?? [])]) }} />
      : <button type="button" onClick={() => setWriting(true)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left dark:border-slate-800 dark:bg-slate-900">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-800"><MessageCircleQuestion className="h-5 w-5 text-slate-600 dark:text-slate-300" /></span>
          <span className="min-w-0 flex-1 text-[15px] text-slate-500">Ask a question or share something</span>
        </button>}

    {posts === null && [1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-busy="true" />)}
    {error && <div className="rounded-2xl border border-slate-200 p-4 text-center text-sm dark:border-slate-800">
      <p>The discussion couldn’t be loaded.</p>
      <button type="button" onClick={() => void load()} className="mt-2 font-semibold underline underline-offset-2">Try again</button>
    </div>}
    {posts && !error && posts.length === 0 && !writing && <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
      <p className="font-semibold">{emptyTitle}</p>
      <p className="mt-1 text-sm text-slate-500">{emptyLine}</p>
    </div>}
    {posts?.map((post) => <PostCard key={post.id} post={post} showCommunity={showCommunity} />)}
    {more && !error && <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900">{loadingMore ? 'Loading…' : 'Show older posts'}</button>}
  </div>
}
