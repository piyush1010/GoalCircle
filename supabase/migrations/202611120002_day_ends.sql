-- "My day ends at": night owls can count study after midnight towards the day before.
-- day_ends_hour 0 = midnight (default), up to 4 = 4 AM. The app shifts its own dates; the shared
-- topic of the day uses the same rule so a 1 AM check-in lands on the right day.
-- Safe to run more than once.

alter table public.user_preferences add column if not exists day_ends_hour smallint not null default 0;
alter table public.user_preferences drop constraint if exists user_preferences_day_ends_hour_check;
alter table public.user_preferences add constraint user_preferences_day_ends_hour_check check (day_ends_hour between 0 and 4);

-- Today's date for a person, in India time, honouring their day-end hour.
create or replace function public.user_today(target_user uuid)
returns date language sql stable security definer set search_path = public as $$
  select ((now() at time zone 'Asia/Kolkata') - make_interval(hours => coalesce(
    (select p.day_ends_hour from public.user_preferences p where p.user_id = target_user), 0)))::date;
$$;
revoke execute on function public.user_today(uuid) from public, anon;
grant execute on function public.user_today(uuid) to authenticated;

create or replace function public.prep_room_today()
returns table (template_id uuid, node_id uuid, title text, subject text, done boolean, done_count integer, people integer)
language plpgsql stable security definer set search_path = public as $$
declare today_ist date := public.user_today(auth.uid());
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

create or replace function public.prep_room_checkin(target_template uuid, undo boolean default false)
returns boolean language plpgsql security definer set search_path = public as $$
declare today_ist date := public.user_today(auth.uid());
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

notify pgrst, 'reload schema';
