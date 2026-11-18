-- Exam requests: when a planner is added, tell everyone who asked for it.
-- Safe to run more than once.

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task', 'circle_post', 'circle_leave', 'circle_reply',
    'prep_reminder', 'prep_weekly',
    'community_answer', 'community_helpful',
    'exam_ready'
  )
);

-- The admin list shows only requests still waiting.
create or replace function public.admin_exam_requests()
returns table (exam_name text, requests bigint, latest timestamptz, details text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select min(r.exam_name), count(*), max(r.created_at), (array_agg(r.details order by r.created_at desc) filter (where r.details is not null))[1:5]
    from public.prep_exam_requests r
    where r.status in ('new', 'planned')
    group by lower(trim(r.exam_name))
    order by count(*) desc, max(r.created_at) desc;
end;
$$;
revoke execute on function public.admin_exam_requests() from public, anon;
grant execute on function public.admin_exam_requests() to authenticated;

-- Admin: mark an exam's requests as added and notify each person who asked (once each). Returns how many were told.
create or replace function public.admin_mark_exam_added(request_name text)
returns integer language plpgsql security definer set search_path = public as $$
declare told integer;
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  with done as (
    update public.prep_exam_requests r set status = 'added'
     where lower(trim(r.exam_name)) = lower(trim(request_name)) and r.status in ('new', 'planned')
    returning r.user_id
  ), people as (select distinct user_id from done)
  insert into public.notifications (recipient_id, actor_id, kind, message)
  select user_id, null, 'exam_ready', left(format('The %s planner you asked for is ready. Add it from Your exams.', trim(request_name)), 200) from people;
  get diagnostics told = row_count;
  return told;
end;
$$;
revoke execute on function public.admin_mark_exam_added(text) from public, anon;
grant execute on function public.admin_mark_exam_added(text) to authenticated;
