-- Preparation tracker: a pilot view for the admin page, and a more accurate Sunday summary.
-- Safe to run more than once.

-- 1. Weekly numbers -------------------------------------------------------------------------------
-- ticks: subtopics (or topics without subtopics) studied this week and still ticked; a subtopic shared
--        by two exams counts once (the copy ticked in the other exam is marked twin).
-- revisions: revisions logged, less any undone the same day.
-- minutes: focus-timer and logged minutes. overdue: topics whose revision date has passed.
create or replace function public.prep_week_numbers(target_user uuid, week_end date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'days', (select count(distinct e.occurred_on) from public.prep_events e
              where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end),
    'ticks', (select count(distinct e.node_id) from public.prep_events e
               join public.prep_syllabus_nodes n on n.id = e.node_id
               join public.prep_topic_state s on s.user_id = e.user_id and s.node_id = e.node_id and s.touched_on is not null
              where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end and e.kind = 'studied'
                and not coalesce((e.details ->> 'undo')::boolean, false) and not coalesce((e.details ->> 'twin')::boolean, false)
                and (n.kind = 'subtopic' or (n.kind = 'topic' and not exists (
                  select 1 from public.prep_syllabus_nodes c where c.parent_id = n.id and c.kind = 'subtopic' and c.owner_id is null)))),
    'revisions', (select greatest(0, count(*) filter (where not coalesce((e.details ->> 'undo')::boolean, false))
                                   - count(*) filter (where coalesce((e.details ->> 'undo')::boolean, false)))
                   from public.prep_events e
                  where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end and e.kind = 'revised'),
    'minutes', (select coalesce(sum(e.minutes), 0) from public.prep_events e
                 where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end),
    'overdue', (select count(*) from public.prep_topic_state s join public.prep_syllabus_nodes n on n.id = s.node_id
                 where s.user_id = target_user and n.kind = 'topic' and s.touched_on is not null and s.next_revision_on < week_end
                   and exists (select 1 from public.prep_plans p where p.user_id = target_user and p.active and p.template_id = n.template_id)),
    'answers', (select coalesce(sum(e.quantity), 0) from public.prep_events e
                 where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end and e.kind = 'answers'),
    'pyqs', (select coalesce(sum(e.quantity), 0) from public.prep_events e
              where e.user_id = target_user and e.occurred_on between week_end - 6 and week_end and e.kind = 'pyq'));
$$;
revoke execute on function public.prep_week_numbers(uuid, date) from public, anon, authenticated;

create or replace function public.prep_week_message(w jsonb, prev jsonb)
returns text language sql immutable set search_path = public as $$
  select left(
    format('This week: %s study day%s, %s subtopic%s, %s revision%s', w ->> 'days', case when (w ->> 'days')::int = 1 then '' else 's' end,
      w ->> 'ticks', case when (w ->> 'ticks')::int = 1 then '' else 's' end, w ->> 'revisions', case when (w ->> 'revisions')::int = 1 then '' else 's' end)
    || case when (w ->> 'minutes')::int >= 60 then format(', %s h focused', round((w ->> 'minutes')::numeric / 60, 1))
            when (w ->> 'minutes')::int > 0 then format(', %s min focused', w ->> 'minutes') else '' end
    || '.'
    || case when (w ->> 'days')::int > (prev ->> 'days')::int then format(' Up from %s days last week.', prev ->> 'days')
            when (w ->> 'days')::int < (prev ->> 'days')::int then format(' Last week was %s days; a fresh week starts tomorrow.', prev ->> 'days')
            else ' Same rhythm as last week.' end
    || case when (w ->> 'overdue')::int > 0 then format(' %s revision%s waiting.', w ->> 'overdue', case when (w ->> 'overdue')::int = 1 then '' else 's' end) else '' end,
    200);
$$;

create or replace function public.notify_prep_weekly()
returns integer language plpgsql security definer set search_path = public as $$
declare
  today_ist date := (now() at time zone 'Asia/Kolkata')::date;
  p record; sent integer := 0;
begin
  for p in
    select pr.user_id from public.prep_profiles pr
     where pr.reminder_enabled and pr.active
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

-- 2. Pilot view for /admin ------------------------------------------------------------------------
-- One row per person preparing: counts only, never notes, mistakes, answers or posts.
-- daily = things done on each of the last 14 days (oldest first): subtopics ticked + revisions.
create or replace function public.admin_prep_pilot()
returns table (user_id uuid, name text, exams text[], setup_done boolean, joined date, last_active timestamptz,
               days_active integer, ticks integer, revisions integer, minutes integer, overdue integer, daily integer[])
language plpgsql stable security definer set search_path = public as $$
declare today_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    with people as (
      select pl.user_id as uid, array_agg(t.name order by pl.created_at) as exams, bool_and(pl.exam_date is not null) as setup_done, min(pl.created_at)::date as joined
        from public.prep_plans pl join public.prep_exam_templates t on t.id = pl.template_id
       where pl.active group by pl.user_id
    ), done as (
      -- an undo on the same day cancels one
      select e.user_id as uid, e.occurred_on as day,
             greatest(0, sum(case when coalesce((e.details ->> 'undo')::boolean, false) then -1 else 1 end))::int as n
        from public.prep_events e left join public.prep_syllabus_nodes n on n.id = e.node_id
       where e.occurred_on >= today_ist - 13 and not coalesce((e.details ->> 'twin')::boolean, false)
         and ((e.kind = 'studied' and n.kind = 'subtopic') or e.kind = 'revised')
       group by 1, 2
    )
    select p.uid, coalesce(nullif(trim(pr.full_name), ''), pr.username, 'Unnamed'), p.exams, p.setup_done, p.joined,
           (select max(e.created_at) from public.prep_events e where e.user_id = p.uid),
           (select count(distinct e.occurred_on)::int from public.prep_events e where e.user_id = p.uid and e.occurred_on >= today_ist - 13),
           (w ->> 'ticks')::int, (w ->> 'revisions')::int, (w ->> 'minutes')::int, (w ->> 'overdue')::int,
           array(select coalesce((select d.n from done d where d.uid = p.uid and d.day = g::date), 0) from generate_series(today_ist - 13, today_ist, '1 day') g)
      from people p
      left join public.profiles pr on pr.id = p.uid
      cross join lateral (select public.prep_week_numbers(p.uid, today_ist) as w) x
     order by 6 desc nulls last;
end;
$$;
revoke execute on function public.admin_prep_pilot() from public, anon;
grant execute on function public.admin_prep_pilot() to authenticated;
