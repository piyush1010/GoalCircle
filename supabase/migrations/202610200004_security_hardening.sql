begin;

-- Signed-out visitors do not need direct access to application tables or RPCs.
-- Authentication itself continues to use Supabase's auth schema.
revoke all privileges on all tables in schema public from anon;
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
alter default privileges in schema public revoke all privileges on tables from anon;
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- Explicitly expose only RPCs used by signed-in application clients.
grant execute on function public.create_goal_post(text, text, text, text, date, text, text, text, text, text, text) to authenticated;
grant execute on function public.create_goal_announcement(text, text, text, text, date) to authenticated;
grant execute on function public.pause_goal_for_week(uuid) to authenticated;
grant execute on function public.resume_expired_goal_pauses() to authenticated;
grant execute on function public.send_nudge(uuid, uuid) to authenticated;

-- Replace broad legacy policies with explicit signed-in and ownership rules.
do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('comments', 'milestones', 'check_in_logs', 'circle_members', 'focus_sessions')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;

  if to_regclass('public.comments') is not null then
    execute $policy$create policy "Signed-in users read comments on visible posts" on public.comments
      for select to authenticated using (
        exists (
          select 1 from public.posts p
          where p.id = comments.post_id
            and (p.user_id = (select auth.uid()) or p.visibility = 'public')
        )
      )$policy$;
    execute $policy$create policy "Users create their own legacy comments" on public.comments
      for insert to authenticated with check (
        user_id = (select auth.uid())
        and exists (
          select 1 from public.posts p
          where p.id = comments.post_id
            and (p.user_id = (select auth.uid()) or p.visibility = 'public')
        )
      )$policy$;
    execute $policy$create policy "Users delete their own legacy comments" on public.comments
      for delete to authenticated using (user_id = (select auth.uid()))$policy$;
  end if;

  if to_regclass('public.check_in_logs') is not null then
    execute $policy$create policy "Users read permitted check-in logs" on public.check_in_logs
      for select to authenticated using (
        user_id = (select auth.uid())
        or exists (
          select 1 from public.goals g
          where g.id = check_in_logs.goal_id and g.visibility = 'public'
        )
      )$policy$;
    execute $policy$create policy "Users create their own check-in logs" on public.check_in_logs
      for insert to authenticated with check (user_id = (select auth.uid()))$policy$;
    execute $policy$create policy "Users update their own check-in logs" on public.check_in_logs
      for update to authenticated using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()))$policy$;
    execute $policy$create policy "Users delete their own check-in logs" on public.check_in_logs
      for delete to authenticated using (user_id = (select auth.uid()))$policy$;
  end if;

  if to_regclass('public.circle_members') is not null then
    execute $policy$create policy "Signed-in users view circle relationships" on public.circle_members
      for select to authenticated using (true)$policy$;
    execute $policy$create policy "Users join a circle as themselves" on public.circle_members
      for insert to authenticated with check (supporter_id = (select auth.uid()))$policy$;
    execute $policy$create policy "Users leave a circle as themselves" on public.circle_members
      for delete to authenticated using (supporter_id = (select auth.uid()))$policy$;
  end if;

  if to_regclass('public.milestones') is not null then
    execute $policy$create policy "Users read milestones for permitted goals" on public.milestones
      for select to authenticated using (
        exists (
          select 1 from public.goals g
          where g.id = milestones.goal_id
            and (g.user_id = (select auth.uid()) or g.visibility = 'public')
        )
      )$policy$;
    execute $policy$create policy "Goal owners create milestones" on public.milestones
      for insert to authenticated with check (
        exists (select 1 from public.goals g where g.id = milestones.goal_id and g.user_id = (select auth.uid()))
      )$policy$;
    execute $policy$create policy "Goal owners update milestones" on public.milestones
      for update to authenticated using (
        exists (select 1 from public.goals g where g.id = milestones.goal_id and g.user_id = (select auth.uid()))
      ) with check (
        exists (select 1 from public.goals g where g.id = milestones.goal_id and g.user_id = (select auth.uid()))
      )$policy$;
    execute $policy$create policy "Goal owners delete milestones" on public.milestones
      for delete to authenticated using (
        exists (select 1 from public.goals g where g.id = milestones.goal_id and g.user_id = (select auth.uid()))
      )$policy$;
  end if;

  if to_regclass('public.focus_sessions') is not null then
    execute $policy$create policy "Signed-in users read active focus rooms" on public.focus_sessions
      for select to authenticated using (host_id = (select auth.uid()) or is_active)$policy$;
    execute $policy$create policy "Hosts create focus rooms" on public.focus_sessions
      for insert to authenticated with check (host_id = (select auth.uid()))$policy$;
    execute $policy$create policy "Hosts update focus rooms" on public.focus_sessions
      for update to authenticated using (host_id = (select auth.uid()))
      with check (host_id = (select auth.uid()))$policy$;
    execute $policy$create policy "Hosts delete focus rooms" on public.focus_sessions
      for delete to authenticated using (host_id = (select auth.uid()))$policy$;
  end if;
end;
$$;

-- Remove every legacy write policy from Storage, including anonymous uploads.
-- Public read access remains intentional for avatars and public social media.
do $$
declare policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on storage.objects', policy_record.policyname);
  end loop;
end;
$$;

create policy "Signed-in users upload owned app media"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('avatars', 'goal-media')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users update their own app media"
on storage.objects for update to authenticated
using (
  bucket_id in ('avatars', 'goal-media')
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id in ('avatars', 'goal-media')
  and owner_id = (select auth.uid())::text
);

create policy "Users delete their own app media"
on storage.objects for delete to authenticated
using (
  bucket_id in ('avatars', 'goal-media')
  and owner_id = (select auth.uid())::text
);

-- Keep explicit upload constraints on every legacy public-media bucket.
update storage.buckets
set file_size_limit = 26214400,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
where id in ('check-ins', 'post-slides', 'progress_proofs');

notify pgrst, 'reload schema';

commit;
