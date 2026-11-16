import { supabase } from '@/utils/supabase'

/** A question or a post in a community, as community_post_cards returns it. */
export interface DiscussionPost {
  id: string; community: string; user_id: string; kind: 'question' | 'post'; body: string; image_url: string | null
  helpful_comment_id: string | null; hidden: boolean; created_at: string; edited_at: string | null; answers: number
  author_name: string; author_username: string; author_avatar: string | null; author_mentor: boolean
}

/** An answer or a reply, as community_comment_cards returns it. */
export interface DiscussionComment {
  id: string; post_id: string; user_id: string; body: string; hidden: boolean; created_at: string; edited_at: string | null
  author_name: string; author_username: string; author_avatar: string | null; author_mentor: boolean
}

export const PAGE_SIZE = 15

/** One page of posts in some communities, newest first. Pass the oldest created_at you have to get the next page. */
export async function loadPosts(communities: string[], before?: string) {
  if (!communities.length) return { posts: [] as DiscussionPost[], more: false, error: null }
  let query = supabase.from('community_post_cards').select('*').in('community', communities).order('created_at', { ascending: false }).limit(PAGE_SIZE + 1)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  const rows = (data ?? []) as DiscussionPost[]
  return { posts: rows.slice(0, PAGE_SIZE), more: rows.length > PAGE_SIZE, error }
}

/**
 * Questions still waiting for an answer go first for their first day, so they aren't buried.
 * Everything else stays newest first.
 */
export function waitingFirst(posts: DiscussionPost[], now = Date.now()) {
  const waiting = (p: DiscussionPost) => p.kind === 'question' && p.answers === 0 && now - new Date(p.created_at).getTime() < 86_400_000
  return [...posts.filter(waiting), ...posts.filter((p) => !waiting(p))]
}

/** The answer that helped comes first, then the rest in the order they were written. */
export function helpfulFirst(comments: DiscussionComment[], helpfulId: string | null) {
  return [...comments.filter((c) => c.id === helpfulId), ...comments.filter((c) => c.id !== helpfulId)]
}

/** Plain-words messages for what the database refuses. */
export function saveError(message: string | undefined) {
  const m = message ?? ''
  if (m.includes('GY_LIMIT_POSTS')) return 'You’ve posted five times today, which is the daily limit. You can post again tomorrow.'
  if (m.includes('GY_LIMIT_ANSWERS')) return 'You’ve reached today’s limit for answers. You can answer again tomorrow.'
  if (m.includes('GY_NO_LINKS')) return 'New accounts can’t share links in their first week. Please describe it in words instead.'
  if (m.includes('GY_BAD_IMAGE')) return 'That photo couldn’t be used. Please add it again.'
  if (m.includes('GY_OWN_REPORT')) return 'You can’t report your own post.'
  if (m.includes('row-level security') || m.includes('42501')) return 'You can’t reply to this any more.'
  return 'That didn’t save. Please check your connection and try again.'
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "12 Nov" */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/** "No answers yet", "1 answer", "4 replies" */
export function answersLine(post: Pick<DiscussionPost, 'kind' | 'answers'>) {
  const noun = post.kind === 'question' ? 'answer' : 'reply'
  if (post.answers === 0) return post.kind === 'question' ? 'No answers yet' : 'No replies yet'
  return `${post.answers} ${post.answers === 1 ? noun : post.kind === 'question' ? 'answers' : 'replies'}`
}

export const REPORT_REASONS: [string, string][] = [
  ['spam', 'Spam or an advert'],
  ['rude', 'Rude or hurtful'],
  ['wrong_place', 'Not about this community'],
  ['other', 'Something else'],
]

const MAX_PHOTO = 8 * 1024 * 1024

/** Upload a photo to the person's own folder and return its public address. */
export async function uploadPhoto(userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith('image/')) return { url: null, error: 'Please choose a photo.' }
  if (file.size > MAX_PHOTO) return { url: null, error: 'That photo is over 8 MB. Please choose a smaller one.' }
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/community/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('goal-media').upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
  if (error) return { url: null, error: 'The photo couldn’t be uploaded. Please try again.' }
  return { url: supabase.storage.from('goal-media').getPublicUrl(path).data.publicUrl, error: null }
}

/** Best effort: remove a photo we uploaded when its post goes. */
export async function removePhoto(url: string | null) {
  const path = url?.split('/goal-media/')[1]
  if (path) await supabase.storage.from('goal-media').remove([decodeURIComponent(path)])
}

/** Placeholder text for the box, by community and kind. */
export function composerHint(community: string, kind: 'question' | 'post') {
  if (kind === 'post') return 'Share a tip, a resource or how your week went.'
  if (community.startsWith('exam:')) return 'What are you stuck on? For example: how is certiorari different from prohibition?'
  const hints: Record<string, string> = {
    fitness: 'Ask about form, a plan, or staying regular.',
    reading: 'Ask for a book suggestion, or how others keep reading every day.',
    health: 'Ask about sleep, meditation, or a hard week.',
    learning: 'Ask about a course, a concept, or how others practise.',
    cooking: 'Ask for a recipe or help with a dish.',
    travel: 'Ask about a place, a budget, or planning a trip.',
  }
  return hints[community] ?? 'What would you like to ask?'
}
