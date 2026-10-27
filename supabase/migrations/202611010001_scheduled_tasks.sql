-- Mentors can plan tasks for upcoming days. Students are notified on the day itself (6:00 AM
-- India time), not when the mentor writes it. Tasks for today still notify straight away.

alter table public.circle_tasks add column if not exists notified_at timestamptz;
-- Everything already posted has been announced.
update public.circle_tasks set notified_at = coalesce(notified_at, created_at, now())
 where task_date <= (now() at time zone 'Asia/Kolkata')::date;

create or replace function public.notify_circle_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.task_date > (now() at time zone 'Asia/Kolkata')::date then
    return new; -- planned ahead: announced on the day by notify_due_circle_tasks()
  end if;
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  select m.user_id, new.creator_id, 'circle_task', new.circle_id, left('Today''s task: ' || new.title, 200)
  from public.circle_memberships m
  where m.circle_id = new.circle_id and m.user_id <> new.creator_id;
  update public.circle_tasks set notified_at = now() where id = new.id;
  return new;
end;
$$;
revoke execute on function public.notify_circle_task() from public, anon, authenticated;

-- Announce today's planned tasks. Runs every morning; safe to run more than once.
create or replace function public.notify_due_circle_tasks()
returns integer language plpgsql security definer set search_path = public as $$
declare
  due record;
  announced integer := 0;
begin
  for due in
    select * from public.circle_tasks
     where task_date = (now() at time zone 'Asia/Kolkata')::date and notified_at is null
     for update skip locked
  loop
    insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
    select m.user_id, due.creator_id, 'circle_task', due.circle_id, left('Today''s task: ' || due.title, 200)
    from public.circle_memberships m
    where m.circle_id = due.circle_id and m.user_id <> due.creator_id;
    update public.circle_tasks set notified_at = now() where id = due.id;
    announced := announced + 1;
  end loop;
  return announced;
end;
$$;
revoke execute on function public.notify_due_circle_tasks() from public, anon, authenticated;

-- Every day at 00:30 UTC = 6:00 AM India time.
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule('goalcircle-due-tasks');
exception when others then null;
end $$;
select cron.schedule('goalcircle-due-tasks', '30 0 * * *', 'select public.notify_due_circle_tasks()');
