-- Communities: one for each exam and one for each kind of goal (fitness, reading, health...).
-- You belong to a community when you have a goal or an exam plan in it, or when you join it.
-- Each community has one challenge a week. Progress counts by itself from what you already log:
-- topics studied or revised for an exam, and days checked in for a goal. Safe to rerun.
--
-- Community keys: 'exam:<template code>' (e.g. 'exam:upsc_cse_v1') or a goal category
-- ('fitness', 'reading', 'health', 'learning', 'habits', 'work', 'cooking', 'travel').

create table if not exists public.community_members (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  community text not null check (community ~ '^(exam:[a-z0-9_]{2,40}|fitness|reading|health|learning|habits|work|cooking|travel)$'),
  state text not null default 'joined' check (state in ('joined', 'hidden')),
  created_at timestamptz not null default now(),
  primary key (user_id, community)
);
alter table public.community_members enable row level security;
drop policy if exists "People manage their own communities" on public.community_members;
create policy "People manage their own communities" on public.community_members for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.community_challenge_joins (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  community text not null check (community ~ '^(exam:[a-z0-9_]{2,40}|fitness|reading|health|learning|habits|work|cooking|travel)$'),
  week_start date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, community, week_start)
);
alter table public.community_challenge_joins enable row level security;
drop policy if exists "People manage their own challenge entries" on public.community_challenge_joins;
create policy "People manage their own challenge entries" on public.community_challenge_joins for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Weeks run Monday to Sunday.
create or replace function public.community_week_start(day date)
returns date language sql immutable as $$ select day - (extract(isodow from day)::int - 1); $$;

-- This week's target: topics for an exam, days for everything else.
create or replace function public.community_target(key text)
returns integer language sql immutable as $$
  select case when key like 'exam:%' then 10 when key = 'fitness' then 4 when key in ('reading', 'health', 'learning', 'habits') then 5 else 3 end;
$$;

-- One person's progress in one community for the week that starts on week_start.
create or replace function public.community_progress(target_user uuid, key text, week_start date)
returns integer language sql stable security definer set search_path = public as $$
  select case when key like 'exam:%' then (
      select count(distinct e.node_id)::int
        from public.prep_events e
        join public.prep_syllabus_nodes n on n.id = e.node_id
        join public.prep_exam_templates t on t.id = n.template_id
       where e.user_id = target_user and t.code = substring(key from 6)
         and e.kind in ('studied', 'revised') and e.occurred_on between week_start and week_start + 6)
    else (
      select count(distinct (p.created_at at time zone 'Asia/Kolkata')::date)::int
        from public.posts p
        join public.goals g on g.id = p.goal_id
       where p.user_id = target_user and g.category = key
         and (p.created_at at time zone 'Asia/Kolkata')::date between week_start and week_start + 6)
    end;
$$;
revoke execute on function public.community_progress(uuid, text, date) from public, anon, authenticated;

-- Everything the Communities page needs, in one call. Other people appear only as counts.
create or replace function public.community_overview()
returns table (key text, member boolean, joined boolean, members integer, active_today integer,
               target integer, my_progress integer, in_challenge boolean, challenge_joined integer, challenge_finished integer, topic text)
language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today date := public.user_today(auth.uid());
  week date := public.community_week_start(public.user_today(auth.uid()));
begin
  if me is null then return; end if;
  return query
  with keys as (
    select unnest(array['fitness', 'reading', 'health', 'learning', 'habits', 'work', 'cooking', 'travel']) as k
    union
    select 'exam:' || t.code from public.prep_plans pl join public.prep_exam_templates t on t.id = pl.template_id where pl.user_id = me and pl.active
    union
    select cm.community from public.community_members cm where cm.user_id = me and cm.community like 'exam:%' and cm.state = 'joined'
  ),
  natural_members as (
    -- People whose goals or plans put them in a community.
    select g.category as k, g.user_id from public.goals g where g.status in ('active', 'paused') and g.category is not null
    union
    select 'exam:' || t.code, pl.user_id from public.prep_plans pl join public.prep_exam_templates t on t.id = pl.template_id where pl.active
  ),
  all_members as (
    select nm.k, nm.user_id from natural_members nm
     where not exists (select 1 from public.community_members h where h.user_id = nm.user_id and h.community = nm.k and h.state = 'hidden')
    union
    select cm.community, cm.user_id from public.community_members cm where cm.state = 'joined'
  )
  select keys.k,
         exists (select 1 from all_members a where a.k = keys.k and a.user_id = me),
         exists (select 1 from public.community_members cm where cm.user_id = me and cm.community = keys.k and cm.state = 'joined'),
         (select count(distinct a.user_id)::int from all_members a where a.k = keys.k),
         case when keys.k like 'exam:%' then (
             select count(distinct e.user_id)::int from public.prep_events e
               join public.prep_syllabus_nodes n on n.id = e.node_id
               join public.prep_exam_templates t on t.id = n.template_id
              where t.code = substring(keys.k from 6) and e.occurred_on = today)
           else (
             select count(distinct p.user_id)::int from public.posts p join public.goals g on g.id = p.goal_id
              where g.category = keys.k and (p.created_at at time zone 'Asia/Kolkata')::date = today)
         end,
         public.community_target(keys.k),
         public.community_progress(me, keys.k, week),
         exists (select 1 from public.community_challenge_joins j where j.user_id = me and j.community = keys.k and j.week_start = week),
         (select count(*)::int from public.community_challenge_joins j where j.community = keys.k and j.week_start = week),
         (select count(*)::int from public.community_challenge_joins j where j.community = keys.k and j.week_start = week
             and public.community_progress(j.user_id, keys.k, week) >= public.community_target(keys.k)),
         case when keys.k like 'exam:%' then (
             select r.title from public.prep_exam_templates t cross join lateral public.prep_room_topic(t.id, today) r
              where t.code = substring(keys.k from 6) limit 1)
         end
    from keys;
end;
$$;
revoke execute on function public.community_overview() from public, anon;
grant execute on function public.community_overview() to authenticated;

-- Join or leave this week's challenge. The server decides which week it is, so it matches the counts.
create or replace function public.community_challenge_set(target_community text, take_part boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare week date := public.community_week_start(public.user_today(auth.uid()));
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if take_part then
    insert into public.community_challenge_joins (user_id, community, week_start) values (auth.uid(), target_community, week) on conflict do nothing;
  else
    delete from public.community_challenge_joins where user_id = auth.uid() and community = target_community and week_start = week;
  end if;
  return take_part;
end;
$$;
revoke execute on function public.community_challenge_set(text, boolean) from public, anon;
grant execute on function public.community_challenge_set(text, boolean) to authenticated;
