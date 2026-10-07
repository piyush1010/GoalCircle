alter table public.circles add column if not exists category text not null default 'habits';
alter table public.circles add column if not exists emoji text not null default '🎯';
alter table public.circles add column if not exists visibility text not null default 'public';

create table if not exists public.circle_memberships (
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'moderator', 'member')),
  created_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index if not exists circle_memberships_user_id_idx on public.circle_memberships(user_id);
alter table public.circle_memberships enable row level security;
drop policy if exists "Circle memberships are visible" on public.circle_memberships;
create policy "Circle memberships are visible" on public.circle_memberships for select to authenticated using (true);
drop policy if exists "Users join circles" on public.circle_memberships;
create policy "Users join circles" on public.circle_memberships for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Users leave circles" on public.circle_memberships;
create policy "Users leave circles" on public.circle_memberships for delete to authenticated using (user_id = (select auth.uid()));
