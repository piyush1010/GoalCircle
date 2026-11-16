-- A number to track for any goal: km run, pages read, minutes meditated, kg. Safe to rerun.
--
-- goals.track_unit  what the goal counts, e.g. 'km', 'pages', 'minutes', 'kg', or the person's own word.
--                   Empty means the goal only counts days.
-- posts.amount      how much on that check-in. Optional: a check-in without a number still counts as a day.
--
-- And a short weekly summary of personal goals on Sunday evening, like the one for exams.

alter table public.goals add column if not exists track_unit text;
alter table public.goals drop constraint if exists goals_track_unit_check;
alter table public.goals add constraint goals_track_unit_check
  check (track_unit is null or char_length(btrim(track_unit)) between 1 and 16);

alter table public.posts add column if not exists amount numeric(10, 2);
alter table public.posts drop constraint if exists posts_amount_check;
alter table public.posts add constraint posts_amount_check check (amount is null or (amount >= 0 and amount <= 1000000));

-- "12 km", "1.5 km", "40 pages"
create or replace function public.goal_amount_text(n numeric, unit text)
returns text language sql immutable as $$
  select trim(to_char(n, 'FM999999990.99'), '.') || ' ' || unit;
$$;

-- One person's week in their personal goals, as one line: "Morning run on 5 days (12 km), Reading on 3 days."
create or replace function public.goal_week_message(target_user uuid, week_end date)
returns text language sql stable security definer set search_path = public as $$
  with week as (
    select g.title, g.track_unit, g.created_at,
           count(distinct (p.created_at at time zone 'Asia/Kolkata')::date) as days,
           sum(p.amount) as total,
           (array_agg(p.amount order by p.created_at desc) filter (where p.amount is not null))[1] as latest
      from public.goals g
      join public.posts p on p.goal_id = g.id and p.user_id = target_user
       and coalesce(p.checkin_status, 'done') <> 'missed'
       and (p.created_at at time zone 'Asia/Kolkata')::date between week_end - 6 and week_end
     where g.user_id = target_user and g.status in ('active', 'paused') and coalesce(g.category, '') <> 'exam_prep'
     group by g.id, g.title, g.track_unit, g.created_at
  )
  select case when count(*) = 0 then null else left(
    'This week: ' || string_agg(
      title || ' on ' || days || case when days = 1 then ' day' else ' days' end ||
      case
        when track_unit is null then ''
        when track_unit = 'kg' and latest is not null then ' (' || public.goal_amount_text(latest, 'kg') || ' at the end)'
        when total is not null and total > 0 then ' (' || public.goal_amount_text(total, track_unit) || ')'
        else '' end,
      ', ' order by days desc, created_at) || '.', 240) end
  from week;
$$;
revoke execute on function public.goal_week_message(uuid, date) from public, anon, authenticated;

create or replace function public.notify_goal_weekly()
returns integer language plpgsql security definer set search_path = public as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  person record; line text; sent integer := 0;
begin
  for person in
    select distinct p.user_id from public.posts p join public.goals g on g.id = p.goal_id
     where p.user_id = g.user_id and coalesce(g.category, '') <> 'exam_prep'
       and p.created_at > now() - interval '7 days'
  loop
    if exists (select 1 from public.notifications where recipient_id = person.user_id and kind = 'weekly_recap' and created_at > now() - interval '5 days') then continue; end if;
    line := public.goal_week_message(person.user_id, today_ist);
    if line is null then continue; end if;
    insert into public.notifications (recipient_id, actor_id, kind, message) values (person.user_id, null, 'weekly_recap', line);
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_goal_weekly() from public, anon, authenticated;

-- Sundays at 7:30 PM India time, half an hour before the exam summary.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('goalyaar-goal-weekly') where exists (select 1 from cron.job where jobname = 'goalyaar-goal-weekly');
    perform cron.schedule('goalyaar-goal-weekly', '0 14 * * 0', 'select public.notify_goal_weekly()');
  end if;
end $$;
