-- GoalCircle core schema. This migration is intentionally additive so it can
-- initialize a fresh preview project without replacing existing production data.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  is_public boolean not null default true,
  is_onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists is_public boolean not null default true;
alter table public.profiles add column if not exists is_onboarded boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
create unique index if not exists profiles_username_key on public.profiles(username) where username is not null;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  target_days integer check (target_days is null or target_days between 1 and 3650),
  current_streak integer not null default 0 check (current_streak >= 0),
  streak_count integer not null default 0 check (streak_count >= 0),
  is_completed boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  pause_count integer not null default 0 check (pause_count between 0 and 2),
  paused_at timestamptz,
  pause_reason text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals add column if not exists target_days integer;
alter table public.goals add column if not exists current_streak integer not null default 0;
alter table public.goals add column if not exists streak_count integer not null default 0;
alter table public.goals add column if not exists is_completed boolean not null default false;
alter table public.goals add column if not exists status text not null default 'active';
alter table public.goals add column if not exists pause_count integer not null default 0;
alter table public.goals add column if not exists paused_at timestamptz;
alter table public.goals add column if not exists pause_reason text;
alter table public.goals add column if not exists category text;
alter table public.goals add column if not exists created_at timestamptz not null default now();
alter table public.goals add column if not exists updated_at timestamptz not null default now();
create index if not exists goals_user_id_created_at_idx on public.goals(user_id, created_at desc);

create table if not exists public.focus_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  minutes_logged integer not null check (minutes_logged between 1 and 1440),
  note text,
  logged_at timestamptz not null default now()
);

alter table public.focus_logs add column if not exists goal_id uuid references public.goals(id) on delete set null;
alter table public.focus_logs add column if not exists minutes_logged integer;
alter table public.focus_logs add column if not exists note text;
alter table public.focus_logs add column if not exists logged_at timestamptz not null default now();
create index if not exists focus_logs_user_id_logged_at_idx on public.focus_logs(user_id, logged_at desc);
create index if not exists focus_logs_goal_id_idx on public.focus_logs(goal_id);

create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  member_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.circles add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.circles add column if not exists description text;
alter table public.circles add column if not exists member_count integer not null default 0;
alter table public.circles add column if not exists created_at timestamptz not null default now();

create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  guarded_id uuid not null references auth.users(id) on delete cascade,
  supporter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (guarded_id, supporter_id),
  check (guarded_id <> supporter_id)
);

alter table public.circle_members add column if not exists guarded_id uuid references auth.users(id) on delete cascade;
alter table public.circle_members add column if not exists supporter_id uuid references auth.users(id) on delete cascade;
alter table public.circle_members add column if not exists created_at timestamptz not null default now();

create table if not exists public.user_relationships (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

alter table public.user_relationships add column if not exists follower_id uuid references auth.users(id) on delete cascade;
alter table public.user_relationships add column if not exists following_id uuid references auth.users(id) on delete cascade;
alter table public.user_relationships add column if not exists created_at timestamptz not null default now();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists reporter_id uuid references auth.users(id) on delete cascade;
alter table public.reports add column if not exists target_user_id uuid references auth.users(id) on delete cascade;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists created_at timestamptz not null default now();

create table if not exists public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks add column if not exists blocker_id uuid references auth.users(id) on delete cascade;
alter table public.blocks add column if not exists blocked_id uuid references auth.users(id) on delete cascade;
alter table public.blocks add column if not exists created_at timestamptz not null default now();

create table if not exists public.challenge_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.challenge_invites add column if not exists sender_id uuid references auth.users(id) on delete cascade;
alter table public.challenge_invites add column if not exists recipient_id uuid references auth.users(id) on delete cascade;
alter table public.challenge_invites add column if not exists status text not null default 'pending';
alter table public.challenge_invites add column if not exists created_at timestamptz not null default now();
alter table public.challenge_invites add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.focus_logs enable row level security;
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.user_relationships enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;
alter table public.challenge_invites enable row level security;

drop policy if exists "Profiles are visible to signed-in users" on public.profiles;
create policy "Profiles are visible to signed-in users" on public.profiles for select to authenticated using (true);
drop policy if exists "Users create their own profile" on public.profiles;
create policy "Users create their own profile" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Users manage their own goals" on public.goals;
create policy "Users manage their own goals" on public.goals for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Users manage their own focus logs" on public.focus_logs;
create policy "Users manage their own focus logs" on public.focus_logs for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "Signed-in users can view circles" on public.circles;
create policy "Signed-in users can view circles" on public.circles for select to authenticated using (true);
drop policy if exists "Owners manage their circles" on public.circles;
create policy "Owners manage their circles" on public.circles for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "Circle relationships are visible" on public.circle_members;
create policy "Circle relationships are visible" on public.circle_members for select to authenticated using (true);
drop policy if exists "Supporters manage their circle memberships" on public.circle_members;
create policy "Supporters manage their circle memberships" on public.circle_members for all to authenticated
using (supporter_id = (select auth.uid())) with check (supporter_id = (select auth.uid()));

drop policy if exists "User relationships are visible" on public.user_relationships;
create policy "User relationships are visible" on public.user_relationships for select to authenticated using (true);
drop policy if exists "Users manage their relationships" on public.user_relationships;
create policy "Users manage their relationships" on public.user_relationships for all to authenticated
using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));

drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports for insert to authenticated
with check (reporter_id = (select auth.uid()));
drop policy if exists "Users manage their blocks" on public.blocks;
create policy "Users manage their blocks" on public.blocks for all to authenticated
using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));

drop policy if exists "Challenge participants can read invites" on public.challenge_invites;
create policy "Challenge participants can read invites" on public.challenge_invites for select to authenticated
using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
drop policy if exists "Users send challenge invites" on public.challenge_invites;
create policy "Users send challenge invites" on public.challenge_invites for insert to authenticated
with check (sender_id = (select auth.uid()));
drop policy if exists "Recipients update challenge invites" on public.challenge_invites;
create policy "Recipients update challenge invites" on public.challenge_invites for update to authenticated
using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
