-- Preparation tracker: a shared "topic of the day" for each exam, and feedback on the admin page.
-- Safe to run more than once.

-- 1. Topic of the day ------------------------------------------------------------------------------
-- Everyone preparing for the same exam gets the same topic each day, in syllabus order, with no one
-- needing to post it. People mark it done; others see only how many did (never who).
create table if not exists public.prep_room_checkins (
  template_id uuid not null references public.prep_exam_templates(id) on delete cascade,
  day date not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (template_id, day, user_id)
);
alter table public.prep_room_checkins enable row level security;
drop policy if exists "Own room check-ins" on public.prep_room_checkins;
create policy "Own room check-ins" on public.prep_room_checkins for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.prep_room_checkins from anon, authenticated;
grant select on public.prep_room_checkins to authenticated;

-- The day's topic for one exam: prelims (first stage) topics in syllabus order, one a day, then round again.
create or replace function public.prep_room_topic(target_template uuid, on_day date)
returns table (node_id uuid, title text, subject text)
language sql stable security definer set search_path = public as $$
  with ordered as (
    select t.id, t.title, s.title as subject, row_number() over (order by p.sort, s.sort, t.sort) - 1 as i, count(*) over () as n
      from public.prep_syllabus_nodes t
      join public.prep_syllabus_nodes s on s.id = t.parent_id and s.kind = 'subject'
      join public.prep_syllabus_nodes p on p.id = s.parent_id and p.kind = 'paper'
      join public.prep_syllabus_nodes st on st.id = p.parent_id and st.kind = 'stage'
     where t.template_id = target_template and t.kind = 'topic' and t.owner_id is null
       and st.code = 'PRE' and p.code not like '%.OPT'
  )
  select id, title, subject from ordered where i = mod(on_day - date '2026-01-01', n);
$$;
revoke execute on function public.prep_room_topic(uuid, date) from public, anon;
grant execute on function public.prep_room_topic(uuid, date) to authenticated;

-- One row per exam the caller is preparing for.
create or replace function public.prep_room_today()
returns table (template_id uuid, node_id uuid, title text, subject text, done boolean, done_count integer, people integer)
language plpgsql stable security definer set search_path = public as $$
declare today_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if auth.uid() is null then return; end if;
  return query
    select pl.template_id, r.node_id, r.title, r.subject,
           exists (select 1 from public.prep_room_checkins c where c.template_id = pl.template_id and c.day = today_ist and c.user_id = auth.uid()),
           (select count(*)::int from public.prep_room_checkins c where c.template_id = pl.template_id and c.day = today_ist),
           (select count(*)::int from public.prep_plans o where o.template_id = pl.template_id and o.active)
      from public.prep_plans pl
      cross join lateral public.prep_room_topic(pl.template_id, today_ist) r
     where pl.user_id = auth.uid() and pl.active;
end;
$$;
revoke execute on function public.prep_room_today() from public, anon;
grant execute on function public.prep_room_today() to authenticated;

-- Mark today's topic done (or undo). Only for an exam the caller is preparing for.
create or replace function public.prep_room_checkin(target_template uuid, undo boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare today_ist date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if auth.uid() is null or not exists (select 1 from public.prep_plans where user_id = auth.uid() and template_id = target_template and active) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if undo then
    delete from public.prep_room_checkins where template_id = target_template and day = today_ist and user_id = auth.uid();
  else
    insert into public.prep_room_checkins (template_id, day, user_id) values (target_template, today_ist, auth.uid()) on conflict do nothing;
  end if;
  return true;
end;
$$;
revoke execute on function public.prep_room_checkin(uuid, boolean) from public, anon;
grant execute on function public.prep_room_checkin(uuid, boolean) to authenticated;

-- 2. Feedback on the admin page ---------------------------------------------------------------------
create or replace function public.admin_feedback(max_rows integer default 50)
returns table (message text, page text, created_at timestamptz, name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select f.message, f.page, f.created_at, coalesce(nullif(trim(p.full_name), ''), p.username, 'Someone')
      from public.feedback f left join public.profiles p on p.id = f.user_id
     order by f.created_at desc limit least(greatest(max_rows, 1), 200);
end;
$$;
revoke execute on function public.admin_feedback(integer) from public, anon;
grant execute on function public.admin_feedback(integer) to authenticated;

notify pgrst, 'reload schema';
