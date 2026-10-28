-- Pilot fixes from the student and mentor reviews (Oct 2026).
-- Safe to run more than once.

-- 1. Batch check-ins can record an honest "Missed", and time is kept in minutes
--    (the same unit as personal goals). Hours stay for older rows.
alter table public.circle_task_checkins drop constraint if exists circle_task_checkins_status_check;
alter table public.circle_task_checkins add constraint circle_task_checkins_status_check
  check (status in ('done', 'partial', 'missed'));
alter table public.circle_task_checkins add column if not exists minutes integer;
alter table public.circle_task_checkins drop constraint if exists circle_task_checkins_minutes_check;
alter table public.circle_task_checkins add constraint circle_task_checkins_minutes_check
  check (minutes is null or (minutes >= 0 and minutes <= 1440));
update public.circle_task_checkins
   set minutes = round(hours * 60)::integer
 where minutes is null and hours is not null;

-- 2. Mentor dashboard: today's minutes, and "this week" counts only Done or Partial.
drop function if exists public.circle_dashboard(uuid, date);
create function public.circle_dashboard(target_circle uuid, on_date date)
returns table (
  user_id uuid, full_name text, username text, avatar_url text, joined_at timestamptz,
  today_status text, today_hours numeric, today_note text, today_media_url text, today_media_type text,
  last_checkin_at timestamptz, days_done_7 integer, tasks_set_7 integer, today_minutes integer
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
         coalesce(tc.minutes, round(tc.hours * 60)::integer)
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

-- 3. A check-in is never more public than its goal.
create or replace function public.posts_follow_goal_privacy()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.goal_id is not null
     and exists (select 1 from public.goals g where g.id = new.goal_id and g.visibility = 'private') then
    new.visibility := 'private';
  end if;
  return new;
end;
$$;
revoke execute on function public.posts_follow_goal_privacy() from public, anon, authenticated;
drop trigger if exists posts_follow_goal_privacy on public.posts;
create trigger posts_follow_goal_privacy before insert or update of visibility, goal_id on public.posts
for each row execute function public.posts_follow_goal_privacy();

-- Making a goal private also hides its earlier check-ins.
create or replace function public.goal_privacy_to_posts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visibility = 'private' and old.visibility is distinct from 'private' then
    update public.posts set visibility = 'private' where goal_id = new.id and visibility <> 'private';
  end if;
  return new;
end;
$$;
revoke execute on function public.goal_privacy_to_posts() from public, anon, authenticated;
drop trigger if exists goals_privacy_to_posts on public.goals;
create trigger goals_privacy_to_posts after update of visibility on public.goals
for each row execute function public.goal_privacy_to_posts();

-- Fix check-ins that were already shared from private goals.
update public.posts p set visibility = 'private'
  from public.goals g
 where g.id = p.goal_id and g.visibility = 'private' and p.visibility <> 'private';

-- 4. Tell the mentor when a student leaves their circle.
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task', 'circle_post', 'circle_leave'
  )
);

create or replace function public.notify_circle_leave()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  circle_owner uuid;
  circle_name text;
  student_name text;
begin
  -- Only when students leave on their own (not when a mentor removes them).
  if auth.uid() is null or auth.uid() <> old.user_id or old.role <> 'member' then
    return old;
  end if;
  select owner_id, name into circle_owner, circle_name from public.circles where id = old.circle_id;
  if circle_owner is null or circle_owner = old.user_id then
    return old;
  end if;
  select coalesce(nullif(full_name, ''), username, 'A student') into student_name from public.profiles where id = old.user_id;
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  values (circle_owner, old.user_id, 'circle_leave', old.circle_id,
          left(coalesce(student_name, 'A student') || ' left ' || coalesce(circle_name, 'your circle') || '.', 200));
  return old;
end;
$$;
revoke execute on function public.notify_circle_leave() from public, anon, authenticated;
drop trigger if exists circle_leave_notification on public.circle_memberships;
create trigger circle_leave_notification after delete on public.circle_memberships
for each row execute function public.notify_circle_leave();
