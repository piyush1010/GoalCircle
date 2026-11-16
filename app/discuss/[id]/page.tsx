'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Ban, Check, EyeOff, Eye, Flag } from 'lucide-react'
import ItemMenu, { type MenuAction } from '@/components/ItemMenu'
import Composer from '@/components/communities/Composer'
import PostCard, { Byline } from '@/components/communities/PostCard'
import ReportSheet, { blockPerson } from '@/components/communities/ReportSheet'
import { describe } from '@/lib/communities'
import { helpfulFirst, removePhoto, saveError, timeAgo, type DiscussionComment, type DiscussionPost } from '@/lib/discussions'
import { supabase } from '@/utils/supabase'

type Reporting = { postId?: string; commentId?: string; authorId: string; authorName: string }

/** One question or post with its answers. Everyone can answer; the person who asked marks the one that helped. */
export default function DiscussionThread() {
  const router = useRouter()
  const id = String(useParams().id ?? '')
  const [me, setMe] = useState<string | null>(null)
  const [admin, setAdmin] = useState(false)
  const [post, setPost] = useState<DiscussionPost | null | undefined>(undefined)
  const [comments, setComments] = useState<DiscussionComment[]>([])
  const [editingPost, setEditingPost] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [answer, setAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reporting, setReporting] = useState<Reporting | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const say = (text: string) => { setToast(text); window.setTimeout(() => setToast(null), 2200) }

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.replace(`/login?next=/discuss/${id}`); return }
    setMe(session.user.id)
    const [postResult, commentResult, adminResult] = await Promise.all([
      supabase.from('community_post_cards').select('*').eq('id', id).maybeSingle(),
      supabase.from('community_comment_cards').select('*').eq('post_id', id).order('created_at').limit(200),
      supabase.rpc('is_app_admin'),
    ])
    setPost((postResult.data as DiscussionPost | null) ?? null)
    setComments((commentResult.data ?? []) as DiscussionComment[])
    setAdmin(adminResult.data === true)
  }, [id, router])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const back = () => { if (window.history.length > 1) router.back(); else router.push(post ? `/communities/${encodeURIComponent(post.community)}` : '/circles') }
  const top = <div className="flex h-10 items-center gap-1">
    <button type="button" onClick={back} aria-label="Back" className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><ArrowLeft className="h-5 w-5" /></button>
    {post && <Link href={`/communities/${encodeURIComponent(post.community)}`} className="truncate text-[15px] font-semibold">{describe(post.community).name}</Link>}
  </div>
  const shell = 'mx-auto min-h-screen max-w-xl px-4 pb-28 pt-4'

  if (post === undefined) return <main className={shell}>{top}<div className="mt-4 h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" aria-busy="true" /></main>
  if (post === null) return <main className={shell}>{top}
    <div className="pt-10 text-center">
      <h1 className="text-lg font-bold">This post isn’t here any more</h1>
      <p className="mt-1 text-sm text-slate-500">It may have been deleted, or hidden after reports.</p>
      <Link href="/feed?tab=discussions" className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">See other discussions</Link>
    </div>
  </main>

  const mine = post.user_id === me
  const question = post.kind === 'question'

  const deletePost = async () => {
    const { error: e } = await supabase.from('community_posts').delete().eq('id', post.id)
    if (e) { say('That didn’t delete. Please try again.'); return false }
    if (mine) void removePhoto(post.image_url)
    router.replace(`/communities/${encodeURIComponent(post.community)}`)
    return true
  }

  const moderate = async (target: { post?: string; comment?: string }, hide: boolean) => {
    const { error: e } = await supabase.rpc('community_moderate', { target_post: target.post ?? null, target_comment: target.comment ?? null, hide })
    if (e) { say('That didn’t work.'); return }
    if (target.post) setPost({ ...post, hidden: hide })
    else setComments((cur) => cur.map((c) => (c.id === target.comment ? { ...c, hidden: hide } : c)))
    say(hide ? 'Hidden' : 'Shown again')
  }

  const blocked = (authorId: string) => {
    if (authorId === post.user_id) { router.replace(`/communities/${encodeURIComponent(post.community)}`); return }
    setComments((cur) => cur.filter((c) => c.user_id !== authorId))
    say('Blocked')
  }

  const othersActions = (target: Reporting, hidden: boolean): MenuAction[] => [
    { label: 'Report', icon: Flag, onPick: () => setReporting(target) },
    { label: `Block ${target.authorName.split(' ')[0]}`, icon: Ban, onPick: () => void blockPerson(target.authorId, target.authorName).then((ok) => { if (ok) blocked(target.authorId) }), danger: true },
    ...(admin ? [{ label: hidden ? 'Show again' : 'Hide for everyone', icon: hidden ? Eye : EyeOff, onPick: () => void moderate(target.commentId ? { comment: target.commentId } : { post: target.postId }, !hidden) }] : []),
  ]

  const postMenu = <ItemMenu label={question ? 'question' : 'post'}
    onEdit={mine ? () => setEditingPost(true) : undefined}
    onDelete={mine || admin ? deletePost : undefined}
    deleteMessage={`Delete this ${question ? 'question' : 'post'}? Its ${question ? 'answers' : 'replies'} go too. This can't be undone.`}
    actions={mine ? [] : othersActions({ postId: post.id, authorId: post.user_id, authorName: post.author_name }, post.hidden)} />

  const sendAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    const body = answer.trim()
    if (!body || busy) return
    setBusy(true); setError(null)
    const { data, error: e2 } = await supabase.from('community_comments').insert({ post_id: post.id, body }).select('id').single()
    if (e2 || !data) { setBusy(false); setError(saveError(e2?.message)); return }
    const { data: card } = await supabase.from('community_comment_cards').select('*').eq('id', data.id).single()
    setBusy(false); setAnswer('')
    if (card) setComments((cur) => [...cur, card as DiscussionComment])
    setPost({ ...post, answers: post.answers + 1 })
  }

  const saveComment = async (comment: DiscussionComment) => {
    const body = editText.trim()
    if (!body) return
    const { error: e } = await supabase.from('community_comments').update({ body }).eq('id', comment.id)
    if (e) { say(saveError(e.message)); return }
    setComments((cur) => cur.map((c) => (c.id === comment.id ? { ...c, body, edited_at: new Date().toISOString() } : c)))
    setEditingComment(null)
  }

  const deleteComment = async (comment: DiscussionComment) => {
    const { error: e } = await supabase.from('community_comments').delete().eq('id', comment.id)
    if (e) { say('That didn’t delete. Please try again.'); return false }
    setComments((cur) => cur.filter((c) => c.id !== comment.id))
    setPost({ ...post, answers: Math.max(0, post.answers - 1), helpful_comment_id: post.helpful_comment_id === comment.id ? null : post.helpful_comment_id })
    return true
  }

  const markHelpful = async (comment: DiscussionComment) => {
    const next = post.helpful_comment_id === comment.id ? null : comment.id
    const previous = post.helpful_comment_id
    setPost({ ...post, helpful_comment_id: next })
    const { error: e } = await supabase.from('community_posts').update({ helpful_comment_id: next }).eq('id', post.id)
    if (e) { setPost({ ...post, helpful_comment_id: previous }); say('That didn’t save. Please try again.'); return }
    if (next) say(`${comment.author_name.split(' ')[0]} will hear that it helped`)
  }

  const ordered = helpfulFirst(comments, post.helpful_comment_id)
  const noun = question ? 'answer' : 'reply'

  return <main className={shell}>
    {toast && <div role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xl dark:bg-white dark:text-slate-900">{toast}</div>}
    {top}
    <h1 className="sr-only">{question ? 'Question' : 'Post'} from {post.author_name}</h1>
    <div className="mt-2">
      {editingPost
        ? <Composer places={[{ key: post.community, name: describe(post.community).name }]} editing={post} onCancel={() => setEditingPost(false)} onDone={(next) => { setPost(next); setEditingPost(false) }} />
        : <PostCard post={post} full menu={postMenu} />}
    </div>

    <h2 className="mb-3 mt-6 text-base font-semibold">{comments.length === 0 ? (question ? 'No answers yet' : 'No replies yet') : `${comments.length} ${comments.length === 1 ? noun : question ? 'answers' : 'replies'}`}</h2>
    {comments.length === 0 && !mine && <p className="-mt-1 mb-3 text-sm text-slate-500">{question ? 'If you know, help them out. Even a short answer is useful.' : 'Say something kind or useful.'}</p>}
    {comments.length === 0 && mine && <p className="-mt-1 mb-3 text-sm text-slate-500">We’ll let you know when someone {question ? 'answers' : 'replies'}.</p>}

    <ul className="space-y-3">
      {ordered.map((c) => {
        const own = c.user_id === me
        const helped = post.helpful_comment_id === c.id
        return <li key={c.id} className={`rounded-2xl border bg-white p-4 dark:bg-slate-900 ${helped ? 'border-emerald-300 dark:border-emerald-800' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-start justify-between gap-2">
            <Byline name={c.author_name} username={c.author_username} avatar={c.author_avatar} mentor={c.author_mentor} size={32} line={`${timeAgo(c.created_at)}${c.edited_at ? ', edited' : ''}`} />
            <ItemMenu label={noun}
              onEdit={own ? () => { setEditingComment(c.id); setEditText(c.body) } : undefined}
              onDelete={own || admin ? () => deleteComment(c) : undefined}
              deleteMessage={`Delete this ${noun}? This can't be undone.`}
              actions={own ? [] : othersActions({ commentId: c.id, authorId: c.user_id, authorName: c.author_name }, c.hidden)} />
          </div>
          {helped && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><Check className="h-4 w-4" />{mine ? 'You said this helped' : `This helped ${post.author_name.split(' ')[0]}`}</p>}
          {c.hidden && <p className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">Hidden after reports from other people.{own ? ' Only you can see it.' : ''}</p>}
          {editingComment === c.id
            ? <div className="mt-3">
                <label htmlFor={`edit-${c.id}`} className="sr-only">Edit your {noun}</label>
                <textarea id={`edit-${c.id}`} autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} maxLength={1500} className="block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-[15px] outline-none focus:border-slate-500 focus-visible:outline-none dark:border-slate-700 dark:bg-slate-950" />
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingComment(null)} className="h-9 rounded-xl px-3 text-sm font-medium text-slate-500">Cancel</button>
                  <button type="button" disabled={!editText.trim()} onClick={() => void saveComment(c)} className="h-9 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">Save</button>
                </div>
              </div>
            : <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-relaxed">{c.body}</p>}
          {mine && question && !own && editingComment !== c.id && <button type="button" onClick={() => void markHelpful(c)} aria-pressed={helped}
            className={`mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ${helped ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'}`}>
            <Check className="h-4 w-4" />{helped ? 'Helped' : 'This helped'}
          </button>}
        </li>
      })}
    </ul>

    {!post.hidden && <form onSubmit={sendAnswer} className="mt-4 rounded-2xl border border-slate-200 focus-within:border-slate-400 dark:focus-within:border-slate-600 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <label htmlFor="answer" className="sr-only">Your {noun}</label>
      <textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} maxLength={1500}
        placeholder={mine ? 'Add more detail, or reply to an answer' : question ? 'Write your answer' : 'Write a reply'}
        className="block w-full resize-y rounded-xl bg-transparent p-1 text-[15px] leading-relaxed outline-none focus-visible:outline-none" />
      <div className="mt-2 flex items-center justify-end gap-3">
        {error && <p role="alert" className="min-w-0 flex-1 text-sm font-medium text-rose-600">{error}</p>}
        <button type="submit" disabled={!answer.trim() || busy} className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-slate-900">{busy ? 'Posting…' : mine ? 'Post' : question ? 'Post answer' : 'Reply'}</button>
      </div>
    </form>}

    {reporting && <ReportSheet {...reporting} onClose={() => setReporting(null)}
      onHidden={() => { if (reporting.commentId) setComments((cur) => cur.filter((c) => c.id !== reporting.commentId)); else router.replace(`/communities/${encodeURIComponent(post.community)}`) }}
      onBlocked={() => blocked(reporting.authorId)} />}
  </main>
}
