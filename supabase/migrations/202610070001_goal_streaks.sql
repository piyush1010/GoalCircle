-- Derive streaks from distinct days with real activity. Multiple updates on
-- the same day count once, and a missed day resets the current streak.
create or replace function public.refresh_goal_streak(target_goal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare latest_activity date; calculated_streak integer := 0;
begin
  select max(activity_day) into latest_activity from (
    select (logged_at at time zone 'UTC')::date activity_day from public.focus_logs where goal_id = target_goal_id
    union select (created_at at time zone 'UTC')::date from public.posts where goal_id = target_goal_id
  ) activity;
  if latest_activity is not null and latest_activity >= current_date - 1 then
    with recursive activity_days as (
      select (logged_at at time zone 'UTC')::date activity_day from public.focus_logs where goal_id = target_goal_id
      union select (created_at at time zone 'UTC')::date from public.posts where goal_id = target_goal_id
    ), consecutive(day, count) as (
      select latest_activity, 1 union all select consecutive.day - 1, consecutive.count + 1 from consecutive
      where exists (select 1 from activity_days where activity_day = consecutive.day - 1)
    ) select max(count) into calculated_streak from consecutive;
  end if;
  update public.goals set current_streak = coalesce(calculated_streak, 0), streak_count = greatest(streak_count, coalesce(calculated_streak, 0)), updated_at = now() where id = target_goal_id;
end; $$;
create or replace function public.refresh_goal_streak_after_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.refresh_goal_streak(coalesce(new.goal_id, old.goal_id)); return coalesce(new, old); end; $$;
drop trigger if exists focus_logs_refresh_goal_streak on public.focus_logs;
create trigger focus_logs_refresh_goal_streak after insert or update or delete on public.focus_logs for each row execute function public.refresh_goal_streak_after_activity();
drop trigger if exists posts_refresh_goal_streak on public.posts;
create trigger posts_refresh_goal_streak after insert or update or delete on public.posts for each row execute function public.refresh_goal_streak_after_activity();
revoke all on function public.refresh_goal_streak(uuid) from public;
