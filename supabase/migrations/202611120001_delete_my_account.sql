-- Account deletion from inside the app (required by Google Play for apps with sign-up).
-- Deleting the auth user removes everything that belongs to it: every table that points at the
-- user or their profile cascades or clears the link (checked in supabase/tests/delete_account.sql).
-- Uploaded photos are removed by the app first, through Storage, before this runs.
-- Safe to run more than once.

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  -- An administrator could otherwise lock everyone out of the admin page by accident.
  if exists (select 1 from public.app_admins where user_id = me) then
    raise exception 'Administrators must hand over the admin role before deleting their account' using errcode = '42501';
  end if;
  delete from auth.users where id = me;
  return true;
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

notify pgrst, 'reload schema';
