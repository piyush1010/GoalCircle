-- Owner insights, crash reports and the first reminder experiment. Safe to rerun.
--
-- 1. app_admins: who can open /admin. Seeded with the owner's account.
-- 2. client_errors: errors people hit in the app, written through log_client_error() (rate-limited).
-- 3. reminder_sends: which reminder message each person got (A or B), to compare check-ins afterwards.
-- 4. admin_insights(): one JSON blob with the numbers the /admin page shows. Admins only.

-- 1. Admins ---------------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
-- No policies: nobody reads or writes it from the app.

insert into public.app_admins (user_id)
select id from auth.users where lower(email) = 'piyush.kaushik2@gmail.com'
on conflict do nothing;

create or replace function public.is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;
revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- 2. Crash reports -------------------------------------------------------------------------
create table if not exists public.client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  stack text,
  path text,
  user_agent text,
  digest text,
  created_at timestamptz not null default now()
);
create index if not exists client_errors_created_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
-- No policies: written only through log_client_error(), read only through admin_insights().

create or replace function public.log_client_error(message text, stack text default null, path text default null, user_agent text default null, digest text default null)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if coalesce(trim(message), '') = '' then return; end if;
  -- Rate limits: 20 an hour per person, 300 an hour from signed-out visitors in total.
  if me is not null and (select count(*) from public.client_errors where user_id = me and created_at > now() - interval '1 hour') >= 20 then return; end if;
  if me is null and (select count(*) from public.client_errors where user_id is null and created_at > now() - interval '1 hour') >= 300 then return; end if;
  insert into public.client_errors (user_id, message, stack, path, user_agent, digest)
  values (me, left(message, 500), left(stack, 4000), left(path, 300), left(user_agent, 300), left(digest, 100));
end;
$$;
revoke execute on function public.log_client_error(text, text, text, text, text) from public;
grant execute on function public.log_client_error(text, text, text, text, text) to anon, authenticated;

-- Keep the table small: drop reports older than 60 days, daily.
create or replace function public.prune_client_errors()
returns void language sql security definer set search_path = public as $$
  delete from public.client_errors where created_at < now() - interval '60 days';
$$;
revoke execute on function public.prune_client_errors() from public, anon, authenticated;
do $$ begin perform cron.unschedule('goalyaar-prune-errors'); exception when others then null; end $$;
select cron.schedule('goalyaar-prune-errors', '17 3 * * *', 'select public.prune_client_errors()');

-- 3. Reminder experiment -------------------------------------------------------------------
-- A = the current message. B = a personal, streak-based message. Each person always gets the same
-- variant (split by user id), so results compare people, not days.
create table if not exists public.reminder_sends (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  variant text not null check (variant in ('A', 'B')),
  local_day date not null,
  sent_at timestamptz not null default now(),
  unique (user_id, local_day)
);
alter table public.reminder_sends enable row level security;

create or replace function public.reminder_variant(target uuid)
returns text language sql immutable as $$
  select case when abs(hashtext(target::text)) % 2 = 0 then 'A' else 'B' end;
$$;

create or replace function public.notify_daily_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare sent integer := 0; pref record; local_now timestamp; today_local date; v text; best_streak integer; msg text;
begin
  for pref in
    select * from public.user_preferences where daily_reminder_enabled for update skip locked
  loop
    begin
      local_now := now() at time zone pref.time_zone;
    exception when others then
      local_now := now() at time zone 'Asia/Kolkata';
    end;
    today_local := local_now::date;
    -- Runs every hour: send in the hour the person picked, once a day.
    continue when extract(hour from local_now) <> extract(hour from pref.daily_reminder_time);
    continue when pref.last_reminded_on = today_local;
    -- Already showed up today? No reminder.
    continue when exists (select 1 from public.posts where user_id = pref.user_id and (created_at at time zone pref.time_zone)::date = today_local and coalesce(checkin_status, 'done') <> 'missed')
               or exists (select 1 from public.focus_logs where user_id = pref.user_id and (logged_at at time zone pref.time_zone)::date = today_local)
               or exists (select 1 from public.circle_task_checkins c join public.circle_tasks t on t.id = c.task_id where c.user_id = pref.user_id and t.task_date = today_local);

    v := public.reminder_variant(pref.user_id);
    if v = 'A' then
      msg := 'Time to check in for today. Even 10 minutes counts.';
    else
      select coalesce(max(current_streak), 0) into best_streak from public.goals where user_id = pref.user_id and coalesce(is_completed, false) = false;
      msg := case when best_streak > 0
        then format('Your %s-day streak is waiting. One small step today keeps it going.', best_streak)
        else 'Your goal is waiting. One small step today is enough to start a streak.' end;
    end if;

    insert into public.notifications (recipient_id, actor_id, kind, message) values (pref.user_id, null, 'streak', msg);
    insert into public.reminder_sends (user_id, variant, local_day) values (pref.user_id, v, today_local) on conflict (user_id, local_day) do nothing;
    update public.user_preferences set last_reminded_on = today_local where user_id = pref.user_id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_daily_reminders() from public, anon, authenticated;

