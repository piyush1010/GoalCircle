-- GoalCircle social foundation. Apply through a Supabase migration before
-- enabling the database-backed community feed in production.

create extension if not exists pgcrypto;

alter table public.goals
  add column if not exists visibility text not null default 'public'
  check (visibility in ('public', 'followers', 'circle', 'private'));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  caption text check (char_length(caption) <= 2200),
  media_url text,
  proof_type text not null default 'text' check (proof_type in ('text', 'image', 'video', 'focus')),
  minutes_logged integer check (minutes_logged is null or minutes_logged between 0 and 1440),
  visibility text not null default 'public' check (visibility in ('public', 'followers', 'circle', 'private')),
  created_at timestamptz not null default now()
);

alter table public.posts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.posts add column if not exists goal_id uuid references public.goals(id) on delete cascade;
alter table public.posts add column if not exists caption text;
alter table public.posts add column if not exists media_url text;
alter table public.posts add column if not exists proof_type text not null default 'text';
alter table public.posts add column if not exists minutes_logged integer;
alter table public.posts add column if not exists visibility text not null default 'public';
alter table public.posts add column if not exists created_at timestamptz not null default now();

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'boost' check (reaction in ('boost')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists posts_created_at_idx on public.posts(created_at desc);
create index if not exists posts_user_id_created_at_idx on public.posts(user_id, created_at desc);
create index if not exists posts_goal_id_created_at_idx on public.posts(goal_id, created_at desc);
create index if not exists post_comments_post_id_idx on public.post_comments(post_id, created_at);
create index if not exists follows_following_id_idx on public.follows(following_id);

alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.follows enable row level security;

drop policy if exists "Visible goals can be read" on public.goals;
create policy "Visible goals can be read" on public.goals for select to authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.follows
      where follower_id = (select auth.uid()) and following_id = goals.user_id
    )
  )
);

drop policy if exists "Visible posts can be read" on public.posts;
create policy "Visible posts can be read" on public.posts for select to authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or (
    visibility = 'followers'
    and exists (
      select 1 from public.follows
      where follower_id = (select auth.uid()) and following_id = posts.user_id
    )
  )
);

drop policy if exists "Users create their own posts" on public.posts;
create policy "Users create their own posts" on public.posts for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users update their own posts" on public.posts;
create policy "Users update their own posts" on public.posts for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users delete their own posts" on public.posts;
create policy "Users delete their own posts" on public.posts for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Comments on visible posts can be read" on public.post_comments;
create policy "Comments on visible posts can be read" on public.post_comments for select to authenticated
using (exists (select 1 from public.posts where posts.id = post_comments.post_id));

drop policy if exists "Users create their own comments" on public.post_comments;
create policy "Users create their own comments" on public.post_comments for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.posts where posts.id = post_comments.post_id));

drop policy if exists "Users delete their own comments" on public.post_comments;
create policy "Users delete their own comments" on public.post_comments for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Reactions on visible posts can be read" on public.post_reactions;
create policy "Reactions on visible posts can be read" on public.post_reactions for select to authenticated
using (exists (select 1 from public.posts where posts.id = post_reactions.post_id));

drop policy if exists "Users manage their own reactions" on public.post_reactions;
create policy "Users manage their own reactions" on public.post_reactions for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Follow relationships are visible" on public.follows;
create policy "Follow relationships are visible" on public.follows for select to authenticated using (true);

drop policy if exists "Users manage who they follow" on public.follows;
create policy "Users manage who they follow" on public.follows for all to authenticated
using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));
