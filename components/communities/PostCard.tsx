'use client'

import Link from 'next/link'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import ProfileAvatar from '@/components/ProfileAvatar'
import ClampedText from '@/components/ClampedText'
import { describe } from '@/lib/communities'
import { answersLine, timeAgo, type DiscussionPost } from '@/lib/discussions'

/** The small label next to a mentor's name. */
export function MentorLabel() {
  return <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Mentor</span>
}

/** Who wrote it, and when. Links to their profile when they have a username. */
export function Byline({ name, username, avatar, mentor, line, size = 36 }: { name: string; username: string; avatar: string | null; mentor: boolean; line: string; size?: number }) {
  const who = <span className="flex min-w-0 items-center gap-1.5"><span className="truncate text-[15px] font-semibold">{name}</span>{mentor && <MentorLabel />}</span>
  return <div className="flex min-w-0 items-center gap-3">
    <ProfileAvatar value={avatar} name={name} size={size} className="shrink-0 rounded-full" />
    <div className="min-w-0">
      {username ? <Link href={`/u/${username}`} className="block hover:underline">{who}</Link> : who}
      <p className="truncate text-sm text-slate-500">{line}</p>
    </div>
  </div>
}

/** "Asked 3 hours ago in UPSC CSE, edited" */
export function postLine(post: DiscussionPost, showCommunity: boolean) {
  const verb = post.kind === 'question' ? 'Asked' : 'Posted'
  const where = showCommunity ? ` in ${describe(post.community).name}` : ''
  return `${verb} ${timeAgo(post.created_at)}${where}${post.edited_at ? ', edited' : ''}`
}

/**
 * A question or post in a list. Tapping it opens the full thread.
 * `menu` sits top right (Edit, Delete, Report).
 */
export default function PostCard({ post, showCommunity = false, full = false, menu }: { post: DiscussionPost; showCommunity?: boolean; full?: boolean; menu?: React.ReactNode }) {
  const content = <>
    {post.kind === 'question' && !full && <p className="sr-only">Question:</p>}
    {full ? <p className="whitespace-pre-line break-words text-[16px] leading-relaxed">{post.body}</p> : <ClampedText text={post.body} className="text-[15px] leading-relaxed" />}
    {post.image_url && (full
      ? <a href={post.image_url} target="_blank" rel="noreferrer" className="mt-3 block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt={`Photo from ${post.author_name}`} loading="lazy" className="max-h-[70vh] w-full rounded-xl border border-slate-200 object-contain dark:border-slate-800" />
        </a>
      : /* eslint-disable-next-line @next/next/no-img-element */
        <img src={post.image_url} alt={`Photo from ${post.author_name}`} loading="lazy" className="mt-3 max-h-64 w-full rounded-xl border border-slate-200 object-cover dark:border-slate-800" />)}
  </>

  return <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-2">
      <Byline name={post.author_name} username={post.author_username} avatar={post.author_avatar} mentor={post.author_mentor} line={postLine(post, showCommunity)} />
      {menu}
    </div>
    {post.hidden && <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Hidden after reports from other people. Only you can see it.</p>}
    <div className="mt-3">
      {full ? content : <Link href={`/discuss/${post.id}`} className="block">{content}</Link>}
    </div>
    {!full && <Link href={`/discuss/${post.id}`} className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-sm font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
      {post.helpful_comment_id
        ? <><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /><span>{answersLine(post)}<span className="sr-only">, and one helped</span></span></>
        : <><MessageCircle className="h-4 w-4 text-slate-400" /><span>{answersLine(post)}</span></>}
      <span className="flex-1" />
      <span className="font-semibold text-slate-900 dark:text-white">{post.kind === 'question' ? 'Answer' : 'Reply'}</span>
    </Link>}
  </article>
}
