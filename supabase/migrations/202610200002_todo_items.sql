-- A private, goal-linked Today list. Every row is protected by RLS and can
-- only be read or changed by its owner.

create table if not exists public.todo_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  is_completed boolean not null default false,
  due_date date not null default current_date,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists todo_items_user_date_idx
  on public.todo_items(user_id, due_date, is_completed, position);
create index if not exists todo_items_goal_id_idx on public.todo_items(goal_id);

alter table public.todo_items enable row level security;

drop policy if exists "Users read their own todo items" on public.todo_items;
create policy "Users read their own todo items"
on public.todo_items for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users create their own todo items" on public.todo_items;
create policy "Users create their own todo items"
on public.todo_items for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users update their own todo items" on public.todo_items;
create policy "Users update their own todo items"
on public.todo_items for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Users delete their own todo items" on public.todo_items;
create policy "Users delete their own todo items"
on public.todo_items for delete to authenticated
using (user_id = (select auth.uid()));
