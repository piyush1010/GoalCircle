-- Feed hot-path indexes. All statements are idempotent and preserve existing data.
create index if not exists posts_created_at_desc_idx
  on public.posts (created_at desc);

create index if not exists post_reactions_post_user_idx
  on public.post_reactions (post_id, user_id);

create index if not exists post_comments_post_created_idx
  on public.post_comments (post_id, created_at);

create index if not exists follows_follower_following_idx
  on public.follows (follower_id, following_id);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, is_read)
  where is_read = false;
