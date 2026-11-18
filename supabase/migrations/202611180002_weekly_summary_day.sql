-- Each person chooses the day their weekly summary arrives. 0 = Sunday (the default) … 6 = Saturday.
-- The summary always covers the seven days ending that day, so any day works.
alter table public.user_preferences add column if not exists weekly_summary_day smallint not null default 0;
alter table public.user_preferences drop constraint if exists user_preferences_weekly_summary_day_check;
alter table public.user_preferences add constraint user_preferences_weekly_summary_day_check check (weekly_summary_day between 0 and 6);

-- Is today (India time) this person's summary day?
create or replace function public.is_weekly_summary_day(target_user uuid, today_ist date)
returns boolean language sql stable security definer set search_path = public as $$
  select extract(dow from today_ist)::int = coalesce((select p.weekly_summary_day from public.user_preferences p where p.user_id = target_user), 0);
$$;
revoke execute on function public.is_weekly_summary_day(uuid, date) from public, anon, authenticated;

-- Exam summary: as before, but only on each person's chosen day.
create or replace function public.notify_prep_weekly()
returns integer language plpgsql security definer set search_path = public as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  p record; sent integer := 0;
begin
  for p in
    select pr.user_id from public.prep_profiles pr
     where pr.reminder_enabled and pr.active
       and public.is_weekly_summary_day(pr.user_id, today_ist)
       and exists (select 1 from public.prep_events e where e.user_id = pr.user_id and e.occurred_on >= today_ist - 13)
  loop
    if exists (select 1 from public.notifications where recipient_id = p.user_id and kind = 'prep_weekly' and created_at > now() - interval '5 days') then continue; end if;
    insert into public.notifications (recipient_id, actor_id, kind, message)
    values (p.user_id, null, 'prep_weekly', public.prep_week_message(public.prep_week_numbers(p.user_id, today_ist), public.prep_week_numbers(p.user_id, today_ist - 7)));
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_prep_weekly() from public, anon, authenticated;

-- Goals summary: the same.
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
       and public.is_weekly_summary_day(p.user_id, today_ist)
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

-- Both now run every evening (7:30 PM and 8 PM India time) and send only to people whose day it is.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('goalyaar-goal-weekly') where exists (select 1 from cron.job where jobname = 'goalyaar-goal-weekly');
    perform cron.schedule('goalyaar-goal-weekly', '0 14 * * *', 'select public.notify_goal_weekly()');
    perform cron.unschedule('goalyaar-prep-weekly') where exists (select 1 from cron.job where jobname = 'goalyaar-prep-weekly');
    perform cron.schedule('goalyaar-prep-weekly', '30 14 * * *', 'select public.notify_prep_weekly()');
  end if;
end $$;