-- 4. Insights for /admin -------------------------------------------------------------------
-- "Showed up" = a goal check-in that isn't Missed, a focus session, or a batch check-in that isn't Missed.
create or replace function public.admin_insights()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb; tz text := 'Asia/Kolkata'; today date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;

  with activity as (
    select user_id, (created_at at time zone tz)::date as day from public.posts where coalesce(checkin_status, 'done') <> 'missed'
    union all select user_id, (logged_at at time zone tz)::date from public.focus_logs
    union all select user_id, (created_at at time zone tz)::date from public.circle_task_checkins where status <> 'missed'
  ),
  days as (select generate_series(today - 13, today, interval '1 day')::date as day),
  signups as (select id, (created_at at time zone tz)::date as day from auth.users),
  cohort as (
    -- People who signed up 8 to 60 days ago: did they show up again within 7 days after their first day?
    select s.id, exists (select 1 from activity a where a.user_id = s.id and a.day > s.day and a.day <= s.day + 7) as returned
    from signups s where s.day between today - 60 and today - 8
  ),
  sends as (
    select r.variant, r.user_id, r.sent_at, exists (
      select 1 from activity a where a.user_id = r.user_id and a.day = r.local_day
    ) and (
      exists (select 1 from public.posts p where p.user_id = r.user_id and p.created_at between r.sent_at and r.sent_at + interval '3 hours' and coalesce(p.checkin_status, 'done') <> 'missed')
      or exists (select 1 from public.focus_logs f where f.user_id = r.user_id and f.logged_at between r.sent_at and r.sent_at + interval '3 hours')
      or exists (select 1 from public.circle_task_checkins c where c.user_id = r.user_id and c.created_at between r.sent_at and r.sent_at + interval '3 hours' and c.status <> 'missed')
    ) as converted
    from public.reminder_sends r
  )
  select jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', (select count(*) from auth.users),
      'new_7d', (select count(*) from signups where day > today - 7),
      'active_today', (select count(distinct user_id) from activity where day = today),
      'active_7d', (select count(distinct user_id) from activity where day > today - 7),
      'active_30d', (select count(distinct user_id) from activity where day > today - 30)
    ),
    'daily', (select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'active', (select count(distinct user_id) from activity a where a.day = d.day),
        'checkins', (select count(*) from activity a where a.day = d.day),
        'signups', (select count(*) from signups s where s.day = d.day)) order by d.day) from days d),
    'retention', jsonb_build_object(
      'cohort', (select count(*) from cohort),
      'returned_within_7d', (select count(*) from cohort where returned)
    ),
    'habits', jsonb_build_object(
      'active_goals', (select count(*) from public.goals where coalesce(is_completed, false) = false and coalesce(status, 'active') <> 'paused'),
      'streak_3_plus', (select count(*) from public.goals where current_streak >= 3),
      'streak_7_plus', (select count(*) from public.goals where current_streak >= 7),
      'best_streak', (select coalesce(max(current_streak), 0) from public.goals)
    ),
    'reach', jsonb_build_object(
      'push_users', (select count(distinct user_id) from public.push_subscriptions),
      'daily_reminder_on', (select count(*) from public.user_preferences where daily_reminder_enabled)
    ),
    'mentors', jsonb_build_object(
      'batches', (select count(*) from public.circles c where exists (select 1 from public.circle_tasks t where t.circle_id = c.id)),
      'tasks_7d', (select count(*) from public.circle_tasks where task_date > today - 7),
      'students', (select count(distinct m.user_id) from public.circle_memberships m join public.circles c on c.id = m.circle_id where m.user_id <> c.owner_id and exists (select 1 from public.circle_tasks t where t.circle_id = c.id)),
      'batch_checkins_7d', (select count(*) from public.circle_task_checkins c join public.circle_tasks t on t.id = c.task_id where t.task_date > today - 7)
    ),
    'experiment', (select coalesce(jsonb_agg(jsonb_build_object('variant', v.variant, 'sent', v.sent, 'converted', v.converted, 'people', v.people) order by v.variant), '[]'::jsonb) from (
        select variant, count(*) as sent, count(*) filter (where converted) as converted, count(distinct user_id) as people from sends group by variant) v),
    'errors', jsonb_build_object(
      'count_7d', (select count(*) from public.client_errors where created_at > now() - interval '7 days'),
      'people_7d', (select count(distinct user_id) from public.client_errors where created_at > now() - interval '7 days'),
      'top', (select coalesce(jsonb_agg(e order by e.n desc), '[]'::jsonb) from (
          select left(message, 160) as message, count(*) as n, max(created_at) as last_seen, (array_agg(path order by created_at desc))[1] as path
          from public.client_errors where created_at > now() - interval '7 days' group by left(message, 160) order by count(*) desc limit 8) e)
    )
  ) into result;
  return result;
end;
$$;
revoke execute on function public.admin_insights() from public, anon;
grant execute on function public.admin_insights() to authenticated;
