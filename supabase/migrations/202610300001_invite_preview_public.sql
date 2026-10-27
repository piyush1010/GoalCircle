-- Let the invite page show "Piyush invited you to Upsc1" before a new student signs in.
-- Only someone holding the (unguessable) invite code sees this: batch name, exam, mentor's
-- name and member count. Joining still requires signing in.
create or replace function public.circle_invite_preview(code text)
returns table (circle_id uuid, name text, exam text, owner_name text, member_count integer, already_member boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.name, c.exam,
         coalesce(p.full_name, p.username, 'Your mentor'),
         (select count(*)::int from public.circle_memberships m where m.circle_id = c.id),
         case when auth.uid() is null then false else public.is_circle_member(c.id) end
  from public.circles c
  left join public.profiles p on p.id = c.owner_id
  where c.invite_code = lower(trim(code))
    and length(trim(code)) >= 8;
$$;
grant execute on function public.circle_invite_preview(text) to anon, authenticated;
