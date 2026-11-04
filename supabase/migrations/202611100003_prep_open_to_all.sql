-- Preparation tracker: open to everyone, with an on/off switch per user. Safe to run more than once.
-- Everyone signed in can use the tracker; it only appears for people who choose "Preparing for an exam".
-- The prep_beta table is kept (unused) so nothing that references it breaks.

create or replace function public.has_feature(feature text)
returns boolean language sql stable security definer set search_path = public as $$
  select case feature when 'prep' then auth.uid() is not null else false end;
$$;
revoke execute on function public.has_feature(text) from public, anon;
grant execute on function public.has_feature(text) to authenticated;

-- "Preparing for an exam" can be paused (after the exam, on a break) without losing anything.
alter table public.prep_profiles add column if not exists active boolean not null default true;
-- Self-described level from setup, used to suggest ticking what is already done.
alter table public.prep_profiles add column if not exists level text;
do $$ begin
  alter table public.prep_profiles add constraint prep_profiles_level_check check (level is null or level in ('beginner', 'intermediate', 'advanced'));
exception when duplicate_object then null; end $$;

-- Reminders and the weekly summary go to everyone with an active plan (no longer only beta testers).
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
     where pr.reminder_enabled and pr.active
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

create or replace function public.notify_prep_weekly()
returns integer language plpgsql security definer set search_path = public as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  p record; w jsonb; prev jsonb; msg text; sent integer := 0;
begin
  for p in
    select pr.user_id from public.prep_profiles pr
     where pr.reminder_enabled and pr.active
       and exists (select 1 from public.prep_events e where e.user_id = pr.user_id and e.occurred_on >= today_ist - 13)
  loop
    if exists (select 1 from public.notifications where recipient_id = p.user_id and kind = 'prep_weekly' and created_at > now() - interval '5 days') then continue; end if;
    w := public.prep_week_numbers(p.user_id, today_ist);
    prev := public.prep_week_numbers(p.user_id, today_ist - 7);
    msg := format('This week: %s study day%s, %s subtopic%s, %s revision%s.', w ->> 'days', case when (w ->> 'days')::int = 1 then '' else 's' end,
      w ->> 'ticks', case when (w ->> 'ticks')::int = 1 then '' else 's' end, w ->> 'revisions', case when (w ->> 'revisions')::int = 1 then '' else 's' end);
    msg := msg || case
      when (w ->> 'days')::int > (prev ->> 'days')::int then format(' Up from %s days last week.', prev ->> 'days')
      when (w ->> 'days')::int < (prev ->> 'days')::int then format(' Last week was %s days; a fresh week starts tomorrow.', prev ->> 'days')
      else ' Same rhythm as last week.' end;
    insert into public.notifications (recipient_id, actor_id, kind, message) values (p.user_id, null, 'prep_weekly', left(msg, 200));
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.notify_prep_weekly() from public, anon, authenticated;
