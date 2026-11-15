-- Mentors ask to see a student's full plan; the student chooses Allow or Not now.
-- Builds on prep_mentor_shares (the student's own sharing level per batch). Safe to rerun.

alter table public.prep_mentor_shares add column if not exists requested_at timestamptz;
alter table public.prep_mentor_shares add column if not exists requested_by uuid references auth.users(id) on delete set null;
alter table public.prep_mentor_shares add column if not exists answered_at timestamptz;

-- The batch owner or a moderator asks one student. A student who said "Not now" is not asked again for 7 days.
create or replace function public.prep_request_share(target_circle uuid, target_student uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  row public.prep_mentor_shares;
  mentor_name text;
begin
  if not exists (select 1 from public.circle_memberships where circle_id = target_circle and user_id = me and role in ('owner', 'moderator')) then
    raise exception 'Only the batch mentor can ask' using errcode = '42501';
  end if;
  if not exists (select 1 from public.circle_memberships where circle_id = target_circle and user_id = target_student and role = 'member') then
    raise exception 'That student is not in this batch' using errcode = '42501';
  end if;
  select * into row from public.prep_mentor_shares where student_id = target_student and circle_id = target_circle;
  if found and row.scope = 'full' then return 'shared'; end if;
  if found and row.requested_at is not null and row.answered_at is null then return 'pending'; end if;
  if found and row.answered_at is not null and row.answered_at > now() - interval '7 days' then return 'declined'; end if;

  insert into public.prep_mentor_shares (student_id, circle_id, scope, requested_at, requested_by, answered_at)
  values (target_student, target_circle, 'nothing', now(), me, null)
  on conflict (student_id, circle_id) do update set requested_at = now(), requested_by = me, answered_at = null;

  select coalesce(nullif(full_name, ''), username, 'Your mentor') into mentor_name from public.profiles where id = me;
  insert into public.notifications (recipient_id, actor_id, kind, circle_id, message)
  values (target_student, me, 'circle_reply', target_circle, left(mentor_name || ' asked to see your full plan. Open the Batch tab in your exam to allow or decline.', 200));
  return 'asked';
end;
$$;
revoke execute on function public.prep_request_share(uuid, uuid) from public, anon;
grant execute on function public.prep_request_share(uuid, uuid) to authenticated;

-- The student answers. Allow shares the full plan with that batch; Not now keeps the current level.
create or replace function public.prep_answer_share(target_circle uuid, allow boolean)
returns boolean language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  update public.prep_mentor_shares
     set scope = case when allow then 'full' else scope end, answered_at = now()
   where student_id = me and circle_id = target_circle and requested_at is not null;
  return found;
end;
$$;
revoke execute on function public.prep_answer_share(uuid, boolean) from public, anon;
grant execute on function public.prep_answer_share(uuid, boolean) to authenticated;

-- The mentor sees where each request stands, so the button can say "Asked" or "Shared".
create or replace function public.prep_share_status(target_circle uuid)
returns table (student_id uuid, scope text, requested_at timestamptz, answered_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.circle_memberships where circle_id = target_circle and user_id = auth.uid() and role in ('owner', 'moderator')) then
    raise exception 'Only the batch mentor can see this' using errcode = '42501';
  end if;
  return query select s.student_id, s.scope, s.requested_at, s.answered_at from public.prep_mentor_shares s where s.circle_id = target_circle;
end;
$$;
revoke execute on function public.prep_share_status(uuid) from public, anon;
grant execute on function public.prep_share_status(uuid) to authenticated;
