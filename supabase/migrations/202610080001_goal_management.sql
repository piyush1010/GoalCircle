alter table public.goals add column if not exists target_date date;
alter table public.goals add column if not exists pause_until timestamptz;

create or replace function public.pause_goal_for_week(target_goal_id uuid)
returns timestamptz language plpgsql security invoker set search_path = public as $$
declare result timestamptz;
begin
  update public.goals
  set status = 'paused',
      paused_at = now(),
      pause_until = now() + interval '7 days',
      pause_count = 1,
      pause_reason = 'compassionate pause',
      updated_at = now()
  where id = target_goal_id
    and user_id = auth.uid()
    and coalesce(pause_count, 0) = 0
    and coalesce(status, 'active') = 'active'
  returning pause_until into result;
  if result is null then
    raise exception 'This goal is not eligible for another pause';
  end if;
  return result;
end; $$;
grant execute on function public.pause_goal_for_week(uuid) to authenticated;

create or replace function public.resume_expired_goal_pauses()
returns integer language plpgsql security invoker set search_path = public as $$
declare updated_count integer;
begin
  update public.goals set status = 'active', pause_until = null, updated_at = now()
  where user_id = auth.uid() and status = 'paused' and pause_until <= now();
  get diagnostics updated_count = row_count;
  return updated_count;
end; $$;
grant execute on function public.resume_expired_goal_pauses() to authenticated;

create or replace function public.create_goal_announcement(
  goal_title text,
  goal_visibility text,
  announcement_media_url text default null,
  announcement_type text default 'text',
  achievement_date date default null
)
returns uuid language plpgsql security invoker set search_path = public as $$
declare new_goal_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(trim(goal_title)) < 3 or char_length(trim(goal_title)) > 100 then raise exception 'Goal title must contain 3 to 100 characters'; end if;
  if goal_visibility not in ('public','private') then raise exception 'Unsupported visibility'; end if;
  if announcement_type not in ('text','image','video') then raise exception 'Unsupported media type'; end if;
  if achievement_date is not null and achievement_date < current_date then raise exception 'Target date cannot be in the past'; end if;
  insert into public.goals (user_id,title,visibility,is_completed,current_streak,target_date)
  values (auth.uid(),trim(goal_title),goal_visibility,false,0,achievement_date)
  returning id into new_goal_id;
  insert into public.posts (user_id,goal_id,caption,media_url,proof_type,visibility)
  values (auth.uid(),new_goal_id,'Announced a new goal: ' || trim(goal_title),announcement_media_url,announcement_type,goal_visibility);
  return new_goal_id;
end; $$;
grant execute on function public.create_goal_announcement(text,text,text,text,date) to authenticated;
