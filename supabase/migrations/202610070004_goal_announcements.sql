insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('goal-media', 'goal-media', true, 26214400, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "Goal media is public" on storage.objects;
create policy "Goal media is public" on storage.objects for select using (bucket_id = 'goal-media');
drop policy if exists "Users upload their own goal media" on storage.objects;
create policy "Users upload their own goal media" on storage.objects for insert to authenticated with check (bucket_id = 'goal-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.create_goal_announcement(goal_title text, goal_visibility text, announcement_media_url text default null, announcement_type text default 'text')
returns uuid language plpgsql security invoker set search_path = public as $$
declare new_goal_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(goal_title)) < 3 or char_length(trim(goal_title)) > 100 then raise exception 'Goal title must contain 3 to 100 characters'; end if;
  if goal_visibility not in ('public','private') then raise exception 'Unsupported visibility'; end if;
  if announcement_type not in ('text','image','video') then raise exception 'Unsupported media type'; end if;
  insert into public.goals (user_id,title,visibility,is_completed,current_streak) values (auth.uid(),trim(goal_title),goal_visibility,false,0) returning id into new_goal_id;
  insert into public.posts (user_id,goal_id,caption,media_url,proof_type,visibility) values (auth.uid(),new_goal_id,'Announced a new goal: ' || trim(goal_title),announcement_media_url,announcement_type,goal_visibility);
  return new_goal_id;
end; $$;
grant execute on function public.create_goal_announcement(text,text,text,text) to authenticated;
