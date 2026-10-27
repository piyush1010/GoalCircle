-- Goal types: every day (default), a few times a week, or just once.
-- Weekly goals count their streak in weeks where the target was met; one-time goals have no
-- streak and are marked complete by a check-in marked "done".

alter table public.goals add column if not exists frequency text not null default 'daily';
alter table public.goals add column if not exists times_per_week smallint;
alter table public.goals drop constraint if exists goals_frequency_check;
alter table public.goals add constraint goals_frequency_check check (
  frequency in ('daily', 'weekly', 'once')
  and (frequency <> 'weekly' or times_per_week between 1 and 7)
);

create or replace function public.refresh_goal_streak(target_goal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  goal_frequency text;
  goal_target integer;
  latest_activity date;
  calculated_streak integer := 0;
  week_start date;
  week_count integer;
begin
  select frequency, coalesce(times_per_week, 1) into goal_frequency, goal_target from public.goals where id = target_goal_id;
  if not found then return; end if;

  if goal_frequency = 'once' then
    -- Done as soon as one check-in says so. No streak for one-time goals.
    update public.goals
       set is_completed = is_completed or exists (select 1 from public.posts where goal_id = target_goal_id and checkin_status = 'done'),
           current_streak = 0, updated_at = now()
     where id = target_goal_id;
    return;
  end if;

  if goal_frequency = 'weekly' then
    -- Weeks start on Monday. The current week counts once its target is met; until then it
    -- doesn't break the streak.
    week_start := date_trunc('week', current_date)::date;
    select count(distinct d) into week_count from (
      select (logged_at at time zone 'UTC')::date d from public.focus_logs where goal_id = target_goal_id and logged_at >= week_start
      union select (created_at at time zone 'UTC')::date from public.posts where goal_id = target_goal_id and created_at >= week_start
    ) days;
    if week_count >= goal_target then calculated_streak := 1; end if;
    loop
      week_start := week_start - 7;
      select count(distinct d) into week_count from (
        select (logged_at at time zone 'UTC')::date d from public.focus_logs where goal_id = target_goal_id and logged_at >= week_start and logged_at < week_start + 7
        union select (created_at at time zone 'UTC')::date from public.posts where goal_id = target_goal_id and created_at >= week_start and created_at < week_start + 7
      ) days;
      exit when week_count < goal_target or calculated_streak > 520;
      calculated_streak := calculated_streak + 1;
    end loop;
    update public.goals set current_streak = calculated_streak, streak_count = greatest(streak_count, calculated_streak), updated_at = now() where id = target_goal_id;
    return;
  end if;

  -- Every day (unchanged)
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
revoke all on function public.refresh_goal_streak(uuid) from public;

-- Changing how often a goal repeats recalculates its streak right away.
create or replace function public.refresh_goal_streak_after_frequency()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.frequency is distinct from old.frequency or new.times_per_week is distinct from old.times_per_week then
    perform public.refresh_goal_streak(new.id);
  end if;
  return new;
end; $$;
drop trigger if exists goals_refresh_streak_on_frequency on public.goals;
create trigger goals_refresh_streak_on_frequency after update of frequency, times_per_week on public.goals
for each row execute function public.refresh_goal_streak_after_frequency();
revoke all on function public.refresh_goal_streak_after_frequency() from public, anon, authenticated;
