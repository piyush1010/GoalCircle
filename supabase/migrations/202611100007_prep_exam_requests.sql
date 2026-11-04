-- Preparation tracker: students ask GoalYaar to add a planner for an exam that is not listed yet.
-- Safe to run more than once.
create table if not exists public.prep_exam_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exam_name text not null check (length(trim(exam_name)) between 2 and 120),
  details text check (details is null or length(details) <= 500),
  status text not null default 'new' check (status in ('new', 'planned', 'added', 'declined')),
  created_at timestamptz not null default now()
);
alter table public.prep_exam_requests enable row level security;
drop policy if exists "Students send exam requests" on public.prep_exam_requests;
create policy "Students send exam requests" on public.prep_exam_requests for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "Students see their own requests" on public.prep_exam_requests;
create policy "Students see their own requests" on public.prep_exam_requests for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.prep_exam_requests from anon;
grant select, insert on public.prep_exam_requests to authenticated;

-- For the admin page: every request, most asked-for exams first.
create or replace function public.admin_exam_requests()
returns table (exam_name text, requests bigint, latest timestamptz, details text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
    select min(r.exam_name), count(*), max(r.created_at), (array_agg(r.details order by r.created_at desc) filter (where r.details is not null))[1:5]
    from public.prep_exam_requests r
    group by lower(trim(r.exam_name))
    order by count(*) desc, max(r.created_at) desc;
end;
$$;
revoke execute on function public.admin_exam_requests() from public, anon;
grant execute on function public.admin_exam_requests() to authenticated;
