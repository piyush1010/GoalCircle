-- Harden GoalCircle's authenticated data boundary without replacing data.
-- This migration is idempotent and is safe to re-run in production.

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'goals', 'focus_logs', 'circles', 'circle_members',
    'circle_memberships', 'user_relationships', 'posts', 'post_comments',
    'post_reactions', 'follows', 'notifications', 'reports', 'blocks',
    'challenge_invites'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

-- A post must belong to both the signed-in user and one of that user's goals.
drop policy if exists "Users create their own posts" on public.posts;
create policy "Users create their own posts" on public.posts for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.goals
    where goals.id = posts.goal_id
      and goals.user_id = (select auth.uid())
  )
);

drop policy if exists "Users update their own posts" on public.posts;
create policy "Users update their own posts" on public.posts for update to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.goals
    where goals.id = posts.goal_id
      and goals.user_id = (select auth.uid())
  )
);

-- Members may only grant themselves the normal member role. Circle owners are
-- the only users allowed to create their own owner membership row.
drop policy if exists "Users join circles" on public.circle_memberships;
create policy "Users join circles" on public.circle_memberships for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    role = 'member'
    or (
      role = 'owner'
      and exists (
        select 1 from public.circles
        where circles.id = circle_memberships.circle_id
          and circles.owner_id = (select auth.uid())
      )
    )
  )
);

-- Reports are append-only for ordinary users. A reporter can inspect their own
-- submissions, but cannot read other people's reports or alter moderation data.
drop policy if exists "Users read their own reports" on public.reports;
create policy "Users read their own reports" on public.reports for select to authenticated
using (reporter_id = (select auth.uid()));

drop policy if exists "Users create reports" on public.reports;
create policy "Users create reports" on public.reports for insert to authenticated
with check (reporter_id = (select auth.uid()));

drop policy if exists "Users manage their blocks" on public.blocks;
create policy "Users manage their blocks" on public.blocks for all to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()));

-- Senders may withdraw pending invitations; recipients keep the existing
-- accepted/declined update permission.
do $$
begin
  if to_regclass('public.challenge_invites') is not null then
    execute 'drop policy if exists "Senders delete pending challenge invites" on public.challenge_invites';
    execute 'create policy "Senders delete pending challenge invites" on public.challenge_invites for delete to authenticated using (sender_id = (select auth.uid()) and status = ''pending'')';
  end if;
end $$;

-- Storage writes are confined to the first path segment matching auth.uid().
-- Add missing update/delete coverage so replaced avatars and failed uploads can
-- be cleaned up without granting access to another user's files.
drop policy if exists "Users update their own avatars" on storage.objects;
create policy "Users update their own avatars" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own avatars" on storage.objects;
create policy "Users delete their own avatars" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update their own goal media" on storage.objects;
create policy "Users update their own goal media" on storage.objects for update to authenticated
using (bucket_id = 'goal-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'goal-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete their own goal media" on storage.objects;
create policy "Users delete their own goal media" on storage.objects for delete to authenticated
using (bucket_id = 'goal-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- RPCs are callable only by signed-in users. PostgreSQL grants function execute
-- to PUBLIC by default, so revoke it explicitly after create-or-replace.
do $$
declare signature text;
begin
  foreach signature in array array[
    'public.create_goal_announcement(text,text,text,text)',
    'public.create_goal_announcement(text,text,text,text,date)',
    'public.pause_goal_for_week(uuid)',
    'public.resume_expired_goal_pauses()',
    'public.send_nudge(uuid,uuid)'
  ] loop
    if to_regprocedure(signature) is not null then
      execute format('revoke all on function %s from public, anon', signature);
      execute format('grant execute on function %s to authenticated', signature);
    end if;
  end loop;
end $$;
