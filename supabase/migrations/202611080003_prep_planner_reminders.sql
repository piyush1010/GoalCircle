-- Preparation tracker: exam choice, time-bound plan and a daily study reminder.
-- Safe to run more than once.

-- 1. Plan settings on the profile ----------------------------------------------------------------
alter table public.prep_profiles add column if not exists target_stage text not null default 'prelims';
alter table public.prep_profiles add column if not exists plan_start_on date;
alter table public.prep_profiles add column if not exists revision_buffer_pct smallint not null default 15;
alter table public.prep_profiles add column if not exists reminder_enabled boolean not null default true;
alter table public.prep_profiles add column if not exists reminder_hour smallint not null default 7;   -- India time, 0-23
-- What the app last worked out as today's target, so the reminder can quote it without re-running the planner.
alter table public.prep_profiles add column if not exists daily_target smallint;
alter table public.prep_profiles add column if not exists target_computed_on date;
alter table public.prep_profiles add column if not exists last_reminded_on date;

do $$ begin
  alter table public.prep_profiles add constraint prep_profiles_target_stage_check check (target_stage in ('prelims', 'mains'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.prep_profiles add constraint prep_profiles_buffer_check check (revision_buffer_pct between 0 and 40);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.prep_profiles add constraint prep_profiles_reminder_hour_check check (reminder_hour between 0 and 23);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.prep_profiles add constraint prep_profiles_daily_target_check check (daily_target between 0 and 500);
exception when duplicate_object then null; end $$;

-- 2. A notification kind for the study reminder ----------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task', 'circle_post', 'circle_leave', 'circle_reply',
    'prep_reminder'
  )
);

-- 3. Daily reminder ---------------------------------------------------------------------------------
-- Runs at the top of every India-time hour (:30 UTC). Each beta user with reminders on gets at most one a day, at their chosen hour
-- (India time), and only if they have not logged any study yet that day.
create or replace function public.notify_prep_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  now_ist timestamp := now() at time zone 'Asia/Kolkata';
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  p record;
  due_count integer;
  target integer;
  msg text;
  sent integer := 0;
begin
  for p in
    select pr.* from public.prep_profiles pr
      join public.prep_beta b on b.user_id = pr.user_id
     where pr.reminder_enabled
       and pr.reminder_hour = extract(hour from now_ist)::integer
       and (pr.last_reminded_on is null or pr.last_reminded_on < today_ist)
       and not exists (select 1 from public.prep_events e where e.user_id = pr.user_id and e.occurred_on = today_ist)
     for update of pr skip locked
  loop
    select count(*) into due_count
      from public.prep_topic_state s join public.prep_syllabus_nodes n on n.id = s.node_id
     where s.user_id = p.user_id and n.kind = 'topic' and n.template_id = p.template_id and s.next_revision_on <= today_ist;
    -- Yesterday's target still stands if the app has not been opened today.
    target := case when p.target_computed_on >= today_ist - 1 then p.daily_target end;

    msg := case
      when coalesce(target, 0) > 0 and due_count > 0 then format('Today: %s subtopic%s to study and %s revision%s due.', target, case when target = 1 then '' else 's' end, due_count, case when due_count = 1 then '' else 's' end)
      when coalesce(target, 0) > 0 then format('Today: %s subtopic%s to stay on plan.', target, case when target = 1 then '' else 's' end)
      when due_count > 0 then format('%s revision%s due. A quick one keeps your progress from slipping.', due_count, case when due_count = 1 then ' is' else 's are' end)
      else 'A short study session today keeps your preparation moving.'
    end;
    if p.exam_date is not null and p.exam_date >= today_ist then
      msg := msg || format(' %s days to your exam.', p.exam_date - today_ist);
    end if;

    insert into public.notifications (recipient_id, actor_id, kind, message) values (p.user_id, null, 'prep_reminder', left(msg, 200));
    update public.prep_profiles set last_reminded_on = today_ist where user_id = p.user_id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_prep_reminders() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('goalyaar-prep-reminders');
exception when others then null;
end $$;
select cron.schedule('goalyaar-prep-reminders', '30 * * * *', 'select public.notify_prep_reminders()');
