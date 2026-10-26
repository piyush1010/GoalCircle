begin;

create table if not exists public.goal_collaborators (
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'contributor' check (role in ('contributor')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (goal_id, user_id),
  check (user_id <> invited_by)
);

alter table public.goal_collaborators enable row level security;

create or replace function public.is_goal_owner_or_collaborator(target_goal_id uuid, viewer_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.goals goal
    where goal.id = target_goal_id and goal.user_id = viewer_id
  ) or exists (
    select 1 from public.goal_collaborators collaborator
    where collaborator.goal_id = target_goal_id
      and collaborator.user_id = viewer_id
      and collaborator.status = 'accepted'
  );
$$;

revoke all on function public.is_goal_owner_or_collaborator(uuid, uuid) from public;
grant execute on function public.is_goal_owner_or_collaborator(uuid, uuid) to authenticated;

create policy "Goal teams view collaboration"
on public.goal_collaborators for select to authenticated
using (public.is_goal_owner_or_collaborator(goal_id) or user_id = (select auth.uid()));

create policy "Goal owners invite collaborators"
on public.goal_collaborators for insert to authenticated
with check (
  invited_by = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1 from public.goals goal
    where goal.id = goal_collaborators.goal_id
      and goal.user_id = (select auth.uid())
  )
);

create policy "Invitees respond to collaboration"
on public.goal_collaborators for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Owners or members remove collaboration"
on public.goal_collaborators for delete to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.goals goal
    where goal.id = goal_collaborators.goal_id
      and goal.user_id = (select auth.uid())
  )
);

create or replace function public.guard_goal_collaborator_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.goal_id <> old.goal_id
    or new.user_id <> old.user_id
    or new.invited_by <> old.invited_by
    or new.role <> old.role then
    raise exception 'Collaboration identity and role cannot be changed';
  end if;
  if old.status <> 'pending' then
    raise exception 'This collaboration invitation has already been answered';
  end if;
  if new.status not in ('accepted', 'declined') then
    raise exception 'Choose accepted or declined';
  end if;
  new.responded_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists goal_collaborator_update_guard on public.goal_collaborators;
create trigger goal_collaborator_update_guard
before update on public.goal_collaborators
for each row execute function public.guard_goal_collaborator_update();

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add column if not exists goal_id uuid references public.goals(id) on delete cascade;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted'
  )
);

create or replace function public.notify_goal_collaboration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare goal_title text;
begin
  select title into goal_title from public.goals where id = new.goal_id;
  if tg_op = 'INSERT' then
    insert into public.notifications(recipient_id, actor_id, kind, goal_id, message)
    values(new.user_id, new.invited_by, 'goal_collaboration_invite', new.goal_id, 'invited you to collaborate on “' || coalesce(goal_title, 'a goal') || '”.');
  elsif new.status = 'accepted' and old.status = 'pending' then
    insert into public.notifications(recipient_id, actor_id, kind, goal_id, message)
    values(new.invited_by, new.user_id, 'goal_collaboration_accepted', new.goal_id, 'joined your shared goal “' || coalesce(goal_title, 'Goal') || '”.');
  end if;
  return new;
end;
$$;

drop trigger if exists goal_collaboration_notification on public.goal_collaborators;
create trigger goal_collaboration_notification
after insert or update on public.goal_collaborators
for each row execute function public.notify_goal_collaboration();

revoke execute on function public.notify_goal_collaboration() from public, anon, authenticated;
revoke execute on function public.guard_goal_collaborator_update() from public, anon, authenticated;

drop policy if exists "Visible goals can be read" on public.goals;
create policy "Visible goals can be read" on public.goals for select to authenticated
using (
  user_id = (select auth.uid())
  or visibility = 'public'
  or public.is_goal_owner_or_collaborator(id)
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
  or public.is_goal_owner_or_collaborator(goal_id)
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
with check (
  user_id = (select auth.uid())
  and public.is_goal_owner_or_collaborator(goal_id)
);

create index if not exists goal_collaborators_user_status_idx
  on public.goal_collaborators(user_id, status, updated_at desc);
create index if not exists goal_collaborators_goal_status_idx
  on public.goal_collaborators(goal_id, status);

notify pgrst, 'reload schema';

commit;
