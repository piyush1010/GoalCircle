create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak')),
  post_id uuid references public.posts(id) on delete cascade,
  circle_id uuid references public.circles(id) on delete cascade,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications(recipient_id, is_read) where not is_read;

alter table public.notifications enable row level security;
drop policy if exists "Users read their notifications" on public.notifications;
create policy "Users read their notifications" on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()));
drop policy if exists "Users update their notifications" on public.notifications;
create policy "Users update their notifications" on public.notifications for update to authenticated
using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
drop policy if exists "Users delete their notifications" on public.notifications;
create policy "Users delete their notifications" on public.notifications for delete to authenticated
using (recipient_id = (select auth.uid()));

create or replace function public.notify_post_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid; notification_kind text;
begin
  select user_id into owner_id from public.posts where id = new.post_id;
  if owner_id is null or owner_id = new.user_id then return new; end if;
  notification_kind := case when tg_table_name = 'post_comments' then 'comment' else 'boost' end;
  insert into public.notifications(recipient_id, actor_id, kind, post_id)
  values(owner_id, new.user_id, notification_kind, new.post_id);
  return new;
end; $$;

drop trigger if exists post_comments_create_notification on public.post_comments;
create trigger post_comments_create_notification after insert on public.post_comments
for each row execute function public.notify_post_activity();
drop trigger if exists post_reactions_create_notification on public.post_reactions;
create trigger post_reactions_create_notification after insert on public.post_reactions
for each row execute function public.notify_post_activity();

create or replace function public.notify_new_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(recipient_id, actor_id, kind)
  values(new.following_id, new.follower_id, 'follow');
  return new;
end; $$;
drop trigger if exists follows_create_notification on public.follows;
create trigger follows_create_notification after insert on public.follows
for each row execute function public.notify_new_follow();

create or replace function public.send_nudge(target_user_id uuid, target_post_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; target_visibility text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_user_id = auth.uid() then raise exception 'You cannot nudge yourself'; end if;
  select visibility into target_visibility from public.posts
    where id = target_post_id and user_id = target_user_id;
  if target_visibility is null then raise exception 'Post not found'; end if;
  if target_visibility = 'private' then raise exception 'This post is private'; end if;
  if exists (
    select 1 from public.notifications
    where recipient_id = target_user_id and actor_id = auth.uid()
      and post_id = target_post_id and kind = 'nudge'
      and created_at > now() - interval '24 hours'
  ) then raise exception 'You already nudged this friend today'; end if;
  insert into public.notifications(recipient_id, actor_id, kind, post_id)
  values(target_user_id, auth.uid(), 'nudge', target_post_id)
  returning id into new_id;
  return new_id;
end; $$;
revoke all on function public.send_nudge(uuid, uuid) from public;
grant execute on function public.send_nudge(uuid, uuid) to authenticated;
