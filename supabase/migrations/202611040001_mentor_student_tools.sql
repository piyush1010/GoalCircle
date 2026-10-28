-- Mentor replies and "Seen", batch progress for students, sharing with the batch,
-- the weekly report, and one daily reminder that works even when the app is closed.
-- Safe to run more than once.

-- 1. Check-ins: shared with the batch (photo and status only), mentor reply and seen.
alter table public.circle_task_checkins add column if not exists shared boolean not null default false;
alter table public.circle_task_checkins add column if not exists mentor_reply text;
alter table public.circle_task_checkins add column if not exists mentor_reply_at timestamptz;
alter table public.circle_task_checkins add column if not exists seen_at timestamptz;
alter table public.circle_task_checkins drop constraint if exists circle_task_checkins_mentor_reply_check;
alter table public.circle_task_checkins add constraint circle_task_checkins_mentor_reply_check
  check (mentor_reply is null or char_length(mentor_reply) <= 500);

-- Students can't write the mentor's fields on their own row.
create or replace function public.protect_mentor_checkin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_circle_admin(new.circle_id) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mentor_reply := null; new.mentor_reply_at := null; new.seen_at := null;
  else
    new.mentor_reply := old.mentor_reply; new.mentor_reply_at := old.mentor_reply_at; new.seen_at := old.seen_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_mentor_checkin_fields() from public, anon, authenticated;
drop trigger if exists circle_checkins_protect_mentor_fields on public.circle_task_checkins;
create trigger circle_checkins_protect_mentor_fields before insert or update on public.circle_task_checkins
for each row execute function public.protect_mentor_checkin_fields();

-- 2. Notifications: a mentor's reply.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task', 'circle_post', 'circle_leave', 'circle_reply'
  )
);

