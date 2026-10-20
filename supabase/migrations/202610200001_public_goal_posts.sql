-- Public goal announcements can include a user-written caption and optional
-- image or short reel. Private goals remain private and do not create posts.

create or replace function public.create_goal_announcement(
  goal_title text,
  goal_visibility text,
  announcement_media_url text default null,
  announcement_type text default 'text',
  achievement_date date default null,
  announcement_caption text default null
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  new_goal_id uuid;
  final_caption text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(goal_title)) < 3 or char_length(trim(goal_title)) > 100 then
    raise exception 'Goal title must contain 3 to 100 characters';
  end if;
  if goal_visibility not in ('public', 'private') then raise exception 'Unsupported visibility'; end if;
  if announcement_type not in ('text', 'image', 'video') then raise exception 'Unsupported media type'; end if;
  if achievement_date is not null and achievement_date < current_date then raise exception 'Target date cannot be in the past'; end if;
  if announcement_caption is not null and char_length(trim(announcement_caption)) > 500 then
    raise exception 'Announcement caption must contain no more than 500 characters';
  end if;
  if goal_visibility = 'public' and announcement_type in ('image', 'video') and announcement_media_url is null then
    raise exception 'Media is required for photo and reel announcements';
  end if;

  insert into public.goals (user_id, title, visibility, is_completed, current_streak, target_date)
  values (auth.uid(), trim(goal_title), goal_visibility, false, 0, achievement_date)
  returning id into new_goal_id;

  if goal_visibility = 'public' then
    final_caption := coalesce(
      nullif(trim(announcement_caption), ''),
      'I am committing to: ' || trim(goal_title)
    );

    insert into public.posts (user_id, goal_id, caption, media_url, proof_type, visibility)
    values (auth.uid(), new_goal_id, final_caption, announcement_media_url, announcement_type, 'public');
  end if;

  return new_goal_id;
end;
$$;

grant execute on function public.create_goal_announcement(text, text, text, text, date, text) to authenticated;

drop policy if exists "Users delete their own goal media" on storage.objects;
create policy "Users delete their own goal media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'goal-media'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
