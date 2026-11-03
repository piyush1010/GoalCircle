-- Preparation tracker: section-wise mock scores, a Sunday weekly summary, and a consent-based mentor view.
-- Safe to run more than once.

-- 1. Mock section scores: [{"name": "VARC", "score": 32, "max": 72, "attempted": 18, "correct": 13}] -----
alter table public.prep_mock_tests add column if not exists sections jsonb not null default '[]'::jsonb;
alter table public.prep_mock_tests add column if not exists percentile_note text;
do $$ begin
  alter table public.prep_mock_tests add constraint prep_mock_tests_sections_array check (jsonb_typeof(sections) = 'array' and jsonb_array_length(sections) <= 8);
exception when duplicate_object then null; end $$;

-- 2. Notification kinds ---------------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (
  kind in (
    'boost', 'comment', 'follow', 'nudge', 'circle_invite', 'streak',
    'accountability_invite', 'challenge_invite', 'weekly_recap',
    'goal_collaboration_invite', 'goal_collaboration_accepted',
    'circle_task', 'circle_post', 'circle_leave', 'circle_reply',
    'prep_reminder', 'prep_weekly'
  )
);

-- 3. Weekly summary, Sunday 8 PM India time (14:30 UTC) --------------------------------------------
create or replace function public.prep_week_numbers(target_user uuid, week_end date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'days', count(distinct e.occurred_on),
    'ticks', count(distinct e.node_id) filter (where e.kind = 'studied' and not coalesce((e.details ->> 'undo')::boolean, false) and n.kind = 'subtopic'),
    'revisions', count(*) filter (where e.kind = 'revised'),
    'answers', coalesce(sum(e.quantity) filter (where e.kind = 'answers'), 0),
    'pyqs', coalesce(sum(e.quantity) filter (where e.kind = 'pyq'), 0))
  from public.prep_events e left join public.prep_syllabus_nodes n on n.id = e.node_id
  where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end;
$$;
revoke execute on function public.prep_week_numbers(uuid, date) from public, anon, authenticated;

create or replace function public.notify_prep_weekly()
returns integer language plpgsql security definer set search_path = public as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  p record; w jsonb; prev jsonb; msg text; sent integer := 0;
begin
  for p in
    select pr.user_id from public.prep_profiles pr join public.prep_beta b on b.user_id = pr.user_id
     where pr.reminder_enabled
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

do $$ begin perform cron.unschedule('goalyaar-prep-weekly'); exception when others then null; end $$;
select cron.schedule('goalyaar-prep-weekly', '30 14 * * 0', 'select public.notify_prep_weekly()');

-- 4. Mentor view (consent-based) -------------------------------------------------------------------
-- A student chooses, per batch, to share nothing (default), a summary, or full detail.
-- Only the batch owner or a moderator can call this, and only sharing students' numbers are returned.
create or replace function public.prep_mentor_view(target_circle uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  result jsonb;
begin
  if not exists (select 1 from public.circle_memberships where circle_id = target_circle and user_id = auth.uid() and role in ('owner', 'moderator')) then
    raise exception 'Only the batch mentor can see this' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(row_data order by (row_data ->> 'shared')::boolean desc, row_data ->> 'name'), '[]'::jsonb) into result from (
    select jsonb_build_object(
      'name', coalesce(nullif(pf.full_name, ''), pf.username, 'Student'),
      'shared', coalesce(s.scope in ('summary', 'full'), false),
      'scope', coalesce(s.scope, 'nothing')
    ) || case when coalesce(s.scope in ('summary', 'full'), false) then jsonb_build_object(
      'exam', t.name,
      'exam_date', pr.exam_date,
      'target_stage', pr.target_stage,
      'ticked', (select count(*) from public.prep_topic_state st join public.prep_syllabus_nodes n on n.id = st.node_id
                  where st.user_id = m.user_id and n.template_id = pr.template_id and n.kind = 'subtopic' and n.owner_id is null and st.touched_on is not null),
      'subtopics', (select count(*) from public.prep_syllabus_nodes n where n.template_id = pr.template_id and n.kind = 'subtopic' and n.owner_id is null),
      'overdue', (select count(*) from public.prep_topic_state st join public.prep_syllabus_nodes n on n.id = st.node_id
                  where st.user_id = m.user_id and n.template_id = pr.template_id and n.kind = 'topic' and st.next_revision_on < today_ist),
      'week', public.prep_week_numbers(m.user_id, today_ist),
      'last_active', (select max(occurred_on) from public.prep_events e where e.user_id = m.user_id)
    ) else '{}'::jsonb end
      || case when s.scope = 'full' then jsonb_build_object(
      'mocks', (select coalesce(jsonb_agg(jsonb_build_object('name', mt.name, 'taken_on', mt.taken_on, 'score', mt.score, 'max', mt.max_score) order by mt.taken_on desc), '[]'::jsonb)
                from (select * from public.prep_mock_tests where user_id = m.user_id order by taken_on desc limit 3) mt),
      'open_mistakes', (select count(*) from public.prep_mistakes where user_id = m.user_id and resolved_on is null)
    ) else '{}'::jsonb end as row_data
    from public.circle_memberships m
    left join public.profiles pf on pf.id = m.user_id
    left join public.prep_mentor_shares s on s.student_id = m.user_id and s.circle_id = m.circle_id
    left join public.prep_profiles pr on pr.user_id = m.user_id
    left join public.prep_exam_templates t on t.id = pr.template_id
    where m.circle_id = target_circle and m.role = 'member'
  ) rows;
  return result;
end;
$$;
revoke execute on function public.prep_mentor_view(uuid) from public, anon;
grant execute on function public.prep_mentor_view(uuid) to authenticated;