create or replace function public.reply_to_checkin(target_task uuid, target_user uuid, reply text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  task_circle uuid;
  clean text := nullif(trim(coalesce(reply, '')), '');
begin
  select circle_id into task_circle from public.circle_tasks where id = target_task;
  if task_circle is null or not public.is_circle_admin(task_circle) then
    raise exception 'Only the mentor can reply.';
  end if;
  if clean is null or char_length(clean) > 500 then
    raise exception 'A reply needs 1 to 500 characters.';
  end if;
  update public.circle_task_checkins
     set mentor_reply = clean, mentor_reply_at = now(), seen_at = coalesce(seen_at, now())
   where task_id = target_task and user_id = target_user;
  if not found then return false; end if;
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  values (target_user, auth.uid(), 'circle_reply', task_circle, left('Your mentor replied: ' || clean, 200));
  return true;
end;
$$;
revoke execute on function public.reply_to_checkin(uuid, uuid, text) from public, anon;
grant execute on function public.reply_to_checkin(uuid, uuid, text) to authenticated;

-- The mentor opened the student list: mark today's check-ins as seen.
create or replace function public.mark_checkins_seen(target_circle uuid, on_date date)
returns integer language plpgsql security definer set search_path = public as $$
declare marked integer;
begin
  if not public.is_circle_admin(target_circle) then return 0; end if;
  update public.circle_task_checkins c set seen_at = now()
    from public.circle_tasks t
   where t.id = c.task_id and c.circle_id = target_circle and t.task_date = on_date and c.seen_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;
revoke execute on function public.mark_checkins_seen(uuid, date) from public, anon;
grant execute on function public.mark_checkins_seen(uuid, date) to authenticated;

-- 3. Mentor dashboard: adds today's reply and seen time.
drop function if exists public.circle_dashboard(uuid, date);
create function public.circle_dashboard(target_circle uuid, on_date date)
returns table (
  user_id uuid, full_name text, username text, avatar_url text, joined_at timestamptz,
  today_status text, today_hours numeric, today_note text, today_media_url text, today_media_type text,
  last_checkin_at timestamptz, days_done_7 integer, tasks_set_7 integer, today_minutes integer,
  today_reply text, today_seen_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, p.username, p.avatar_url, m.created_at,
         tc.status, tc.hours, tc.note, tc.media_url, tc.media_type,
         (select max(c.updated_at) from public.circle_task_checkins c
           where c.circle_id = target_circle and c.user_id = m.user_id),
         (select count(*)::int from public.circle_task_checkins c
            join public.circle_tasks t2 on t2.id = c.task_id
           where c.circle_id = target_circle and c.user_id = m.user_id
             and c.status in ('done', 'partial')
             and t2.task_date > on_date - 7 and t2.task_date <= on_date),
         (select count(*)::int from public.circle_tasks t3
           where t3.circle_id = target_circle and t3.task_date > on_date - 7 and t3.task_date <= on_date),
         coalesce(tc.minutes, round(tc.hours * 60)::integer),
         tc.mentor_reply, tc.seen_at
  from public.circle_memberships m
  left join public.profiles p on p.id = m.user_id
  left join public.circle_tasks t on t.circle_id = target_circle and t.task_date = on_date
  left join public.circle_task_checkins tc on tc.task_id = t.id and tc.user_id = m.user_id
  where m.circle_id = target_circle
    and m.role = 'member'
    and public.is_circle_admin(target_circle);
$$;
revoke execute on function public.circle_dashboard(uuid, date) from public, anon;
grant execute on function public.circle_dashboard(uuid, date) to authenticated;

-- 4. Batch progress any member can see: how many checked in, and who.
--    Only Done or Partly done; never "Missed", never notes. Photos only when shared.
create or replace function public.circle_today_progress(target_circle uuid, on_date date)
returns table (checked_in integer, members integer, people jsonb)
language sql stable security definer set search_path = public as $$
  with task as (
    select id from public.circle_tasks where circle_id = target_circle and task_date = on_date limit 1
  ), done as (
    select c.user_id, c.status, c.updated_at, case when c.shared then c.media_url end as media_url,
           case when c.shared then c.media_type end as media_type
      from public.circle_task_checkins c join task on task.id = c.task_id
     where c.status in ('done', 'partial')
  )
  select (select count(*)::int from done),
         (select count(*)::int from public.circle_memberships where circle_id = target_circle and role = 'member'),
         coalesce((select jsonb_agg(jsonb_build_object(
             'name', coalesce(nullif(p.full_name, ''), p.username, 'Student'),
             'avatar_url', p.avatar_url, 'status', d.status,
             'media_url', d.media_url, 'media_type', d.media_type, 'me', d.user_id = auth.uid())
             order by d.updated_at desc)
           from (select * from done order by updated_at desc limit 40) d
           left join public.profiles p on p.id = d.user_id), '[]'::jsonb)
  where public.is_circle_member(target_circle) or public.is_circle_admin(target_circle);
$$;
revoke execute on function public.circle_today_progress(uuid, date) from public, anon;
grant execute on function public.circle_today_progress(uuid, date) to authenticated;

-- 5. Weekly report for the mentor: last 7 days per student.
create or replace function public.circle_weekly_report(target_circle uuid, end_date date)
returns table (
  user_id uuid, full_name text, username text,
  done_days integer, partial_days integer, missed_days integer, minutes integer,
  tasks_set integer, last_checkin_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with tasks as (
    select id from public.circle_tasks
     where circle_id = target_circle and task_date > end_date - 7 and task_date <= end_date
  )
  select m.user_id, p.full_name, p.username,
         count(*) filter (where c.status = 'done')::int,
         count(*) filter (where c.status = 'partial')::int,
         count(*) filter (where c.status = 'missed')::int,
         coalesce(sum(coalesce(c.minutes, round(c.hours * 60)::integer)), 0)::int,
         (select count(*)::int from tasks),
         max(c.updated_at)
    from public.circle_memberships m
    left join public.profiles p on p.id = m.user_id
    left join public.circle_task_checkins c on c.user_id = m.user_id and c.task_id in (select id from tasks)
   where m.circle_id = target_circle and m.role = 'member' and public.is_circle_admin(target_circle)
   group by m.user_id, p.full_name, p.username;
$$;
revoke execute on function public.circle_weekly_report(uuid, date) from public, anon;
grant execute on function public.circle_weekly_report(uuid, date) to authenticated;

-- 6. One daily reminder, sent as a phone notification if you haven't shown up yet today.
alter table public.user_preferences add column if not exists daily_reminder_enabled boolean not null default false;
alter table public.user_preferences add column if not exists daily_reminder_time time not null default '20:00';
alter table public.user_preferences add column if not exists time_zone text not null default 'Asia/Kolkata';
alter table public.user_preferences add column if not exists last_reminded_on date;
grant select, insert, update on public.user_preferences to authenticated;

create or replace function public.notify_daily_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare sent integer := 0; pref record; local_now timestamp; local_day date;
begin
  for pref in
    select * from public.user_preferences where daily_reminder_enabled for update skip locked
  loop
    begin
      local_now := now() at time zone pref.time_zone;
    exception when others then
      local_now := now() at time zone 'Asia/Kolkata';
    end;
    local_day := local_now::date;
    -- Runs every hour: send in the hour the person picked, once a day.
    continue when extract(hour from local_now) <> extract(hour from pref.daily_reminder_time);
    continue when pref.last_reminded_on = local_day;
    -- Already showed up today? No reminder.
    continue when exists (select 1 from public.posts where user_id = pref.user_id and (created_at at time zone pref.time_zone)::date = local_day and coalesce(checkin_status, 'done') <> 'missed')
               or exists (select 1 from public.focus_logs where user_id = pref.user_id and (logged_at at time zone pref.time_zone)::date = local_day)
               or exists (select 1 from public.circle_task_checkins c join public.circle_tasks t on t.id = c.task_id where c.user_id = pref.user_id and t.task_date = local_day);
    insert into public.notifications (recipient_id, actor_id, kind, message)
    values (pref.user_id, null, 'streak', 'Time to check in for today. Even 10 minutes counts.');
    update public.user_preferences set last_reminded_on = local_day where user_id = pref.user_id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_daily_reminders() from public, anon, authenticated;

create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule('goalyaar-daily-reminders');
exception when others then null;
end $$;
select cron.schedule('goalyaar-daily-reminders', '0 * * * *', 'select public.notify_daily_reminders()');
